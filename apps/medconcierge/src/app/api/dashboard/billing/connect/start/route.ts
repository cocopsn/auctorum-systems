export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/billing/connect/start
 *
 * Begins (or resumes) Stripe Connect onboarding for the current tenant.
 *  - If the tenant has no account yet: creates one, stores the id, returns
 *    a fresh onboarding link.
 *  - If an account already exists but isn't fully active: returns a fresh
 *    onboarding link so the doctor can finish KYC.
 *
 * The doctor opens the returned URL and Stripe handles the entire form
 * (ID, banking, business info). On return we hit /status to refresh.
 */
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { hasFeature } from '@/lib/plan-gating'
import {
  createConnectAccount,
  createConnectOnboardingLink,
} from '@quote-engine/payments'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.auctorum.com.mx'
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Plan gate — Stripe Connect (patient → doctor payments) is Auctorum+.
  if (!hasFeature(auth.tenant.plan, 'stripe_connect')) {
    return NextResponse.json(
      {
        error: 'Stripe Connect requiere el Plan Auctorum.',
        code: 'PLAN_LIMIT',
        feature: 'stripe_connect',
      },
      { status: 402 },
    )
  }

  let accountId = auth.tenant.stripeConnectAccountId

  // Create the account if we don't have one yet
  if (!accountId) {
    try {
      const account = await createConnectAccount({
        email: auth.user.email,
        tenantId: auth.tenant.id,
        tenantName: auth.tenant.name,
      })
      accountId = account.id

      await db
        .update(tenants)
        .set({
          stripeConnectAccountId: account.id,
          stripeConnectStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, auth.tenant.id))
    } catch (err) {
      console.error('[stripe-connect] account create failed:', err)
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta de Stripe Connect' },
        { status: 502 },
      )
    }
  }

  // Generate a fresh onboarding link (these expire quickly)
  try {
    const link = await createConnectOnboardingLink({
      accountId: accountId!,
      refreshUrl: `${siteUrl()}/settings/subscription?connect=refresh`,
      returnUrl: `${siteUrl()}/settings/subscription?connect=success`,
    })
    return NextResponse.json({ url: link.url, accountId })
  } catch (err) {
    console.error('[stripe-connect] onboarding link failed:', err)
    return NextResponse.json(
      { error: 'No se pudo generar el link de onboarding' },
      { status: 502 },
    )
  }
}
