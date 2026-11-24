import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderEmailData,
  generateOrderConfirmationEmailHtml,
} from './templates/order-email.template';
import {
  ClaimConfirmationEmailData,
  ClaimResponseEmailData,
  generateClaimConfirmationEmailHtml,
  generateClaimResponseEmailHtml,
} from './templates/claim-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  private async sendResendEmail(params: {
    to: string;
    subject: string;
    html: string;
    contextLabel: string;
  }): Promise<boolean> {
    const resendApiKey =
      this.configService.get<string>('RESEND_API_KEY') ||
      process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey.trim() === '') {
      this.logger.warn(
        `[Resend] RESEND_API_KEY no está configurada en .env. El correo (${params.contextLabel}) para ${params.to} no fue enviado.`,
      );
      return false;
    }

    const fromEmail =
      this.configService.get<string>('RESEND_FROM') ||
      process.env.RESEND_FROM ||
      'Tienda Online <onboarding@resend.dev>';

    try {
      this.logger.log(`[Resend] Enviando ${params.contextLabel} a ${params.to}...`);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `[Resend] Error al enviar correo (${params.contextLabel}): ${resData.message || JSON.stringify(resData)}`,
        );
        return false;
      }

      this.logger.log(
        `[Resend] ¡Correo (${params.contextLabel}) enviado con éxito! ID: ${resData.id}`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `[Resend] Excepción al conectar con Resend (${params.contextLabel}): ${error.message}`,
      );
      return false;
    }
  }

  async sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
    const htmlContent = generateOrderConfirmationEmailHtml(data);
    return this.sendResendEmail({
      to: data.customerEmail,
      subject: `✓ Pedido Confirmado #${data.orderNumber} - ${data.companyName || 'Tienda Online'}`,
      html: htmlContent,
      contextLabel: 'confirmación de pedido',
    });
  }

  async sendClaimConfirmation(
    data: ClaimConfirmationEmailData,
  ): Promise<boolean> {
    const htmlContent = generateClaimConfirmationEmailHtml(data);
    return this.sendResendEmail({
      to: data.email,
      subject: `Constancia Hoja de Reclamación ${data.code} - ${data.companyName || 'Tienda Online'}`,
      html: htmlContent,
      contextLabel: `constancia de reclamo ${data.code}`,
    });
  }

  async sendClaimResponse(data: ClaimResponseEmailData): Promise<boolean> {
    const htmlContent = generateClaimResponseEmailHtml(data);
    return this.sendResendEmail({
      to: data.email,
      subject: `Respuesta a Hoja de Reclamación ${data.code} - ${data.companyName || 'Tienda Online'}`,
      html: htmlContent,
      contextLabel: `respuesta de reclamo ${data.code}`,
    });
  }
}

