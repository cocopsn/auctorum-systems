export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const createSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Monto inválido'),
  currency: z.string().length(3).default('MXN'),
  method: z.enum(['cash', 'transfer', 'mercadopago', 'stripe', 'other']),
  processor: z.enum(['manual', 'mercadopago', 'stripe']).default('manual'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed'),
  reference: z.string().max(255).optional().nullable(),
  linkedQuoteId: z.string().uuid().optional().nullable(),
  linkedAppointmentId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
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

    const filters = [eq(payments.tenantId, auth.tenant.id), isNull(payments.deletedAt)];
    if (status) filters.push(eq(payments.status, status));
    if (from) filters.push(gte(payments.createdAt, new Date(from)));
    if (to) filters.push(lte(payments.createdAt, new Date(to)));
    const where = and(...filters);

    const [{ count: total = 0 } = { count: 0 }] = await db
      .select({ count: count() })
      .from(payments)
      .where(where);

    const rows = await db
      .select()
      .from(payments)
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    // KPI sums (over the SAME filtered set, ignoring pagination).
    const [kpis] = await db
      .select({
        totalAmount: sql<string>`coalesce(sum(${payments.amount})::text, '0')`,
        completedAmount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'completed')::text, '0')`,
        pendingAmount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending')::text, '0')`,
        refundedAmount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'refunded')::text, '0')`,
      })
      .from(payments)
      .where(where);

    const totalPages = Math.ceil(total / limit);
    return apiSuccess({
      rows,
      kpis,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });


  } catch (error) {
    console.error('/api/payments GET error:', error);
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
      .insert(payments)
      .values({
        tenantId: auth.tenant.id,
        clientId: parsed.data.clientId ?? null,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        method: parsed.data.method,
        processor: parsed.data.processor,
        status: parsed.data.status,
        reference: parsed.data.reference ?? null,
        linkedQuoteId: parsed.data.linkedQuoteId ?? null,
        linkedAppointmentId: parsed.data.linkedAppointmentId ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning();

    return apiSuccess(created, 201);


  } catch (error) {
    console.error('/api/payments POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
