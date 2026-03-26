import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, quoteEvents, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';

// ============================================================
// WhatsApp Cloud API Webhook
// GET:  Meta challenge verification
// POST: Process incoming messages → log to quote_events
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
// ============================================================

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';

// GET /api/webhooks/whatsapp — Meta webhook challenge verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST /api/webhooks/whatsapp — Incoming message handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Acknowledge immediately (Meta requires < 200ms response)
    // Process asynchronously below
    processWebhook(body).catch(err =>
      console.error('WhatsApp webhook processing error:', err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook parse error:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

async function processWebhook(body: Record<string, unknown>) {
  // Meta sends updates in this shape:
  // { object: 'whatsapp_business_account', entry: [...] }
  if (body.object !== 'whatsapp_business_account') return;

  const entries = (body.entry as Record<string, unknown>[] | undefined) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as Record<string, unknown>[] | undefined) ?? [];

    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const messages = (value.messages as Record<string, unknown>[] | undefined) ?? [];

      for (const message of messages) {
        await handleIncomingMessage(message);
      }
    }
  }
}

async function handleIncomingMessage(message: Record<string, unknown>) {
  const from = message.from as string | undefined;
  const msgType = message.type as string | undefined;
  const timestamp = message.timestamp as string | undefined;

  let text = '';
  if (msgType === 'text') {
    text = ((message.text as Record<string, unknown>)?.body as string) ?? '';
  }

  console.log(`WhatsApp message from ${from}: [${msgType}] ${text}`);

  // Attempt to find a quote associated with this phone number
  // This is a best-effort match — phone normalization may vary.
  const cleanPhone = from?.replace(/\D/g, '').replace(/^52/, '') ?? '';

  // Look for the most recent quote from this phone number across all tenants
  // In production you'd scope this to a specific tenant via the WABA ID
  try {
    const [recentQuote] = await db
      .select({ id: quotes.id, tenantId: quotes.tenantId })
      .from(quotes)
      .where(eq(quotes.clientPhone, cleanPhone))
      .limit(1);

    if (recentQuote) {
      await db.insert(quoteEvents).values({
        quoteId: recentQuote.id,
        tenantId: recentQuote.tenantId,
        eventType: 'whatsapp_reply',
        metadata: {
          from,
          messageType: msgType,
          text: text.slice(0, 500),
          timestamp,
        },
      });
    }
  } catch (err) {
    console.error('WhatsApp event logging error:', err);
  }
}
