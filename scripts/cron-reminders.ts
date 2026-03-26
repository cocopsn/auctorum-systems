/**
 * Cron: Recordatorios automáticos (48hrs sin abrir)
 * Run: npx tsx scripts/cron-reminders.ts
 * Schedule: every 4 hours via PM2 or crontab
 *
 * Logic:
 * 1. Find quotes with status='sent' older than 48hrs that haven't been reminded (max 2 reminders)
 * 2. Send WhatsApp reminder to client
 * 3. Notify provider that reminder was sent
 * 4. Log quote_event 'reminder_sent'
 */

import { db, quotes, quoteEvents, tenants } from '@quote-engine/db';
import { eq, and, lte, sql } from 'drizzle-orm';

const REMINDER_THRESHOLD_HOURS = 48;
const MAX_REMINDERS = 2;

async function run() {
  console.log(`[cron-reminders] Starting at ${new Date().toISOString()}`);

  const cutoff = new Date(Date.now() - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Find quotes that are still 'sent' (never opened) and older than 48hrs
  const staleQuotes = await db
    .select({
      id: quotes.id,
      tenantId: quotes.tenantId,
      clientName: quotes.clientName,
      clientPhone: quotes.clientPhone,
      clientEmail: quotes.clientEmail,
      trackingToken: quotes.trackingToken,
      total: quotes.total,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.status, 'sent'),
        lte(quotes.sentAt, cutoff)
      )
    );

  console.log(`[cron-reminders] Found ${staleQuotes.length} stale quotes`);

  for (const quote of staleQuotes) {
    // Count existing reminders for this quote
    const [reminderCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quoteEvents)
      .where(
        and(
          eq(quoteEvents.quoteId, quote.id),
          eq(quoteEvents.eventType, 'reminder_sent')
        )
      );

    if (reminderCount.count >= MAX_REMINDERS) {
      console.log(`[cron-reminders] Quote ${quote.quoteNumber} already has ${MAX_REMINDERS} reminders, skipping`);
      continue;
    }

    // Get tenant config for WhatsApp settings
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, quote.tenantId))
      .limit(1);

    if (!tenant) continue;

    const config = tenant.config as any;
    const trackingUrl = `https://${tenant.slug}.auctorum.com.mx/q/${quote.trackingToken}`;

    // Send WhatsApp reminder to client
    if (quote.clientPhone && config.notifications?.whatsapp_on_new_quote) {
      try {
        const { sendWhatsApp } = await import('@quote-engine/notifications/whatsapp');
        await sendWhatsApp({
          to: quote.clientPhone,
          message: `Hola ${quote.clientName}, le recordamos que tiene una cotizacion pendiente de ${tenant.name} por $${quote.total} MXN.\n\nPuede revisarla aqui: ${trackingUrl}\n\nSi tiene dudas, contactenos al ${config.contact?.phone || ''}.`,
        });
        console.log(`[cron-reminders] WhatsApp reminder sent to ${quote.clientPhone}`);
      } catch (err) {
        console.error(`[cron-reminders] WhatsApp failed for quote ${quote.id}:`, err);
      }
    }

    // Notify provider
    if (config.contact?.whatsapp) {
      try {
        const { sendWhatsApp } = await import('@quote-engine/notifications/whatsapp');
        await sendWhatsApp({
          to: config.contact.whatsapp,
          message: `[Recordatorio enviado] Se envio recordatorio automatico a ${quote.clientName} (${quote.clientCompany || 'sin empresa'}) por cotizacion #${quote.quoteNumber} ($${quote.total} MXN). La cotizacion lleva mas de 48hrs sin abrirse.`,
        });
      } catch {
        // Non-critical
      }
    }

    // Log event
    await db.insert(quoteEvents).values({
      quoteId: quote.id,
      tenantId: quote.tenantId,
      eventType: 'reminder_sent',
      metadata: {
        reminderNumber: reminderCount.count + 1,
        sentVia: 'whatsapp',
        sentAt: new Date().toISOString(),
      },
    });

    console.log(`[cron-reminders] Reminder #${reminderCount.count + 1} logged for quote ${quote.quoteNumber}`);
  }

  // Also mark expired quotes
  const expired = await db
    .update(quotes)
    .set({ status: 'expired' })
    .where(
      and(
        sql`status IN ('generated', 'sent', 'viewed')`,
        lte(quotes.expiresAt, new Date())
      )
    )
    .returning({ id: quotes.id });

  if (expired.length > 0) {
    console.log(`[cron-reminders] Marked ${expired.length} quotes as expired`);
  }

  console.log(`[cron-reminders] Done at ${new Date().toISOString()}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[cron-reminders] Fatal error:', err);
  process.exit(1);
});
