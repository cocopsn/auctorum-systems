import { Resend } from 'resend';
import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// Email notification via Resend
// Sends quote PDF as attachment to the client
// ============================================================

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'cotizaciones@cotizarapido.mx';

interface SendEmailParams {
  to: string;
  tenantName: string;
  quoteNumber: number;
  total: number;
  pdfBuffer: Buffer;
  config: TenantConfig;
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export async function sendEmailQuote(params: SendEmailParams): Promise<boolean> {
  try {
    const quoteNum = String(params.quoteNumber).padStart(4, '0');

    const { data, error } = await resend.emails.send({
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
              Esta cotización tiene una vigencia de ${params.config.quote_settings.validity_days} días.
            </p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #999;">Condiciones:</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #333;">
                Forma de pago: ${params.config.quote_settings.payment_terms}
              </p>
              <p style="margin: 0; font-size: 14px; color: #333;">
                Entrega: ${params.config.quote_settings.delivery_terms}
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
