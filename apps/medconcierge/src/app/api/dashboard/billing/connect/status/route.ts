export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/billing/connect/status
 *
 * Refreshes the tenant's Connect status from Stripe and returns the
 * current state. Called from the settings page on mount and after the
 * doctor returns from Stripe's onboarding flow.
 */
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { getConnectAccountStatus } from '@quote-engine/payments'

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const accountId = auth.tenant.stripeConnectAccountId
  if (!accountId) {
    return NextResponse.json({
      connected: false,
      status: 'none',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    })
  }

  let info
  try {
    info = await getConnectAccountStatus(accountId)
  } catch (err) {
    console.error('[stripe-connect] retrieve failed:', err)
    return NextResponse.json(
      {
        connected: false,
        status: auth.tenant.stripeConnectStatus ?? 'pending',
        error: 'No se pudo consultar el estado de Stripe',
      },
      { status: 502 },
    )
  }

  // Persist status changes so the dashboard can show the badge without
  // hitting Stripe on every render.
  const wasActive = auth.tenant.stripeConnectStatus === 'active'
  if (info.status !== auth.tenant.stripeConnectStatus) {
    await db
      .update(tenants)
      .set({
        stripeConnectStatus: info.status,
        stripeConnectOnboardedAt: info.status === 'active' && !wasActive ? new Date() : auth.tenant.stripeConnectOnboardedAt,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, auth.tenant.id))
  }

  return NextResponse.json({
    connected: info.status === 'active',
    status: info.status,
    chargesEnabled: info.chargesEnabled,
    payoutsEnabled: info.payoutsEnabled,
    detailsSubmitted: info.detailsSubmitted,
    requirementsCurrentlyDue: info.requirementsCurrentlyDue,
  })
}
