import { NextRequest, NextResponse } from 'next/server';
import { db, quotes, quoteEvents, clients } from '@quote-engine/db';
import { eq, and, desc } from 'drizzle-orm';

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

  // Normalize the phone number — strip non-digits and remove Mexico country code
  // to match the format stored in the clients table.
  const cleanPhone = from?.replace(/\D/g, '').replace(/^52/, '') ?? '';

  if (!cleanPhone) {
    console.warn('WhatsApp webhook: no valid phone number extracted');
    return;
  }

  try {
    // 1. Look up the client by phone number in the clients table
    //    Try both with and without country code since storage format may vary
    const phoneCandidates = [cleanPhone, `52${cleanPhone}`];
    let matchedClient: { id: string; tenantId: string } | undefined;

    for (const phone of phoneCandidates) {
      const [found] = await db
        .select({ id: clients.id, tenantId: clients.tenantId })
        .from(clients)
        .where(eq(clients.phone, phone))
        .limit(1);
      if (found) {
        matchedClient = found;
        break;
      }
    }

    if (!matchedClient) {
      // Fallback: look for a quote directly by clientPhone (legacy path)
      const [recentQuote] = await db
        .select({ id: quotes.id, tenantId: quotes.tenantId })
        .from(quotes)
        .where(eq(quotes.clientPhone, cleanPhone))
        .orderBy(desc(quotes.createdAt))
        .limit(1);

      if (recentQuote) {
        await db.insert(quoteEvents).values({
          quoteId: recentQuote.id,
          tenantId: recentQuote.tenantId,
          eventType: 'client_replied',
          metadata: {
            from,
            messageType: msgType,
            text: text.slice(0, 500),
            timestamp,
            matchedVia: 'quote_phone_fallback',
          },
        });
        console.log(`WhatsApp reply logged (fallback) for quote ${recentQuote.id}`);
      } else {
        console.log(`WhatsApp message from unknown number: ${cleanPhone}`);
      }
      return;
    }

    // 2. Find the most recent quote for this client's tenant + phone
    const [recentQuote] = await db
      .select({ id: quotes.id, tenantId: quotes.tenantId })
      .from(quotes)
      .where(
        and(
          eq(quotes.tenantId, matchedClient.tenantId),
          eq(quotes.clientPhone, cleanPhone)
        )
      )
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (!recentQuote) {
      console.log(`Client found (${matchedClient.id}) but no quotes found`);
      return;
    }

    // 3. Record a client_replied event in quote_events
    await db.insert(quoteEvents).values({
      quoteId: recentQuote.id,
      tenantId: recentQuote.tenantId,
      eventType: 'client_replied',
      metadata: {
        from,
        clientId: matchedClient.id,
        messageType: msgType,
        text: text.slice(0, 500),
        timestamp,
        matchedVia: 'client_lookup',
      },
    });

    console.log(`WhatsApp client_replied event logged for quote ${recentQuote.id} (client ${matchedClient.id})`);
  } catch (err) {
    console.error('WhatsApp event logging error:', err);
  }
}
