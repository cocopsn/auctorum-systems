import { NextResponse } from 'next/server'
import { db, onboardingProgress } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [row] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      .limit(1)

    const initialSteps = row?.stepsJson ?? {}
    const completedAt = row?.completedAt ? row.completedAt.toISOString() : null

    const tenantCreatedAt = auth.tenant.createdAt
    const showWelcome =
      tenantCreatedAt !== null &&
      tenantCreatedAt.getTime() > Date.now() - 24 * 60 * 60 * 1000

    return NextResponse.json({
      initialSteps,
      completedAt,
      tenantName: auth.tenant.name,
      userName: auth.user.name,
      showWelcome,
    })
  } catch (err: any) {
    console.error('Onboarding detail GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
