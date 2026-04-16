/**
 * Cron: Mark expired quotes + send 48hr reminders for unopened quotes
 * Run: npx tsx scripts/cron-reminders.ts
 * Schedule: every 4 hours via PM2 or crontab
 *
 * BE-08: Mark quotes as 'expired' when past expiresAt
 * BE-09: Send WhatsApp reminders for quotes not viewed after 48hrs (max 2 reminders)
 */

import { db, quotes, quoteEvents, tenants } from '@quote-engine/db';
import type { TenantConfig } from '@quote-engine/db';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';
import { sendWhatsAppMessage } from '@quote-engine/notifications/whatsapp';

const REMINDER_THRESHOLD_HOURS = 48;
const MAX_REMINDERS = 2;

// ============================================================
// BE-08: Mark expired quotes
// ============================================================
async function markExpiredQuotes() {
  const now = new Date();

  const result = await db
    .update(quotes)
    .set({ status: 'expired' })
    .where(
      and(
        lte(quotes.expiresAt, now),
        inArray(quotes.status, ['generated', 'sent', 'viewed'])
      )
    )
    .returning({ id: quotes.id });

  console.log(JSON.stringify({
    timestamp: now.toISOString(),
    action: 'mark_expired_quotes',
    count: result.length,
    expiredIds: result.map(r => r.id),
  }));

  return result.length;
}

// ============================================================
// BE-09: Send 48hr reminders for unopened quotes
// ============================================================
async function sendReminders() {
  const cutoff = new Date(Date.now() - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Find quotes that are still 'sent' (never viewed) and older than 48hrs
  const staleQuotes = await db
    .select({
      id: quotes.id,
      tenantId: quotes.tenantId,
      clientName: quotes.clientName,
      clientPhone: quotes.clientPhone,
      clientEmail: quotes.clientEmail,
      clientCompany: quotes.clientCompany,
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

  console.log(`[cron-reminders] Found ${staleQuotes.length} stale quotes (sent > ${REMINDER_THRESHOLD_HOURS}hrs ago)`);

  let remindersSent = 0;

  for (const quote of staleQuotes) {
    try {
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
        console.log(`[cron-reminders] Quote #${quote.quoteNumber} already has ${MAX_REMINDERS} reminders, skipping`);
        continue;
      }

      // Get tenant config for WhatsApp settings and branding
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, quote.tenantId))
        .limit(1);

      if (!tenant) {
        console.warn(`[cron-reminders] Tenant ${quote.tenantId} not found for quote ${quote.id}`);
        continue;
      }

      const config = tenant.config as TenantConfig;
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx';
      const trackingUrl = `https://${tenant.slug}.${appDomain}/q/${quote.trackingToken}`;

      let reminderSentVia = 'none';

      // Send WhatsApp reminder to client
      if (quote.clientPhone) {
        try {
          const sent = await sendWhatsAppMessage({
            to: quote.clientPhone,
            message: [
              `*${tenant.name}*`,
              ``,
              `Hola ${quote.clientName}, le recordamos que tiene una cotizacion pendiente (#${String(quote.quoteNumber).padStart(4, '0')}) por $${quote.total} MXN.`,
              ``,
              `Puede revisarla aqui: ${trackingUrl}`,
              ``,
              `Si tiene dudas, contactenos al ${config.contact?.phone || ''}.`,
            ].join('\n'),
          });

          if (sent) {
            reminderSentVia = 'whatsapp';
            console.log(`[cron-reminders] WhatsApp reminder sent to ${quote.clientPhone} for quote #${quote.quoteNumber}`);
          }
        } catch (err) {
          console.error(`[cron-reminders] WhatsApp failed for quote ${quote.id}:`, err);
        }
      }

      // Notify provider that a reminder was sent
      if (config.contact?.whatsapp) {
        try {
          await sendWhatsAppMessage({
            to: config.contact.whatsapp,
            message: [
              `*Recordatorio enviado*`,
              ``,
              `Se envio recordatorio automatico a ${quote.clientName} (${quote.clientCompany || 'sin empresa'}) por cotizacion #${String(quote.quoteNumber).padStart(4, '0')} ($${quote.total} MXN).`,
              ``,
              `La cotizacion lleva mas de 48hrs sin abrirse.`,
            ].join('\n'),
          });
        } catch {
          // Non-critical — provider notification failure should not block
        }
      }

      // Record the reminder_sent event
      await db.insert(quoteEvents).values({
        quoteId: quote.id,
        tenantId: quote.tenantId,
        eventType: 'reminder_sent',
        metadata: {
          reminderNumber: reminderCount.count + 1,
          sentVia: reminderSentVia,
          sentAt: new Date().toISOString(),
        },
      });

      remindersSent++;
      console.log(`[cron-reminders] Reminder #${reminderCount.count + 1} logged for quote #${quote.quoteNumber}`);
    } catch (err) {
      console.error(`[cron-reminders] Error processing quote ${quote.id}:`, err);
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'send_reminders',
    staleQuotesFound: staleQuotes.length,
    remindersSent,
  }));

  return remindersSent;
}

// ============================================================
// Main
// ============================================================
async function run() {
  console.log(`[cron-reminders] Starting at ${new Date().toISOString()}`);

  // BE-08: Mark expired quotes first
  const expiredCount = await markExpiredQuotes();

  // BE-09: Send reminders for unopened quotes
  const reminderCount = await sendReminders();

  console.log(`[cron-reminders] Done at ${new Date().toISOString()} — expired: ${expiredCount}, reminders: ${reminderCount}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[cron-reminders] Fatal error:', err);
  process.exit(1);
});
