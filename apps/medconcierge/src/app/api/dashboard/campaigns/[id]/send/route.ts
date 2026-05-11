export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTenant, requireRole } from '@/lib/auth'
import { db, campaigns, campaignMessages, clients } from '@quote-engine/db'
import { and, eq, isNotNull, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { createQueue } from '@quote-engine/queue'

// POST /api/dashboard/campaigns/[id]/send
// Resolves audience, materializes campaign_messages rows, marks the campaign
// as `sending` (or `scheduled` if scheduledAt is in the future) and enqueues
// a BullMQ job on the `whatsapp_campaigns` queue.
//
// The actual message sending is performed by scripts/campaign-worker.ts which
// rate-limits to ~80 msgs/hour to stay under Meta WABA marketing limits.

const bodySchema = z
  .object({
    sendNow: z.boolean().optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .partial()

interface AudienceClient {
  id: string
  name: string | null
  phone: string | null
}

async function resolveAudience(
  tenantId: string,
  audienceFilter: Record<string, unknown> | null,
): Promise<AudienceClient[]> {
  const filter = audienceFilter ?? {}

  // 1) Recent days — clients created within N days
  if (typeof filter.recentDays === 'number' || typeof filter.recentDays === 'string') {
    const days = Number(filter.recentDays)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const rows = await db
      .select({ id: clients.id, name: clients.name, phone: clients.phone })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          isNotNull(clients.phone),
          gte(clients.createdAt, cutoff),
        ),
      )
    return rows.filter((r) => r.phone && r.phone.replace(/\D/g, '').length >= 10)
  }

  // 2) Funnel stage — uses raw SQL to support both legacy `funnel_stage` column
  //    and the new client_funnel join table (whichever exists in this tenant).
  if (filter.funnelStage) {
    const stage = String(filter.funnelStage)
    const rows = await db.execute(
      sql`SELECT c.id, c.name, c.phone
          FROM clients c
          LEFT JOIN client_funnel cf ON cf.client_id = c.id
          LEFT JOIN funnel_stages fs ON fs.id = cf.stage_id
          WHERE c.tenant_id = ${tenantId}
            AND c.phone IS NOT NULL
            AND c.phone <> ''
            AND (fs.name = ${stage} OR c.status = ${stage})`,
    )
    return (rows as unknown as AudienceClient[]).filter(
      (r) => r.phone && r.phone.replace(/\D/g, '').length >= 10,
    )
  }

  // 3) Default — everyone in this tenant with a phone
  const rows = await db
    .select({ id: clients.id, name: clients.name, phone: clients.phone })
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), isNotNull(clients.phone)))
  return rows.filter((r) => r.phone && r.phone.replace(/\D/g, '').length >= 10)
}

function personalize(template: string, recipient: AudienceClient, businessName: string): string {
  return template
    .replaceAll('{nombre}', recipient.name || 'Paciente')
    .replaceAll('{negocio}', businessName)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Role gate: mass WhatsApp dispatch can cost real money (Meta marketing
  // conversation pricing) and is the highest-impact policy violation
  // vector if used carelessly. Restrict to admin.
  const adminAuth = await requireRole(['admin'])
  if (!adminAuth) {
    return NextResponse.json(
      { error: 'Solo administradores pueden enviar campañas' },
      { status: 403 },
    )
  }

  const idParse = z.string().uuid().safeParse(params.id)
  if (!idParse.success) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }
  const id = idParse.data

  let body
  try {
    body = bodySchema.parse(await request.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const sendNow = body.sendNow ?? !body.scheduledAt
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null

  // Fetch the campaign
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, auth.tenant.id)))
    .limit(1)

  if (!campaign) {
    return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Solo se pueden enviar campañas en borrador o programadas' },
      { status: 400 },
    )
  }
  if (!campaign.messageBody || campaign.messageBody.trim() === '') {
    return NextResponse.json({ error: 'La campaña no tiene mensaje' }, { status: 400 })
  }

  // Resolve audience
  const audience = await resolveAudience(
    auth.tenant.id,
    (campaign.audienceFilter as Record<string, unknown>) || {},
  )
  if (audience.length === 0) {
    return NextResponse.json(
      { error: 'No hay destinatarios con teléfono que coincidan con el filtro' },
      { status: 400 },
    )
  }

  // Materialize campaign_messages rows
  const businessName = auth.tenant.name || 'Consultorio'
  const inserts = audience.map((recipient) => ({
    campaignId: campaign.id,
    clientId: recipient.id,
    tenantId: auth.tenant.id,
    phone: recipient.phone!,
    recipientName: recipient.name,
    messageBody: personalize(campaign.messageBody!, recipient, businessName),
    status: 'queued' as const,
  }))
  // Insert in chunks to avoid huge single statements
  const CHUNK = 500
  for (let i = 0; i < inserts.length; i += CHUNK) {
    await db.insert(campaignMessages).values(inserts.slice(i, i + CHUNK))
  }

  const isScheduled = !sendNow && scheduledAt && scheduledAt.getTime() > Date.now()

  // Update campaign status + counts
  await db
    .update(campaigns)
    .set({
      status: isScheduled ? 'scheduled' : 'sending',
      scheduledAt: isScheduled ? scheduledAt : null,
      startedAt: isScheduled ? null : new Date(),
      totalRecipients: audience.length,
      messagesSent: 0,
      messagesFailed: 0,
      statsJson: { queued: audience.length, sent: 0, delivered: 0, read: 0, failed: 0 },
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))

  // Enqueue (immediate or delayed) — only when not scheduled-for-future.
  // Scheduled campaigns are picked up by scripts/cron-campaigns.ts each minute.
  if (!isScheduled) {
    try {
      const queue = createQueue('whatsapp_campaigns')
      await queue.add(
        'send-campaign',
        { tenant_id: auth.tenant.id, campaignId: id },
        { jobId: `campaign:${id}` },
      )
    } catch (e) {
      console.error('[campaigns:send] queue enqueue failed:', e)
      // Don't roll back — the cron will pick it up on the next run if it's
      // still in `sending` status without progress.
    }
  }

  return NextResponse.json({
    success: true,
    totalRecipients: audience.length,
    status: isScheduled ? 'scheduled' : 'sending',
    scheduledAt: scheduledAt?.toISOString() ?? null,
  })
}
