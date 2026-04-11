import { NextRequest, NextResponse } from 'next/server'
import { db } from '@quote-engine/db'
import { sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const budgetStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'paid', 'cancelled'], {
    errorMap: () => ({ message: 'Estado invalido. Valores permitidos: pending, approved, paid, cancelled' }),
  }),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = budgetStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { status } = parsed.data

    const result = await db.execute(
      sql`UPDATE budgets SET status = ${status}, updated_at = NOW() WHERE id = ${params.id} AND tenant_id = ${auth.tenant.id} RETURNING *`
    )

    if ((result as any[]).length === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ budget: (result as any[])[0] })
  } catch (err: any) {
    console.error('Budget status PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
