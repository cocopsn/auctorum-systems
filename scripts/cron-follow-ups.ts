/**
 * cron-follow-ups
 *
 * Pre-2026-05-10 follow-ups were a UI placebo: doctors created rows in
 * `follow_ups` with status='scheduled' and the system never sent
 * anything. The dedicated cron is now wired up — runs every 15 minutes,
 * picks all `scheduled` rows whose `scheduled_at` is past, sends the
 * WhatsApp template (or default copy when the doctor didn't customize),
 * and flips the row to `sent` (or marks failure for retry-from-UI).
 *
 * Call cadence: every 15 minutes via PM2 cron_restart.
 *
 * Templates support these vars (interpolated via formatBotMessage's
 * lightweight {var} syntax): {nombre}, {clinica}, {telefono}.
 */

import 'dotenv/config'
import { and, eq, isNull, lte } from 'drizzle-orm'
import { db, followUps, clients, tenants } from '@quote-engine/db'
import { sendWhatsAppMessage } from '@quote-engine/notifications/whatsapp'

const BATCH = 25
const DEFAULT_TEMPLATES: Record<string, string> = {
  post_appointment:
    'Hola {nombre}, gracias por su visita en {clinica}. Si tiene alguna duda o necesita una receta adicional, escríbanos por aquí. Que tenga excelente día.',
  recall:
    'Hola {nombre}, hace tiempo que no nos vemos. ¿Le gustaría agendar una revisión con {clinica}? Estamos para servirle.',
  quote_followup:
    'Hola {nombre}, ¿tuvo oportunidad de revisar el presupuesto que le compartimos? Si necesita más información, con gusto le ayudamos.',
  custom: 'Hola {nombre}, le contactamos desde {clinica}.',
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

async function main() {
  const start = Date.now()
  const now = new Date()
  console.log(`[follow-ups] starting at ${now.toISOString()}`)

  const due = await db
    .select({
      followUp: followUps,
      client: clients,
      tenant: tenants,
    })
    .from(followUps)
    .innerJoin(clients, eq(clients.id, followUps.clientId))
    .innerJoin(tenants, eq(tenants.id, followUps.tenantId))
    .where(
      and(
        eq(followUps.status, 'scheduled'),
        lte(followUps.scheduledAt, now),
        isNull(followUps.deletedAt),
      ),
    )
    .limit(BATCH)

  console.log(`[follow-ups] ${due.length} due in this window`)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const { followUp, client, tenant } of due) {
    if (!client.phone) {
      // No phone — mark as cancelled so we don't keep retrying forever.
      await db
        .update(followUps)
        .set({ status: 'cancelled' })
        .where(eq(followUps.id, followUp.id))
      skipped++
      continue
    }

    const template =
      followUp.messageTemplate ??
      DEFAULT_TEMPLATES[followUp.type] ??
      DEFAULT_TEMPLATES.custom

    const message = interpolate(template, {
      nombre: client.name,
      clinica: tenant.name,
      telefono: client.phone,
    })

    try {
      const ok = await sendWhatsAppMessage({ to: client.phone, message })
      if (ok) {
        await db
          .update(followUps)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(followUps.id, followUp.id))
        sent++
      } else {
        // Leave as scheduled so the operator can see it failed and either
        // delete (cancel) or fix the phone and let the next tick retry.
        failed++
        console.warn(`[follow-ups] send failed for follow_up=${followUp.id} client=${client.id} phone=${client.phone}`)
      }
    } catch (err) {
      failed++
      console.error(`[follow-ups] send threw for follow_up=${followUp.id}:`, err instanceof Error ? err.message : err)
    }
  }

  const ms = Date.now() - start
  console.log(
    JSON.stringify({
      action: 'follow_ups_cycle',
      window_ms: ms,
      due: due.length,
      sent,
      failed,
      skipped,
      timestamp: new Date().toISOString(),
    }),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-follow-ups] fatal', err)
    process.exit(1)
  })
