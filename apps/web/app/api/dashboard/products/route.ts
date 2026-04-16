import { NextResponse } from 'next/server'
import { db, products } from '@quote-engine/db'
import { eq, and, asc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, auth.tenant.id), eq(products.isActive, true)))
      .orderBy(asc(products.sortOrder), asc(products.name))

    return NextResponse.json({ products: tenantProducts, tenantSlug: auth.tenant.slug })
  } catch (err: any) {
    console.error('Products GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
