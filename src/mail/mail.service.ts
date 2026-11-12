import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderEmailData,
  generateOrderConfirmationEmailHtml,
} from './templates/order-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
    const resendApiKey =
      this.configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey.trim() === '') {
      this.logger.warn(
        `[Resend] RESEND_API_KEY no está configurada en .env. El correo para ${data.customerEmail} no fue enviado.`,
      );
      return false;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM') ||
      process.env.RESEND_FROM ||
      'Tienda Online <onboarding@resend.dev>';

    const htmlContent = generateOrderConfirmationEmailHtml(data);

    try {
      this.logger.log(`[Resend] Enviando confirmación de pedido a ${data.customerEmail}...`);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [data.customerEmail],
          subject: `✓ Pedido Confirmado #${data.orderNumber} - ${data.companyName || 'Tienda Online'}`,
          html: htmlContent,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `[Resend] Error al enviar correo: ${resData.message || JSON.stringify(resData)}`,
        );
        return false;
      }

      this.logger.log(`[Resend] ¡Correo enviado con éxito! ID: ${resData.id}`);
      return true;
    } catch (error: any) {
      this.logger.error(`[Resend] Excepción al conectar con Resend: ${error.message}`);
      return false;
    }
  }
}

