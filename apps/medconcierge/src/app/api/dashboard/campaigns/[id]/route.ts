export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// PATCH /api/dashboard/campaigns/[id]
// Update a draft campaign
const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  messageBody: z.string().min(1).max(2000).optional(),
  audienceFilter: z.record(z.unknown()).optional(),
  scheduledAt: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Check campaign exists and is draft
    const existing = await db.execute(
      sql`SELECT id, status FROM campaigns WHERE id = ${id} AND tenant_id = ${auth.tenant.id}`
    );

    if (!existing.length) {
      return NextResponse.json(
        { error: 'Campana no encontrada' },
        { status: 404 }
      );
    }

    if ((existing[0] as any).status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo se pueden editar campanas en borrador' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = UpdateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, messageBody, audienceFilter, scheduledAt } = parsed.data;

    // Build SET clauses dynamically
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];

    if (name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (messageBody !== undefined) {
      setClauses.push(`message_body = $${values.length + 1}`);
      values.push(messageBody);
    }
    if (audienceFilter !== undefined) {
      setClauses.push(`audience_filter = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(audienceFilter));
    }
    if (scheduledAt !== undefined) {
      setClauses.push(`scheduled_at = $${values.length + 1}`);
      values.push(scheduledAt);
    }

    // Use raw SQL with template literals for the update
    const result = await db.execute(
      sql`UPDATE campaigns SET
            name = COALESCE(${name ?? null}, name),
            message_body = COALESCE(${messageBody ?? null}, message_body),
            audience_filter = COALESCE(${
              audienceFilter
                ? sql`${JSON.stringify(audienceFilter)}::jsonb`
                : sql`audience_filter`
            }, audience_filter),
            scheduled_at = ${scheduledAt !== undefined ? scheduledAt : sql`scheduled_at`},
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${auth.tenant.id}
          RETURNING *`
    );

    const [campaign] = result as any[];
    return NextResponse.json({ campaign: campaign ?? null });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Error al actualizar campana' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/campaigns/[id]
// Hard delete a draft campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Check campaign exists and is draft
    const existing = await db.execute(
      sql`SELECT id, status FROM campaigns WHERE id = ${id} AND tenant_id = ${auth.tenant.id}`
    );

    if (!existing.length) {
      return NextResponse.json(
        { error: 'Campana no encontrada' },
        { status: 404 }
      );
    }

    if ((existing[0] as any).status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar campanas en borrador' },
        { status: 400 }
      );
    }

    await db.execute(
      sql`DELETE FROM campaigns WHERE id = ${id} AND tenant_id = ${auth.tenant.id}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Error al eliminar campana' },
      { status: 500 }
    );
  }
}
