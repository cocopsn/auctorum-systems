export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, payments, clients } from '@quote-engine/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// ---------------------------------------------------------------------------
// GET /api/dashboard/payments
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const processor = searchParams.get('processor');

  // Build where conditions
  const conditions: any[] = [
    eq(payments.tenantId, auth.tenant.id),
    sql`${payments.deletedAt} IS NULL`,
  ];

  if (status) conditions.push(eq(payments.status, status));
  if (processor) conditions.push(eq(payments.processor, processor));
  if (startDate) conditions.push(gte(payments.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(payments.createdAt, new Date(endDate)));

  // Fetch payments joined with clients
  const rows = await db
    .select({
      id: payments.id,
      client_id: payments.clientId,
      patient_id: payments.patientId,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.method,
      processor: payments.processor,
      status: payments.status,
      reference: payments.reference,
      linked_quote_id: payments.linkedQuoteId,
      linked_appointment_id: payments.linkedAppointmentId,
      notes: payments.notes,
      paid_at: payments.paidAt,
      created_at: payments.createdAt,
      budget_id: payments.budgetId,
      processor_payment_id: payments.processorPaymentId,
      client_name: clients.name,
    })
    .from(payments)
    .leftJoin(clients, eq(payments.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt));

  // KPIs — scoped to current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [kpis] = await db
    .select({
      total_collected: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' AND ${payments.createdAt} >= ${monthStart} THEN ${payments.amount} ELSE 0 END), 0)`,
      count_this_month: sql<number>`COUNT(CASE WHEN ${payments.createdAt} >= ${monthStart} THEN 1 END)`,
      pending_count: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)`,
    })
    .from(payments)
    .where(and(eq(payments.tenantId, auth.tenant.id), sql`${payments.deletedAt} IS NULL`));

  return NextResponse.json({
    payments: rows,
    kpis: {
      totalCollected: Number(kpis.total_collected),
      countThisMonth: Number(kpis.count_this_month),
      pendingCount: Number(kpis.pending_count),
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/payments
// ---------------------------------------------------------------------------
const createPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  method: z.string().min(1, 'El método es requerido'),
  clientId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  budgetId: z.string().uuid().optional(),
  linkedQuoteId: z.string().uuid().optional(),
  processor: z.string().default('manual'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId: auth.tenant.id,
      clientId: data.clientId ?? null,
      patientId: data.patientId ?? null,
      budgetId: data.budgetId ?? null,
      linkedQuoteId: data.linkedQuoteId ?? null,
      amount: String(data.amount),
      currency: 'MXN',
      method: data.method,
      processor: data.processor,
      status: 'pending',
      notes: data.notes ?? null,
    })
    .returning();

  return NextResponse.json({ payment }, { status: 201 });
}
