export interface ClaimConfirmationEmailData {
  code: string;
  createdAt: Date | string;
  fullName: string;
  docType: string;
  docNumber: string;
  email: string;
  phone?: string | null;
  department: string;
  province: string;
  district: string;
  address: string;
  isMinor?: boolean;
  tutorName?: string | null;
  tutorDocType?: string | null;
  tutorDocNumber?: string | null;
  tutorPhone?: string | null;
  contractType: string;
  claimedAmount?: number | null;
  orderNumber?: string | null;
  contractDescription: string;
  claimType: string;
  claimDetail: string;
  claimRequest: string;
  companyName?: string;
  legalName?: string;
  taxId?: string;
  fiscalAddress?: string;
}

export interface ClaimResponseEmailData {
  code: string;
  fullName: string;
  email: string;
  claimType: string;
  status: string;
  adminResponse: string;
  respondedAt: Date | string;
  companyName?: string;
  legalName?: string;
  taxId?: string;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDatePe(dateInput: Date | string): string {
  return new Date(dateInput).toLocaleString('es-PE', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });
}

export function generateClaimConfirmationEmailHtml(
  data: ClaimConfirmationEmailData,
): string {
  const companyName = data.companyName || 'Tienda Online';
  const legalName = data.legalName || companyName;
  const taxId = data.taxId || 'RUC registrado';
  const fiscalAddress = data.fiscalAddress || 'Lima, Perú';
  const dateStr = formatDatePe(data.createdAt);
  const typeLabel =
    data.claimType.toLowerCase() === 'queja' ? 'QUEJA' : 'RECLAMO';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hoja de Reclamación ${escapeHtml(data.code)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:#0f172a;color:#ffffff;padding:24px 28px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;font-weight:700;">Libro de Reclamaciones Virtual • INDECOPI</p>
        <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:800;">Hoja de Reclamación N° ${escapeHtml(data.code)}</h1>
        <p style="margin:6px 0 0 0;font-size:12px;color:#cbd5e1;">Fecha de registro: ${escapeHtml(dateStr)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;font-size:13px;line-height:1.6;">
        <p style="margin:0 0 16px 0;">Estimado/a <strong>${escapeHtml(data.fullName)}</strong>, confirmamos el registro de tu ${escapeHtml(typeLabel.toLowerCase())} en nuestro Libro de Reclamaciones Virtual.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:12px;">
          <p style="margin:0 0 6px 0;font-weight:700;text-transform:uppercase;color:#334155;">Datos del Proveedor</p>
          <p style="margin:2px 0;"><strong>Razón Social:</strong> ${escapeHtml(legalName)}</p>
          <p style="margin:2px 0;"><strong>RUC:</strong> ${escapeHtml(taxId)} • <strong>Nombre Comercial:</strong> ${escapeHtml(companyName)}</p>
          <p style="margin:2px 0;"><strong>Domicilio Fiscal:</strong> ${escapeHtml(fiscalAddress)}</p>
        </div>

        <h3 style="margin:16px 0 8px 0;font-size:12px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">1. Identificación del Consumidor</h3>
        <p style="margin:3px 0;"><strong>Documento:</strong> ${escapeHtml(data.docType)} ${escapeHtml(data.docNumber)}</p>
        <p style="margin:3px 0;"><strong>Correo:</strong> ${escapeHtml(data.email)} • <strong>Teléfono:</strong> ${escapeHtml(data.phone || 'No especificado')}</p>
        <p style="margin:3px 0;"><strong>Domicilio:</strong> ${escapeHtml(data.address)}, ${escapeHtml(data.district)}, ${escapeHtml(data.province)}, ${escapeHtml(data.department)}</p>
        ${
          data.isMinor
            ? `<p style="margin:6px 0;padding:8px;background:#fffbeb;border-radius:6px;font-size:12px;"><strong>Tutor:</strong> ${escapeHtml(data.tutorName)} (${escapeHtml(data.tutorDocType)} ${escapeHtml(data.tutorDocNumber)})</p>`
            : ''
        }

        <h3 style="margin:16px 0 8px 0;font-size:12px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">2. Bien Contratado</h3>
        <p style="margin:3px 0;"><strong>Tipo:</strong> ${escapeHtml(data.contractType === 'servicio' ? 'Servicio' : 'Producto')} • <strong>Monto Reclamado:</strong> ${data.claimedAmount !== null && data.claimedAmount !== undefined ? `S/ ${Number(data.claimedAmount).toFixed(2)}` : 'No consignado'}</p>
        ${data.orderNumber ? `<p style="margin:3px 0;"><strong>N° Pedido / Comprobante:</strong> ${escapeHtml(data.orderNumber)}</p>` : ''}
        <p style="margin:3px 0;"><strong>Descripción:</strong> ${escapeHtml(data.contractDescription)}</p>

        <h3 style="margin:16px 0 8px 0;font-size:12px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">3. Detalle (${escapeHtml(typeLabel)})</h3>
        <p style="margin:3px 0;"><strong>Detalle:</strong> ${escapeHtml(data.claimDetail)}</p>
        <p style="margin:6px 0 0 0;"><strong>Pedido del Consumidor:</strong> ${escapeHtml(data.claimRequest)}</p>

        <div style="margin-top:20px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e3a8a;">
          <strong>Plazo de atención:</strong> Conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571), daremos respuesta a tu solicitud en un plazo máximo de <strong>15 días hábiles</strong> improrrogables.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateClaimResponseEmailHtml(
  data: ClaimResponseEmailData,
): string {
  const companyName = data.companyName || 'Tienda Online';
  const legalName = data.legalName || companyName;
  const taxId = data.taxId || 'RUC registrado';
  const dateStr = formatDatePe(data.respondedAt);
  const statusLabel =
    data.status === 'resolved'
      ? 'Resuelto / Atendido'
      : data.status === 'in_review'
      ? 'En Revisión'
      : 'Pendiente';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Respuesta a Hoja de Reclamación ${escapeHtml(data.code)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:#0f172a;color:#ffffff;padding:24px 28px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;font-weight:700;">Libro de Reclamaciones Virtual • Respuesta Oficial</p>
        <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:800;">Hoja de Reclamación N° ${escapeHtml(data.code)}</h1>
        <p style="margin:6px 0 0 0;font-size:12px;color:#cbd5e1;">Estado actual: <strong>${escapeHtml(statusLabel)}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;font-size:13px;line-height:1.6;">
        <p style="margin:0 0 14px 0;">Estimado/a <strong>${escapeHtml(data.fullName)}</strong>,</p>
        <p style="margin:0 0 14px 0;">Te comunicamos la actualización de tu ${escapeHtml(data.claimType.toLowerCase())} registrado en <strong>${escapeHtml(companyName)}</strong> (${escapeHtml(legalName)} - RUC ${escapeHtml(taxId)}):</p>

        <div style="background:#f8fafc;border-left:4px solid #3483fa;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:13px;white-space:pre-line;">
          ${escapeHtml(data.adminResponse)}
        </div>

        <p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">Fecha de respuesta: ${escapeHtml(dateStr)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
