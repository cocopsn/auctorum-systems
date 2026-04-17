export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, desc, eq } from 'drizzle-orm';
import { db, invoices, payments } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  paymentId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  rfc: z.string().min(12).max(13),
  razonSocial: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  usoCfdi: z.string().max(10).optional().nullable(),
  regimenFiscal: z.string().max(10).optional().nullable(),
  cpZip: z.string().length(5).optional().nullable(),
  total: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Total inválido'),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const filters = [eq(invoices.tenantId, auth.tenant.id)];
    if (status) filters.push(eq(invoices.status, status));
    const where = and(...filters);

    const [{ count: total = 0 } = { count: 0 }] = await db
      .select({ count: count() })
      .from(invoices)
      .where(where);

    const rows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);
    return apiSuccess({
      rows,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });


  } catch (error) {
    console.error('/api/invoices GET error:', error);
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

    // If paymentId provided, ensure it belongs to this tenant.
    if (parsed.data.paymentId) {
      const [pay] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.id, parsed.data.paymentId), eq(payments.tenantId, auth.tenant.id)))
        .limit(1);
      if (!pay) return apiError(404, 'Payment not found');
    }

    const [created] = await db
      .insert(invoices)
      .values({
        tenantId: auth.tenant.id,
        paymentId: parsed.data.paymentId ?? null,
        clientId: parsed.data.clientId ?? null,
        rfc: parsed.data.rfc.toUpperCase(),
        razonSocial: parsed.data.razonSocial,
        email: parsed.data.email ?? null,
        usoCfdi: parsed.data.usoCfdi ?? null,
        regimenFiscal: parsed.data.regimenFiscal ?? null,
        cpZip: parsed.data.cpZip ?? null,
        total: parsed.data.total,
        status: 'pending',
      })
      .returning();

    // NOTE: actual CFDI stamping (Facturapi) lives in Checkpoint 5. We only persist fiscal data.
    logger.info('invoice.requested', { tenantId: auth.tenant.id, action: 'create_invoice' });
    return apiSuccess(created, 201);


  } catch (error) {
    console.error('/api/invoices POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
