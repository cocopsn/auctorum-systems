export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/billing/connect/dashboard
 *
 * Returns a one-time login link for the doctor's Stripe Express dashboard.
 * The doctor uses this to manage banking, see payouts, and download
 * statements directly on Stripe's UI (we never see those screens).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { createConnectLoginLink } from '@quote-engine/payments'

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const accountId = auth.tenant.stripeConnectAccountId
  if (!accountId) {
    return NextResponse.json(
      { error: 'No tienes una cuenta de Stripe conectada todavía' },
      { status: 400 },
    )
  }

  try {
    const link = await createConnectLoginLink(accountId)
    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error('[stripe-connect] login link failed:', err)
    return NextResponse.json(
      { error: 'No se pudo generar el link al dashboard de Stripe' },
      { status: 502 },
    )
  }
}
