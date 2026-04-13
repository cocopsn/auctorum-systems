export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant, requireRole } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';

// GET /api/dashboard/campaigns
// List campaigns + 4 KPIs
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Fetch all campaigns
    const campaignsResult = await db.execute(
      sql`SELECT * FROM campaigns WHERE tenant_id = ${auth.tenant.id} AND deleted_at IS NULL ORDER BY created_at DESC`
    );

    // Aggregate KPIs in a single query
    const kpiResult = await db.execute(
      sql`SELECT
            COUNT(*)::int AS total_campaigns,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
            COALESCE(SUM(messages_sent), 0)::int AS total_messages_sent
          FROM campaigns
          WHERE tenant_id = ${auth.tenant.id} AND deleted_at IS NULL`
    );

    const [kpiRow] = kpiResult as any[];
    const kpis = kpiRow ?? {
      total_campaigns: 0,
      completed: 0,
      in_progress: 0,
      total_messages_sent: 0,
    };

    return NextResponse.json({
      campaigns: campaignsResult,
      kpis,
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return NextResponse.json(
      { error: 'Error al obtener campanas' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/campaigns
// Create a new campaign as draft
const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  messageBody: z.string().min(1).max(2000),
  audienceFilter: z.record(z.unknown()).optional(),
  scheduledAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'operator']);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { audienceFilter, scheduledAt } = parsed.data;
    const name = sanitizeText(parsed.data.name);
    const messageBody = sanitizeText(parsed.data.messageBody);
    const audienceJson = audienceFilter
      ? JSON.stringify(audienceFilter)
      : null;

    const result = await db.execute(
      sql`INSERT INTO campaigns (
            tenant_id,
            name,
            message_body,
            audience_filter,
            status,
            scheduled_at,
            created_at,
            updated_at
          ) VALUES (
            ${auth.tenant.id},
            ${name},
            ${messageBody},
            ${audienceJson ? sql`${audienceJson}::jsonb` : sql`NULL`},
            'draft',
            ${scheduledAt ?? null},
            NOW(),
            NOW()
          ) RETURNING *`
    );

    const [campaign] = result as any[];

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Error al crear campana' },
      { status: 500 }
    );
  }
}
