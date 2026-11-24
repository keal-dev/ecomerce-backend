import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateChargeDto } from './dto/create-charge.dto';
import { MailService } from '../mail/mail.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicingService } from '../invoicing/invoicing.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly ordersService: OrdersService,
    private readonly invoicingService: InvoicingService,
  ) {}

  private async attemptCulqiRefund(
    secretKey: string,
    chargeId: string,
    amountCents: number,
  ): Promise<boolean> {
    try {
      const response = await fetch('https://api.culqi.com/v2/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey.trim()}`,
        },
        body: JSON.stringify({
          amount: amountCents,
          charge_id: chargeId,
          reason: 'solicitud_comprador',
        }),
      });

      if (!response.ok) {
        const refundErr = await response.json().catch(() => ({}));
        this.logger.error(
          `[CRITICAL][Culqi] Falló el reembolso automático para el cargo ${chargeId}: ${JSON.stringify(refundErr)}`,
        );
        return false;
      }

      this.logger.log(
        `[Culqi] Reembolso automático ejecutado con éxito para el cargo ${chargeId}.`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `[CRITICAL][Culqi] Excepción al intentar reembolsar cargo ${chargeId}: ${err.message}`,
      );
      return false;
    }
  }

  async processCulqiCharge(dto: CreateChargeDto) {
    // 1. Selector de entorno Culqi: 'production' vs 'test'
    const culqiEnv = (
      this.configService.get<string>('CULQI_ENV') ||
      process.env.CULQI_ENV ||
      'test'
    ).toLowerCase();

    const isProduction = culqiEnv === 'production' || culqiEnv === 'prod' || culqiEnv === 'live';

    const secretKey = isProduction
      ? this.configService.get<string>('CULQI_SECRET_KEY_LIVE') ||
        process.env.CULQI_SECRET_KEY_LIVE ||
        this.configService.get<string>('CULQI_SECRET_KEY') ||
        process.env.CULQI_SECRET_KEY
      : this.configService.get<string>('CULQI_SECRET_KEY_TEST') ||
        process.env.CULQI_SECRET_KEY_TEST ||
        this.configService.get<string>('CULQI_SECRET_KEY') ||
        process.env.CULQI_SECRET_KEY;

    if (!secretKey || secretKey.trim() === '') {
      throw new InternalServerErrorException(
        `La llave secreta de Culqi no está configurada para el entorno '${culqiEnv}' en .env`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El carrito no contiene productos válidos.');
    }

    // 2. Validar stock y recalcular montos reales desde PostgreSQL antes de cobrar
    const priced = await this.ordersService.validateAndPriceItems(dto.items, {
      applyOnlineShipping: true,
    });
    const serverAmountCents = Math.round(priced.total * 100);

    if (serverAmountCents <= 0) {
      throw new BadRequestException('El monto calculado del pedido debe ser mayor a 0.');
    }

    if (
      typeof dto.amount === 'number' &&
      Math.abs(Math.round(dto.amount) - serverAmountCents) > 1
    ) {
      this.logger.warn(
        `[Security][Culqi] Discrepancia de monto detectada para ${dto.email}: cliente envió ${dto.amount} céntimos, servidor calculó ${serverAmountCents} céntimos.`,
      );
    }

    this.logger.log(`[Culqi] Procesando cargo en modo '${culqiEnv.toUpperCase()}'...`);

    try {
      const antifraudDetails: Record<string, any> = {
        country_code: 'PE',
      };
      if (dto.firstName) antifraudDetails.first_name = dto.firstName;
      if (dto.lastName) antifraudDetails.last_name = dto.lastName;
      if (dto.address) antifraudDetails.address = dto.address;
      if (dto.city) antifraudDetails.address_city = dto.city;
      if (dto.phoneNumber) antifraudDetails.phone_number = dto.phoneNumber;

      const chargePayload: Record<string, any> = {
        amount: serverAmountCents,
        currency_code: dto.currencyCode || 'PEN',
        email: dto.email,
        source_id: dto.tokenId,
        description: dto.description || 'Compra en Tienda Online',
        antifraud_details: antifraudDetails,
      };

      const response = await fetch('https://api.culqi.com/v2/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey.trim()}`,
        },
        body: JSON.stringify(chargePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.user_message ||
          data.merchant_message ||
          data.message ||
          'Error al procesar el cargo en la pasarela Culqi';
        throw new BadRequestException(errorMsg);
      }

      // 3. Guardar el pedido en PostgreSQL (nunca tragar error si ya se cobró)
      const customerFullName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || 'Cliente';

      let savedOrder: any;
      try {
        savedOrder = await this.ordersService.createOrder({
          orderNumber: dto.orderNumber,
          customerName: customerFullName,
          customerEmail: dto.email,
          customerPhone: dto.phoneNumber || '',
          docType: dto.docType || 'DNI',
          docNumber: dto.docNumber || '',
          department: dto.department || '',
          province: dto.province || '',
          district: dto.district || '',
          address: dto.address || '',
          reference: dto.reference,
          subtotal: priced.subtotal,
          shippingCost: priced.shippingCost,
          total: priced.total,
          currencySymbol: dto.currencySymbol || 'S/',
          paymentMethod: 'Culqi (Tarjeta / Yape)',
          paymentStatus: 'paid',
          orderStatus: 'pending',
          culqiChargeId: data.id,
          culqiReferenceCode: data.reference_code,
          invoiceType: dto.invoiceType,
          companyRuc: dto.companyRuc,
          companyLegalName: dto.companyLegalName,
          items: priced.items,
        });
      } catch (err: any) {
        this.logger.error(
          `[CRITICAL][Payments] Cargo Culqi ${data.id} (ref: ${data.reference_code}) aprobado por S/ ${priced.total}, pero falló al guardar el pedido: ${err.message}`,
        );
        const refunded = await this.attemptCulqiRefund(
          secretKey,
          data.id,
          serverAmountCents,
        );
        const refLabel = data.reference_code || data.id;
        throw new InternalServerErrorException(
          refunded
            ? `No pudimos confirmar tu pedido por disponibilidad de stock. Tu pago ha sido reembolsado automáticamente (Ref: ${refLabel}).`
            : `Tu pago fue procesado (Ref: ${refLabel}), pero ocurrió un error al registrar el pedido. Por favor contáctanos indicando esta referencia para resolverlo de inmediato.`,
        );
      }

      const finalOrderNumber =
        savedOrder.orderNumber ||
        dto.orderNumber ||
        data.reference_code ||
        `ORD-${Date.now().toString().slice(-6)}`;

      // 4. Emitir Comprobante Electrónico (Boleta o Factura) en Facturalo.pe
      let invoiceResult: any = null;
      if (savedOrder?.id) {
        try {
          this.logger.log(`[Facturalo] Emitiendo comprobante para pedido ID ${savedOrder.id}...`);
          savedOrder = await this.invoicingService.emitInvoiceForOrder(savedOrder.id);
          invoiceResult = {
            series: savedOrder.invoiceSeries,
            number: savedOrder.invoiceNumber,
            pdfUrl: savedOrder.invoicePdfUrl,
            xmlUrl: savedOrder.invoiceXmlUrl,
            status: savedOrder.invoiceSunatStatus,
          };
        } catch (invoiceErr: any) {
          this.logger.error(
            `[Facturalo] Error no bloqueante al emitir comprobante: ${invoiceErr.message}`,
          );
        }
      }

      // 5. Enviar correo con Resend solo si estamos en modo TEST (en PRODUCCIÓN lo envía Culqi)
      if (!isProduction) {
        this.logger.log(
          `[Email] Modo TEST activo: enviando correo de confirmación con Resend a ${dto.email}...`,
        );

        this.mailService
          .sendOrderConfirmation({
            orderNumber: finalOrderNumber,
            customerName: customerFullName,
            customerEmail: dto.email,
            customerPhone: dto.phoneNumber,
            address: dto.address || 'Dirección de entrega registrada',
            city: dto.city,
            reference: dto.reference,
            invoiceType: dto.invoiceType,
            companyRuc: dto.companyRuc,
            companyLegalName: dto.companyLegalName,
            items: priced.items,
            subtotal: priced.subtotal,
            shippingCost: priced.shippingCost,
            total: priced.total,
            currencySymbol: dto.currencySymbol || 'S/',
            companyName: dto.companyName || 'Tienda Online',
          })
          .catch((err) => {
            this.logger.error(`[Resend] Error asíncrono al enviar correo: ${err.message}`);
          });
      } else {
        this.logger.log(
          `[Email] Modo PRODUCCIÓN activo: Culqi se encarga del envío automático del recibo oficial al comprador.`,
        );
      }

      return {
        success: true,
        chargeId: data.id,
        referenceCode: data.reference_code,
        orderNumber: finalOrderNumber,
        orderId: savedOrder?.id,
        environment: savedOrder?.environment || (isProduction ? 'production' : 'test'),
        outcome: data.outcome,
        amount: data.amount,
        currencyCode: data.currency_code,
        invoice: invoiceResult,
        message: 'Pago procesado y pedido guardado exitosamente',
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'No se pudo establecer conexión con Culqi para autorizar el pago',
      );
    }
  }
}

