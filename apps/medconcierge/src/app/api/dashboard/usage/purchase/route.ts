export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { getAddonPackage } from '@quote-engine/ai'
import { createMPPreference } from '@quote-engine/payments'

const bodySchema = z.object({
  addonId: z.string().min(1).max(40),
  processor: z.enum(['mercadopago']).default('mercadopago'),
})

/**
 * POST /api/dashboard/usage/purchase
 *
 * Body: { addonId: string, processor?: 'mercadopago' }
 *
 * Creates a checkout preference (MercadoPago primary; Stripe to be added)
 * and returns the redirect URL. On a successful payment the
 * /api/webhooks/mercadopago handler must call `creditAddon()` to
 * actually grant the units.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
    }
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const pkg = getAddonPackage(parsed.data.addonId)
    if (!pkg) return NextResponse.json({ error: 'Unknown addon package' }, { status: 404 })

    const portal = 'https://portal.auctorum.com.mx'
    const tenantId = auth.tenant.id

    // MercadoPago path (primary). Stripe is a follow-up.
    const preference = await createMPPreference({
      tenantId,
      planId: `addon-${pkg.id}`,
      planName: pkg.name,
      amount: pkg.price / 100, // MP expects pesos
      payerEmail: auth.user.email,
      successUrl: `${portal}/settings/subscription?addon=success&pkg=${pkg.id}`,
      failureUrl: `${portal}/settings/subscription?addon=failed&pkg=${pkg.id}`,
      pendingUrl: `${portal}/settings/subscription?addon=pending&pkg=${pkg.id}`,
      webhookUrl: `${portal}/api/webhooks/mercadopago`,
    })

    const checkoutUrl =
      (preference as { init_point?: string; sandbox_init_point?: string }).init_point ??
      (preference as { sandbox_init_point?: string }).sandbox_init_point ??
      null
    if (!checkoutUrl) {
      throw new Error('MercadoPago preference did not return init_point')
    }

    return NextResponse.json({
      checkoutUrl,
      processor: 'mercadopago' as const,
      package: { id: pkg.id, name: pkg.name, price: pkg.price, quantity: pkg.quantity, type: pkg.type },
    })
  } catch (err) {
    console.error('[POST /api/dashboard/usage/purchase] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
