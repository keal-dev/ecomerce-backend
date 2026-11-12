import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateChargeDto } from './dto/create-charge.dto';
import { MailService } from '../mail/mail.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly ordersService: OrdersService,
  ) {}

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
        amount: Math.round(dto.amount),
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

      // 3. Guardar el pedido en la base de datos PostgreSQL
      const totalAmount = (dto.amount || 0) / 100;
      const customerFullName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || 'Cliente';

      let savedOrder: any = null;
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
          subtotal: dto.subtotal !== undefined ? dto.subtotal : totalAmount,
          shippingCost: dto.shippingCost !== undefined ? dto.shippingCost : 0,
          total: totalAmount,
          currencySymbol: dto.currencySymbol || 'S/',
          paymentMethod: 'Culqi (Tarjeta / Yape)',
          paymentStatus: 'paid',
          orderStatus: 'pending',
          culqiChargeId: data.id,
          culqiReferenceCode: data.reference_code,
          invoiceType: dto.invoiceType,
          companyRuc: dto.companyRuc,
          companyLegalName: dto.companyLegalName,
          items: (dto.items || []).map((it: any) => ({
            productId: it.productId || it.id,
            title: it.title,
            sku: it.sku,
            imageUrl: it.imageUrl,
            quantity: it.quantity,
            price: it.price,
          })),
        });
      } catch (err: any) {
        this.logger.error(`[Orders] Error al persistir el pedido en base de datos: ${err.message}`);
      }

      const finalOrderNumber =
        savedOrder?.orderNumber ||
        data.reference_code ||
        dto.orderNumber ||
        `ORD-${Date.now().toString().slice(-6)}`;

      // 4. Enviar correo con Resend solo si estamos en modo TEST (en PRODUCCIÓN lo envía Culqi)
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
            items: dto.items || [],
            subtotal: dto.subtotal !== undefined ? dto.subtotal : totalAmount,
            shippingCost: dto.shippingCost !== undefined ? dto.shippingCost : 0,
            total: totalAmount,
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
        message: 'Pago procesado y pedido guardado exitosamente',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'No se pudo establecer conexión con Culqi para autorizar el pago',
      );
    }
  }
}

