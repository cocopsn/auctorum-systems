import { NextRequest, NextResponse } from 'next/server'
import { db } from '@quote-engine/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { validateForeignIds, CrossTenantError } from '@/lib/tenant-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    let query = status !== 'all'
      ? sql`SELECT b.*, c.name as client_name, p.name as patient_name FROM budgets b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN patients p ON b.patient_id = p.id WHERE b.tenant_id = ${auth.tenant.id} AND b.status = ${status} ORDER BY b.created_at DESC`
      : sql`SELECT b.*, c.name as client_name, p.name as patient_name FROM budgets b LEFT JOIN clients c ON b.client_id = c.id LEFT JOIN patients p ON b.patient_id = p.id WHERE b.tenant_id = ${auth.tenant.id} ORDER BY b.created_at DESC`

    const data = await db.execute(query)

    return NextResponse.json({ budgets: data })
  } catch (err: any) {
    console.error('Budgets GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const itemSchema = z.object({
  name: z.string().min(1).max(255),
  qty: z.number().positive(),
  price: z.number().min(0),
})

const createSchema = z.object({
  clientId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1),
  notes: z.string().max(2000).optional(),
  validUntil: z.string().optional(),
})

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { items, notes, validUntil, clientId, patientId } = parsed.data

    // Validate FK ownership before insert. Pre-2026-05-10 we trusted the
    // body and inserted whatever clientId/patientId UUID came in,
    // allowing cross-tenant FK injection (analytics breakage, audit
    // trail confusion, eventual data quality issues).
    try {
      await validateForeignIds(auth.tenant.id, [
        { kind: 'client', id: clientId },
        { kind: 'patient', id: patientId },
      ])
    } catch (err) {
      if (err instanceof CrossTenantError) return NextResponse.json({ error: `${err.entity} no encontrado` }, { status: 404 })
      throw err
    }

    // Auto-generate folio
    const [seqResult] = await db.execute(
      sql`UPDATE tenants SET budget_sequence = COALESCE(budget_sequence, 0) + 1 WHERE id = ${auth.tenant.id} RETURNING budget_sequence`
    ) as any[]
    const seq = seqResult?.budget_sequence || 1
    const folio = `PRE-${String(seq).padStart(4, '0')}`

    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
    const tax = Math.round(subtotal * 0.16 * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100

    const [created] = await db.execute(
      sql`INSERT INTO budgets (tenant_id, client_id, patient_id, folio, items, subtotal, tax, total, notes, valid_until, status)
          VALUES (${auth.tenant.id}, ${clientId || null}, ${patientId || null}, ${folio}, ${JSON.stringify(items)}::jsonb, ${subtotal}, ${tax}, ${total}, ${notes || null}, ${validUntil || null}, 'pending')
          RETURNING *`
    ) as any[]

    return NextResponse.json({ budget: created })
  } catch (err: any) {
    console.error('Budgets POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
