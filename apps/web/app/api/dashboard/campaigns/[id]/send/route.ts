export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import {
  db,
  campaigns,
  campaignMessages,
  clients,
  tenants,
} from '@quote-engine/db';
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { createQueue } from '@quote-engine/queue';
import { hasFeature } from '@/lib/plan-gating';

// POST /api/dashboard/campaigns/[id]/send
//
// Pre-2026-05-11 this endpoint was a placebo: it counted matching
// clients, flipped `messages_sent = recipientCount, status='completed'`
// and returned "Campaña enviada a N destinatarios". Nothing was enqueued,
// no WhatsApp was ever sent. The fix mirrors the medconcierge flow:
//   1. resolve audience (with whatsapp_opted_out_at honored)
//   2. materialize campaign_messages rows in chunks
//   3. flip campaign to 'sending' (or 'scheduled' if scheduledAt is future)
//   4. enqueue BullMQ job → scripts/campaign-worker.ts actually sends.

const bodySchema = z
  .object({
    sendNow: z.boolean().optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .partial();

interface AudienceClient {
  id: string;
  name: string | null;
  phone: string | null;
}

async function resolveAudience(
  tenantId: string,
  audienceFilter: Record<string, unknown> | null,
): Promise<AudienceClient[]> {
  const filter = audienceFilter ?? {};

  if (
    typeof filter.recentDays === 'number' ||
    typeof filter.recentDays === 'string'
  ) {
    const days = Number(filter.recentDays);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const rows = await db
      .select({ id: clients.id, name: clients.name, phone: clients.phone })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          isNotNull(clients.phone),
          gte(clients.createdAt, cutoff),
          sql`${clients.whatsappOptedOutAt} IS NULL`,
        ),
      );
    return rows.filter(
      (r) => r.phone && r.phone.replace(/\D/g, '').length >= 10,
    );
  }

  if (filter.funnelStage) {
    const stage = String(filter.funnelStage);
    const rows = (await db.execute(
      sql`SELECT c.id, c.name, c.phone
          FROM clients c
          LEFT JOIN client_funnel cf ON cf.client_id = c.id
          LEFT JOIN funnel_stages fs ON fs.id = cf.stage_id
          WHERE c.tenant_id = ${tenantId}::uuid
            AND c.phone IS NOT NULL
            AND c.phone <> ''
            AND c.whatsapp_opted_out_at IS NULL
            AND (fs.name = ${stage} OR c.status = ${stage})`,
    )) as unknown as AudienceClient[];
    return rows.filter(
      (r) => r.phone && r.phone.replace(/\D/g, '').length >= 10,
    );
  }

  const rows = await db
    .select({ id: clients.id, name: clients.name, phone: clients.phone })
    .from(clients)
    .where(
      and(
        eq(clients.tenantId, tenantId),
        isNotNull(clients.phone),
        sql`${clients.whatsappOptedOutAt} IS NULL`,
      ),
    );
  return rows.filter(
    (r) => r.phone && r.phone.replace(/\D/g, '').length >= 10,
  );
}

function personalize(
  template: string,
  recipient: AudienceClient,
  businessName: string,
): string {
  return template
    .replaceAll('{nombre}', recipient.name || 'Cliente')
    .replaceAll('{negocio}', businessName);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(['admin']);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Plan-gate WhatsApp campaigns. Free / 'basico' plans do NOT get the
    // campaign engine — they'd burn through the tenant's WABA cap on day
    // one. Pre-2026-05-11 this was unenforced.
    if (!hasFeature((auth.tenant.plan as string) ?? 'basico', 'campaigns')) {
      return NextResponse.json(
        {
          error:
            'Las campañas de WhatsApp requieren el Plan Auctorum o superior.',
          code: 'PLAN_LIMIT',
        },
        { status: 402 },
      );
    }

    // Rate limit: 1/minute per tenant
    const rl = await rateLimit(`campaign-send:${auth.tenant.id}`, 1, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Solo puedes enviar una campaña por minuto' },
        { status: 429 },
      );
    }

    const idParse = z.string().uuid().safeParse(params.id);
    if (!idParse.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    const id = idParse.data;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await request.json().catch(() => ({})));
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const sendNow = body.sendNow ?? !body.scheduledAt;
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, auth.tenant.id)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 },
      );
    }
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        {
          error: 'Solo se pueden enviar campañas en borrador o programadas',
        },
        { status: 400 },
      );
    }
    if (!campaign.messageBody || campaign.messageBody.trim() === '') {
      return NextResponse.json(
        { error: 'La campaña no tiene mensaje' },
        { status: 400 },
      );
    }

    const audience = await resolveAudience(
      auth.tenant.id,
      (campaign.audienceFilter as Record<string, unknown>) || {},
    );
    if (audience.length === 0) {
      return NextResponse.json(
        {
          error: 'No hay destinatarios con teléfono que coincidan con el filtro',
        },
        { status: 400 },
      );
    }

    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, auth.tenant.id))
      .limit(1);
    const businessName = tenant?.name || 'Negocio';

    const inserts = audience.map((recipient) => ({
      campaignId: campaign.id,
      clientId: recipient.id,
      tenantId: auth.tenant.id,
      phone: recipient.phone!,
      recipientName: recipient.name,
      messageBody: personalize(campaign.messageBody!, recipient, businessName),
      status: 'queued' as const,
    }));

    const CHUNK = 500;
    for (let i = 0; i < inserts.length; i += CHUNK) {
      await db.insert(campaignMessages).values(inserts.slice(i, i + CHUNK));
    }

    const isScheduled =
      !sendNow && scheduledAt && scheduledAt.getTime() > Date.now();

    await db
      .update(campaigns)
      .set({
        status: isScheduled ? 'scheduled' : 'sending',
        scheduledAt: isScheduled ? scheduledAt : null,
        startedAt: isScheduled ? null : new Date(),
        totalRecipients: audience.length,
        messagesSent: 0,
        messagesFailed: 0,
        statsJson: {
          queued: audience.length,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        },
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));

    if (!isScheduled) {
      try {
        const queue = createQueue('whatsapp_campaigns');
        await queue.add(
          'send-campaign',
          { tenant_id: auth.tenant.id, campaignId: id },
          { jobId: `campaign:${id}` },
        );
      } catch (e) {
        console.error('[campaigns:send] queue enqueue failed:', e);
        // Don't roll back — cron-campaigns will pick it up if still
        // 'sending' without progress.
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipients: audience.length,
      status: isScheduled ? 'scheduled' : 'sending',
      scheduledAt: scheduledAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Error al enviar campaña' },
      { status: 500 },
    );
  }
}
