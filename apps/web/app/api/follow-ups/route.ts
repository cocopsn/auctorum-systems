export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, count, eq, gte, lte } from 'drizzle-orm';
import { db, followUps } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const createSchema = z.object({
  clientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  quoteId: z.string().uuid().optional().nullable(),
  type: z.enum(['post_appointment', 'recall', 'quote_followup', 'custom']),
  scheduledAt: z.string().datetime(),
  messageTemplate: z.string().max(4000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const filters = [eq(followUps.tenantId, auth.tenant.id)];
    if (status) filters.push(eq(followUps.status, status));
    if (from) filters.push(gte(followUps.scheduledAt, new Date(from)));
    if (to) filters.push(lte(followUps.scheduledAt, new Date(to)));
    const where = and(...filters);

    const [{ count: total = 0 } = { count: 0 }] = await db
      .select({ count: count() })
      .from(followUps)
      .where(where);

    const rows = await db
      .select()
      .from(followUps)
      .where(where)
      .orderBy(asc(followUps.scheduledAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);
    return apiSuccess({
      rows,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });


  } catch (error) {
    console.error('/api/follow-ups GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

    const [created] = await db
      .insert(followUps)
      .values({
        tenantId: auth.tenant.id,
        clientId: parsed.data.clientId,
        appointmentId: parsed.data.appointmentId ?? null,
        quoteId: parsed.data.quoteId ?? null,
        type: parsed.data.type,
        scheduledAt: new Date(parsed.data.scheduledAt),
        messageTemplate: parsed.data.messageTemplate ?? null,
      })
      .returning();

    return apiSuccess(created, 201);


  } catch (error) {
    console.error('/api/follow-ups POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
