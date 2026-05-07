export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// POST /api/dashboard/campaigns/[id]/send
// "Send" a campaign — MVP: count matching clients, mark as completed immediately
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(['admin']);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Rate limit: 1/minute per tenant
    const rl = await rateLimit(`campaign-send:${auth.tenant.id}`, 1, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Solo puedes enviar una campana por minuto' }, { status: 429 });
    }

    // Campaign limits by plan (H9)
    const [sub] = await db.execute(
      sql`SELECT plan FROM subscriptions WHERE tenant_id = ${auth.tenant.id} ORDER BY created_at DESC LIMIT 1`
    ) as any[];
    const plan = sub?.plan || 'basico';

    const CAMPAIGN_LIMITS: Record<string, number> = {
      basico: 1,
      auctorum: 10,
      enterprise: 100,
    };

    const [countResult] = await db.execute(
      sql`SELECT COUNT(*)::int as cnt FROM campaigns
          WHERE tenant_id = ${auth.tenant.id}
          AND status = 'completed'
          AND completed_at >= DATE_TRUNC('month', NOW())`
    ) as any[];

    const monthlyCount = countResult?.cnt || 0;
    const maxAllowed = CAMPAIGN_LIMITS[plan] || 1;

    if (monthlyCount >= maxAllowed) {
      return NextResponse.json(
        { error: `Limite de campanas alcanzado para tu plan (${maxAllowed}/mes)` },
        { status: 429 }
      );
    }

    const idSchema = z.string().uuid();
    const idParsed = idSchema.safeParse(params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }
    const id = idParsed.data;

    // Fetch the campaign
    const campaignResult = await db.execute(
      sql`SELECT * FROM campaigns WHERE id = ${id} AND tenant_id = ${auth.tenant.id}`
    );

    if (!campaignResult.length) {
      return NextResponse.json(
        { error: 'Campana no encontrada' },
        { status: 404 }
      );
    }

    const campaign = campaignResult[0] as Record<string, unknown>;

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Solo se pueden enviar campanas en borrador o programadas' },
        { status: 400 }
      );
    }

    // Count clients matching audience filter (or all clients if no filter)
    const audienceFilter = campaign.audience_filter as Record<
      string,
      unknown
    > | null;

    let recipientCount = 0;

    if (!audienceFilter || Object.keys(audienceFilter).length === 0) {
      const countResult = await db.execute(
        sql`SELECT COUNT(*)::int AS count FROM clients WHERE tenant_id = ${auth.tenant.id}`
      );
      recipientCount = ((countResult as any[])[0] as { count: number })?.count ?? 0;
    } else {
      if (audienceFilter.funnelStage) {
        const countResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count
              FROM clients
              WHERE tenant_id = ${auth.tenant.id}
                AND funnel_stage = ${audienceFilter.funnelStage as string}`
        );
        recipientCount =
          ((countResult as any[])[0] as { count: number })?.count ?? 0;
      } else if (audienceFilter.recentDays) {
        const days = Number(audienceFilter.recentDays);
        const countResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count
              FROM clients
              WHERE tenant_id = ${auth.tenant.id}
                AND created_at >= NOW() - MAKE_INTERVAL(days => ${days})`
        );
        recipientCount =
          ((countResult as any[])[0] as { count: number })?.count ?? 0;
      } else {
        const countResult = await db.execute(
          sql`SELECT COUNT(*)::int AS count FROM clients WHERE tenant_id = ${auth.tenant.id}`
        );
        recipientCount =
          ((countResult as any[])[0] as { count: number })?.count ?? 0;
      }
    }

    // MVP: mark campaign as completed with all messages "sent"
    const result = await db.execute(
      sql`UPDATE campaigns
          SET
            status = 'completed',
            total_recipients = ${recipientCount},
            messages_sent = ${recipientCount},
            messages_failed = 0,
            started_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${auth.tenant.id}
          RETURNING *`
    );

    const [updatedCampaign] = result as any[];
    return NextResponse.json({
      campaign: updatedCampaign ?? null,
      message: `Campana enviada a ${recipientCount} destinatarios`,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Error al enviar campana' },
      { status: 500 }
    );
  }
}
