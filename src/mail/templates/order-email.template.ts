export interface OrderItemEmail {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  city?: string;
  reference?: string;
  invoiceType?: string;
  companyRuc?: string;
  companyLegalName?: string;
  items: OrderItemEmail[];
  subtotal: number;
  shippingCost: number;
  total: number;
  currencySymbol?: string;
  companyName?: string;
  dateStr?: string;
}

export function generateOrderConfirmationEmailHtml(data: OrderEmailData): string {
  const symbol = data.currencySymbol || 'S/';
  const companyName = data.companyName || 'Tienda Online';
  const dateStr =
    data.dateStr ||
    new Date().toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const itemsHtml = (data.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            ${
              item.imageUrl
                ? `<td style="width: 52px; vertical-align: middle; padding-right: 12px;">
                     <img src="${item.imageUrl}" alt="${item.title}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff;" />
                   </td>`
                : ''
            }
            <td style="vertical-align: middle;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4;">${item.title}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Cantidad: ${item.quantity}</p>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap;">
              ${symbol} ${(item.price * item.quantity).toFixed(2)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido #${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 36px 32px; text-align: center;">
              <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
                ✓ Pedido Confirmado
              </span>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                ¡Gracias por tu compra, ${data.customerName}!
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
                Hemos procesado tu pago con éxito. Tu pedido ya está en preparación.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td style="padding: 4px 8px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">N° de Pedido</p>
                    <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">${data.orderNumber}</p>
                  </td>
                  <td style="padding: 4px 8px; text-align: right;">
                    <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Fecha y Hora</p>
                    <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 600; color: #334155;">${dateStr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Products Table -->
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Detalle del Pedido
              </h2>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Total Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-top: 2px solid #e2e8f0; padding-top: 12px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Subtotal:</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #334155; text-align: right;">
                    ${symbol} ${data.subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Costo de Envío:</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #16a34a; text-align: right;">
                    ${data.shippingCost === 0 ? 'GRATIS' : `${symbol} ${data.shippingCost.toFixed(2)}`}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px dashed #cbd5e1;">
                    Total Pagado:
                  </td>
                  <td style="padding: 10px 0 0 0; font-size: 18px; font-weight: 800; color: #2563eb; text-align: right; border-top: 1px dashed #cbd5e1;">
                    ${symbol} ${data.total.toFixed(2)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Details Section -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td style="vertical-align: top;">
                    <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
                      📍 Dirección de Entrega
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.4;">
                      ${data.address}<br>
                      ${data.city ? `<strong>Ciudad:</strong> ${data.city}<br>` : ''}
                      ${data.reference ? `<strong>Referencia:</strong> ${data.reference}<br>` : ''}
                      ${data.customerPhone ? `<strong>Teléfono:</strong> ${data.customerPhone}` : ''}
                    </p>
                  </td>
                  ${
                    data.invoiceType === 'factura'
                      ? `<td style="vertical-align: top; text-align: right;">
                           <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
                             📄 Comprobante: Factura
                           </h3>
                           <p style="margin: 0; font-size: 12px; color: #334155; line-height: 1.4;">
                             RUC: ${data.companyRuc || '-'}<br>
                             Razón: ${data.companyLegalName || '-'}
                           </p>
                         </td>`
                      : `<td style="vertical-align: top; text-align: right;">
                           <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
                             📄 Comprobante: Boleta
                           </h3>
                         </td>`
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                ${companyName} — Tu tienda online de confianza
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Este es un comprobante automático de tu compra. Si tienes alguna duda sobre tu pedido, contáctanos respondiendo a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

