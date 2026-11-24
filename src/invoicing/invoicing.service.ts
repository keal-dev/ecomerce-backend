import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Company } from '../company/company.entity';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);
  private readonly apiUrl = 'https://api.facturalo.pe/api/v3/documentos/enviar';

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly configService: ConfigService,
  ) {}

  private getApiKey(): string {
    const env = (
      this.configService.get<string>('FACTURALO_ENV') ||
      process.env.FACTURALO_ENV ||
      'demo'
    ).toLowerCase();

    const isProduction = env === 'live' || env === 'production' || env === 'prod';

    const key = isProduction
      ? this.configService.get<string>('FACTURALO_API_KEY_LIVE') ||
        process.env.FACTURALO_API_KEY_LIVE ||
        this.configService.get<string>('FACTURALO_API_KEY')
      : this.configService.get<string>('FACTURALO_API_KEY_DEMO') ||
        process.env.FACTURALO_API_KEY_DEMO ||
        this.configService.get<string>('FACTURALO_API_KEY');

    return (key || 'sk_test_XQJuuVKU6mWIM6NqfxnTdi88BNnh5Weg00aoCepF').trim();
  }

  /**
   * Obtiene el siguiente correlativo numérico para una serie específica
   */
  async getNextCorrelativo(serie: string): Promise<string> {
    try {
      const lastOrder = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.invoiceSeries = :serie', { serie })
        .andWhere('order.invoiceNumber IS NOT NULL')
        .orderBy('CAST(REGEXP_REPLACE(order.invoiceNumber, \'[^0-9]\', \'\', \'g\') AS INTEGER)', 'DESC')
        .getOne();

      if (lastOrder && lastOrder.invoiceNumber) {
        const currentNum = parseInt(lastOrder.invoiceNumber.replace(/\D/g, ''), 10);
        if (!isNaN(currentNum) && currentNum > 0) {
          return (currentNum + 1).toString();
        }
      }
    } catch (e: any) {
      this.logger.warn(`[Facturalo] No se pudo calcular correlativo por DB: ${e.message}`);
    }

    // Por defecto en demo si es B001 iniciamos en 2 (ya que 1 se probó exitosamente), en F001 en 1
    return serie.startsWith('B') ? '2' : '1';
  }

  /**
   * Emite el comprobante electrónico (Boleta o Factura) para un pedido
   */
  async emitInvoiceForOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID ${orderId} no encontrado`);
    }

    // Si ya tiene un comprobante emitido y aceptado por SUNAT, no duplicar
    if (order.invoicePdfUrl && order.invoiceSunatStatus === 'ACEPTADA') {
      this.logger.log(
        `[Facturalo] El pedido #${order.orderNumber} ya cuenta con comprobante ${order.invoiceSeries}-${order.invoiceNumber}.`,
      );
      return order;
    }

    const isFactura = (order.invoiceType || '').toLowerCase() === 'factura';
    const tipoComprobante = isFactura ? '01' : '03'; // 01: Factura, 03: Boleta

    // Leer series configuradas por el administrador en la tabla company
    const [companyConfig] = await this.companyRepository.find({ take: 1 });
    const configuredFacturaSerie = companyConfig?.facturaSeries?.trim().toUpperCase();
    const configuredBoletaSerie = companyConfig?.boletaSeries?.trim().toUpperCase();

    const serie = isFactura
      ? configuredFacturaSerie || 'F001'
      : configuredBoletaSerie || 'B001';

    const correlativo = await this.getNextCorrelativo(serie);
    const fechaEmision = new Date(order.createdAt || Date.now())
      .toISOString()
      .split('T')[0];

    // Datos del cliente según tipo de comprobante
    const cliente: Record<string, any> = {};
    if (isFactura) {
      cliente.tipoDocumento = '6'; // RUC
      cliente.numeroDocumento = (order.companyRuc || order.docNumber || '').trim();
      cliente.denominacion = (order.companyLegalName || order.customerName || 'EMPRESA').trim();
      if (order.address) {
        cliente.direccion = `${order.address}, ${order.district || ''}, ${order.province || ''}`.trim();
      }
    } else {
      const isDni =
        (order.docType || '').toUpperCase() === 'DNI' ||
        (order.docNumber || '').trim().length === 8;
      cliente.tipoDocumento = isDni ? '1' : '0'; // 1: DNI, 0: Sin documento / otros
      cliente.numeroDocumento = (order.docNumber || '00000000').trim();
      cliente.denominacion = (order.customerName || 'CLIENTES VARIOS').trim();
    }

    // Detalle de ítems
    const items = (order.items || []).map((it) => ({
      unidadMedida: 'NIU',
      descripcion: it.productTitle,
      cantidad: Number(it.quantity) || 1,
      precioUnitario: Number(it.unitPrice) || 0,
      tipoIgv: '10', // Gravado - Operación Onerosa
    }));

    // Si tiene costo de envío, agregarlo como ítem de servicio
    if (order.shippingCost && Number(order.shippingCost) > 0) {
      items.push({
        unidadMedida: 'ZZ',
        descripcion: 'Servicio de Despacho y Envío a Domicilio',
        cantidad: 1,
        precioUnitario: Number(order.shippingCost),
        tipoIgv: '10',
      });
    }

    const payload = {
      documento: {
        sunatTransaccion: '0101', // Venta interna
        tipoComprobante,
        serie,
        correlativo,
        fechaEmision,
        formaPago: 'CONTADO',
        moneda: 'PEN',
        cliente,
        items,
      },
    };

    const apiKey = this.getApiKey();
    this.logger.log(
      `[Facturalo] Emitiendo ${isFactura ? 'Factura' : 'Boleta'} ${serie}-${correlativo} para el pedido #${order.orderNumber}...`,
    );

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorDetail =
          data.message ||
          (data.errors ? JSON.stringify(data.errors) : 'Error desconocido al emitir comprobante en Facturalo');
        this.logger.error(`[Facturalo] Error respuesta API (${response.status}): ${errorDetail}`);
        throw new BadRequestException(`Error en Facturalo.pe: ${errorDetail}`);
      }

      this.logger.log(
        `[Facturalo] ¡Comprobante ${serie}-${correlativo} emitido con éxito! Estado SUNAT: ${data.data?.estado || 'ACEPTADA'}`,
      );

      // Actualizar el pedido con los datos del comprobante electrónico
      const facturaloEnv = (data.data?.entorno || '').toLowerCase();
      order.invoiceSeries = serie;
      order.invoiceNumber = data.data?.documento?.correlativo || correlativo;
      order.invoicePdfUrl = data.data?.enlaces?.pdf || null;
      order.invoiceXmlUrl = data.data?.enlaces?.xml || null;
      order.invoiceCdrUrl = data.data?.enlaces?.cdr || null;
      order.invoiceSunatStatus = data.data?.estado || 'ACEPTADA';
      order.invoiceEnvironment =
        facturaloEnv === 'live' || facturaloEnv === 'production' || facturaloEnv === 'prod'
          ? 'production'
          : 'demo';

      return await this.orderRepository.save(order);
    } catch (err: any) {
      this.logger.error(`[Facturalo] Fallo en la comunicación con Facturalo.pe: ${err.message}`);
      throw err;
    }
  }
}
