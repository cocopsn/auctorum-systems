import { NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ tenantId: auth.tenant.id })
  } catch (err: any) {
    console.error('Citas GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
