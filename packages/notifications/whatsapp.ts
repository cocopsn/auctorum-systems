import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// WhatsApp Cloud API integration
// Sends quote PDF link via WhatsApp to client AND provider
// Uses Meta's official API — no third-party wrappers
// ============================================================

// Phone number id is resolved at call-time, NOT at module-load time.
// Pre-2026-05-10 the URL was computed once with the global env var, so a
// tenant with its own dedicated WABA still got messages sent FROM the
// shared Auctorum number — patient saw an unfamiliar sender. Now we
// rebuild the URL per call from the param-or-env phone number id.
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

interface SendWhatsAppParams {
  to: string;
  tenantName: string;
  quoteNumber: number;
  total: number;
  pdfUrl: string;
  config: TenantConfig;
  isProviderNotification?: boolean;
  clientName?: string;
  clientCompany?: string;
}

function cleanPhoneNumber(phone: string): string {
  // Pre-2026-05-10 this was Saltillo-anchored: only 844 and 81 area
  // codes got prefixed with 52, then a generic catch-all also added 52.
  // Numbers from CDMX (55), GDL (33), Cancún (998) etc. were either
  // missed or accidentally double-prefixed.
  //
  // New rule: strip non-digits; if it starts with 521/52, normalize to
  // 52 + 10 digits; if it's 10 digits (canonical mobile), prepend 52;
  // otherwise return as-is and let the API reject if invalid.
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('521') && digits.length >= 13) return '52' + digits.slice(3, 13)
  if (digits.startsWith('52') && digits.length >= 12) return digits.slice(0, 12)
  if (digits.length === 10) return '52' + digits
  return digits
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export async function sendWhatsAppQuote(params: SendWhatsAppParams): Promise<boolean> {
  const phone = cleanPhoneNumber(params.to);
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn('[whatsapp] credentials missing — skipping quote send');
    return false;
  }
  const apiUrl = `${GRAPH_BASE}/${phoneNumberId}/messages`;

  // Build message text based on recipient type
  let messageText: string;

  if (params.isProviderNotification) {
    // Message to the PROVIDER (tenant owner)
    messageText = [
      `*Nueva cotización generada*`,
      ``,
      `Cotización #${String(params.quoteNumber).padStart(4, '0')}`,
      `Cliente: ${params.clientName}`,
      `Empresa: ${params.clientCompany}`,
      `Total: ${formatMXN(params.total)}`,
      ``,
      `Ver PDF: ${params.pdfUrl}`,
      ``,
      `_Cotización generada desde su portal ${params.tenantName}_`,
    ].join('\n');
  } else {
    // Message to the CLIENT who requested the quote
    messageText = [
      `*${params.tenantName}*`,
      ``,
      `Su cotización #${String(params.quoteNumber).padStart(4, '0')} está lista.`,
      ``,
      `Total: ${formatMXN(params.total)}`,
      ``,
      `Descargue su cotización: ${params.pdfUrl}`,
      ``,
      `Vigencia: ${params.config.quote_settings!.validity_days} días`,
      `Para consultas: ${params.config.contact.phone}`,
    ].join('\n');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: messageText },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return false;
  }
}

/**
 * Send a free-form WhatsApp text message. Used by cron reminders,
 * follow-ups, lead-autocontact, etc.
 *
 * Optional `phoneNumberId` — when omitted falls back to the global
 * `WHATSAPP_PHONE_NUMBER_ID` env. Pass the per-tenant phone id (resolved
 * from `bot_instances.config.phone_number_id`) when the tenant runs on
 * its own Meta WABA so the patient sees the right sender.
 */
export async function sendWhatsAppMessage(params: {
  to: string;
  message: string;
  phoneNumberId?: string;
}): Promise<boolean> {
  const phone = cleanPhoneNumber(params.to);

  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = params.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.warn('WhatsApp credentials not configured, skipping message send');
      return false;
    }

    const apiUrl = `${GRAPH_BASE}/${phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: params.message },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return false;
  }
}

// Webhook verification for Meta
export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}
