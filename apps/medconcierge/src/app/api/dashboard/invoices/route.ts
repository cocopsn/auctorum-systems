export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, invoices, clients, tenants } from '@quote-engine/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// ---------------------------------------------------------------------------
// GET /api/dashboard/invoices
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');

  // Build conditions
  const conditions: any[] = [eq(invoices.tenantId, auth.tenant.id)];

  if (status) conditions.push(eq(invoices.status, status));
  if (search) {
    conditions.push(
      sql`(
        ${invoices.rfc} ILIKE ${`%${search}%`}
        OR ${invoices.razonSocial} ILIKE ${`%${search}%`}
        OR ${invoices.folio} ILIKE ${`%${search}%`}
        OR ${invoices.email} ILIKE ${`%${search}%`}
      )`,
    );
  }

  const rows = await db
    .select({
      id: invoices.id,
      folio: invoices.folio,
      client_id: invoices.clientId,
      patient_id: invoices.patientId,
      payment_id: invoices.paymentId,
      rfc: invoices.rfc,
      razon_social: invoices.razonSocial,
      email: invoices.email,
      uso_cfdi: invoices.usoCfdi,
      regimen_fiscal: invoices.regimenFiscal,
      cp_zip: invoices.cpZip,
      subtotal: invoices.subtotal,
      iva: invoices.iva,
      total: invoices.total,
      status: invoices.status,
      cfdi_xml_url: invoices.cfdiXmlUrl,
      pdf_url: invoices.pdfUrl,
      cfdi_uuid: invoices.cfdiUuid,
      error_message: invoices.errorMessage,
      stamped_at: invoices.stampedAt,
      created_at: invoices.createdAt,
      client_name: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  // KPIs
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [kpis] = await db
    .select({
      facturado_month: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'stamped' AND ${invoices.createdAt} >= ${monthStart} THEN ${invoices.total} ELSE 0 END), 0)`,
      stamped_count: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'stamped' THEN 1 END)`,
      pending_count: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'pending' THEN 1 END)`,
      total_all_time: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'stamped' THEN ${invoices.total} ELSE 0 END), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.tenantId, auth.tenant.id));

  return NextResponse.json({
    invoices: rows,
    kpis: {
      facturadoMonth: Number(kpis.facturado_month),
      stampedCount: Number(kpis.stamped_count),
      pendingCount: Number(kpis.pending_count),
      totalAllTime: Number(kpis.total_all_time),
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/invoices
// ---------------------------------------------------------------------------
const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Descripcion requerida'),
  amount: z.number().positive('Monto debe ser positivo'),
});

const createInvoiceSchema = z.object({
  rfc: z
    .string()
    .min(12, 'RFC debe tener al menos 12 caracteres')
    .max(13, 'RFC debe tener maximo 13 caracteres'),
  razonSocial: z.string().min(1, 'Razon social requerida'),
  usoCfdi: z.string().default('G03'),
  regimenFiscal: z.string().min(1, 'Regimen fiscal requerido'),
  cpZip: z.string().length(5, 'Codigo postal debe tener 5 caracteres'),
  email: z.string().email('Email invalido'),
  clientId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Al menos un concepto es requerido'),
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

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Auto-generate folio
  const [seqResult] = await db.execute(
    sql`UPDATE tenants SET invoice_sequence = COALESCE(invoice_sequence, 0) + 1 WHERE id = ${auth.tenant.id} RETURNING invoice_sequence`,
  );
  const seq = Number(seqResult.invoice_sequence);
  const folio = `FAC-${String(seq).padStart(4, '0')}`;

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const iva = Math.round(subtotal * 0.16 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;

  const [invoice] = await db
    .insert(invoices)
    .values({
      tenantId: auth.tenant.id,
      clientId: data.clientId ?? null,
      patientId: data.patientId ?? null,
      paymentId: data.paymentId ?? null,
      folio,
      rfc: data.rfc.toUpperCase(),
      razonSocial: data.razonSocial,
      usoCfdi: data.usoCfdi,
      regimenFiscal: data.regimenFiscal,
      cpZip: data.cpZip,
      email: data.email,
      subtotal: String(subtotal),
      iva: String(iva),
      total: String(total),
      status: 'pending',
    })
    .returning();

  return NextResponse.json({ invoice }, { status: 201 });
}
