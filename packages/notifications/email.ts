import { Resend } from 'resend';
import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// Email notification via Resend
// Sends quote PDF as attachment to the client
// ============================================================

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 'dummy');
  }
  return _resend;
}
const EMAIL_FROM = process.env.EMAIL_FROM || 'cotizaciones@auctorum.com.mx';

interface SendEmailParams {
  to: string;
  tenantName: string;
  quoteNumber: number;
  total: number;
  pdfBuffer: Buffer;
  config: TenantConfig;
  /** Optional tracking pixel URL. When present, a 1x1 transparent
   *  GIF img tag is appended to the HTML so opens get recorded
   *  even when the client never visits /q/[token]. */
  pixelUrl?: string | null;
}

interface NewQuoteAlertParams {
  to: string;
  tenantName: string;
  quoteFolio: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  clientEmail?: string | null;
  total: number;
  dashboardUrl: string;
  config: TenantConfig;
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export async function sendEmailQuote(params: SendEmailParams): Promise<boolean> {
  try {
    const quoteNum = String(params.quoteNumber).padStart(4, '0');

    const { data, error } = await getResend().emails.send({
      from: `${params.tenantName} <${EMAIL_FROM}>`,
      to: params.to,
      subject: `Cotización #${quoteNum} — ${params.tenantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${params.config.colors.primary}; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">${params.tenantName}</h1>
          </div>
          <div style="padding: 32px 24px;">
            <h2 style="color: ${params.config.colors.primary}; margin-top: 0;">
              Cotización #${quoteNum}
            </h2>
            <p style="color: #666; line-height: 1.6;">
              Adjunto encontrará su cotización por un total de
              <strong style="color: ${params.config.colors.primary};">${formatMXN(params.total)}</strong>.
            </p>
            <p style="color: #666; line-height: 1.6;">
              Esta cotización tiene una vigencia de ${params.config.quote_settings!.validity_days} días.
            </p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #999;">Condiciones:</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #333;">
                Forma de pago: ${params.config.quote_settings!.payment_terms}
              </p>
              <p style="margin: 0; font-size: 14px; color: #333;">
                Entrega: ${params.config.quote_settings!.delivery_terms}
              </p>
            </div>
            <p style="color: #666; font-size: 14px;">
              Para cualquier consulta, contáctenos:<br/>
              Tel: ${params.config.contact.phone}<br/>
              Email: ${params.config.contact.email}
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #999;">
            ${params.config.business.razon_social} · ${params.config.contact.address}
          </div>
          ${params.pixelUrl ? `<img src="${params.pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />` : ''}
        </div>
      `,
      attachments: [
        {
          filename: `cotizacion-${quoteNum}-${params.tenantName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

// ============================================================
// sendNewQuoteAlert — notifies the tenant owner when a client
// submits a new quote through the public portal. Brief HTML with
// client info + total + CTA back to /dashboard/quotes. No PDF
// attachment: the owner opens it from the dashboard.
// ============================================================
export async function sendNewQuoteAlert(params: NewQuoteAlertParams): Promise<boolean> {
  try {
    const { data, error } = await getResend().emails.send({
      from: `${params.tenantName} <${EMAIL_FROM}>`,
      to: params.to,
      subject: `Nueva cotización recibida — ${params.clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${params.config.colors.primary}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 18px;">${params.tenantName}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <h2 style="color: ${params.config.colors.primary}; margin-top: 0; font-size: 18px;">
              Nueva cotización ${params.quoteFolio}
            </h2>
            <p style="color: #444; line-height: 1.6;">
              Ha recibido una nueva cotización a través de su portal.
            </p>
            <div style="background: #f8f9fa; border-left: 3px solid ${params.config.colors.primary}; padding: 16px 20px; margin: 20px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #111;"><strong>${params.clientName}</strong></p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #555;">${params.clientCompany}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #555;">Tel: ${params.clientPhone}</p>
              ${params.clientEmail ? `<p style="margin: 0; font-size: 14px; color: #555;">${params.clientEmail}</p>` : ''}
            </div>
            <p style="color: #444; font-size: 15px;">
              Total: <strong style="color: ${params.config.colors.primary}; font-size: 17px;">${formatMXN(params.total)}</strong>
            </p>
            <div style="margin: 28px 0 8px 0;">
              <a href="${params.dashboardUrl}"
                 style="display: inline-block; background: ${params.config.colors.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                Ver en el dashboard
              </a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 14px; text-align: center; font-size: 11px; color: #999;">
            Notificación automática · ${params.tenantName}
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('New quote alert email error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('New quote alert email failed:', err);
    return false;
  }
}
