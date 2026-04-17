import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// WhatsApp Cloud API integration
// Sends quote PDF link via WhatsApp to client AND provider
// Uses Meta's official API — no third-party wrappers
// ============================================================

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const API_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

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
  // Remove all non-digits, ensure country code
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('844') || cleaned.startsWith('81')) {
    cleaned = '52' + cleaned; // Mexico country code
  }
  if (!cleaned.startsWith('52')) {
    cleaned = '52' + cleaned;
  }
  return cleaned;
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export async function sendWhatsAppQuote(params: SendWhatsAppParams): Promise<boolean> {
  const phone = cleanPhoneNumber(params.to);

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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
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

// Send a free-form WhatsApp text message (used by cron reminders, etc.)
export async function sendWhatsAppMessage(params: { to: string; message: string }): Promise<boolean> {
  const phone = cleanPhoneNumber(params.to);

  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.warn('WhatsApp credentials not configured, skipping message send');
      return false;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

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
