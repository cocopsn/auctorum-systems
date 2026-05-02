export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/patient-payments/checkout
 *
 * Doctor-side: generates a Stripe Checkout URL for a patient payment and
 * (optionally) sends it to the patient via WhatsApp. The doctor's tenant
 * must have an active Stripe Connect account.
 *
 * Body:
 *   - amount: centavos MXN (>= 1000 = $10 MXN minimum)
 *   - description: e.g. "Consulta general"
 *   - patientName?: optional snapshot
 *   - patientEmail?: optional, used for receipt
 *   - patientPhone?: if present + sendWhatsApp=true, sends the link
 *   - patientId?: optional, links payment to a patient row
 *   - appointmentId?: optional, links payment to an appointment
 *   - sendWhatsApp?: boolean — also send the link via WhatsApp
 *
 * Returns: { checkoutUrl, paymentId, sentViaWhatsApp }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, tenants, patientPayments } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import {
  computeApplicationFee,
  createPatientCheckoutSession,
  DEFAULT_PLATFORM_FEE_PERCENT,
} from '@quote-engine/payments'

const bodySchema = z.object({
  amount: z.number().int().min(1000, 'Mínimo $10 MXN'),
  description: z.string().min(1).max(200),
  patientName: z.string().max(255).optional(),
  patientEmail: z.string().email().optional(),
  patientPhone: z.string().max(50).optional(),
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  sendWhatsApp: z.boolean().optional(),
})

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.auctorum.com.mx'
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Tenant must have an active Connect account
  if (!auth.tenant.stripeConnectAccountId || auth.tenant.stripeConnectStatus !== 'active') {
    return NextResponse.json(
      {
        error:
          'Antes de cobrar pagos en línea, conecta tu cuenta de Stripe en Configuración → Suscripción.',
        code: 'CONNECT_NOT_READY',
      },
      { status: 400 },
    )
  }

  let parsed
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Datos inválidos' },
      { status: 400 },
    )
  }

  // Compute application fee from tenant config (or default 5%)
  const config = (auth.tenant.config ?? {}) as Partial<TenantConfig> & {
    stripe_fee_percent?: number
  }
  const feePercent =
    typeof config.stripe_fee_percent === 'number'
      ? config.stripe_fee_percent
      : DEFAULT_PLATFORM_FEE_PERCENT
  const applicationFee = computeApplicationFee(parsed.amount, feePercent)

  // Create the Checkout session
  let session
  try {
    session = await createPatientCheckoutSession({
      destinationAccountId: auth.tenant.stripeConnectAccountId,
      tenantId: auth.tenant.id,
      tenantName: auth.tenant.name,
      amountCentavos: parsed.amount,
      applicationFeeCentavos: applicationFee,
      description: parsed.description,
      patientName: parsed.patientName,
      patientEmail: parsed.patientEmail,
      appointmentId: parsed.appointmentId,
      successUrl: `${siteUrl()}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}/pago-cancelado`,
    })
  } catch (err) {
    console.error('[patient-payments] checkout failed:', err)
    return NextResponse.json(
      { error: 'No se pudo crear la sesión de pago' },
      { status: 502 },
    )
  }

  // Persist the payment row
  const [row] = await db
    .insert(patientPayments)
    .values({
      tenantId: auth.tenant.id,
      patientId: parsed.patientId ?? null,
      appointmentId: parsed.appointmentId ?? null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amount: parsed.amount,
      applicationFee,
      currency: 'mxn',
      status: 'pending',
      description: parsed.description,
      patientName: parsed.patientName ?? null,
      patientEmail: parsed.patientEmail ?? null,
    })
    .returning()

  // Optionally send via WhatsApp
  let sentViaWhatsApp = false
  if (parsed.sendWhatsApp && parsed.patientPhone && session.url) {
    try {
      const greeting = parsed.patientName ? `Hola ${parsed.patientName},` : 'Hola,'
      const amountFmt = (parsed.amount / 100).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
      })
      const msg =
        `${greeting} aquí tu link de pago seguro de ${amountFmt} para "${parsed.description}".\n\n` +
        `${session.url}\n\n` +
        `— ${auth.tenant.name}`
      sentViaWhatsApp = await sendWhatsAppMessage(parsed.patientPhone, msg)
    } catch (err) {
      console.error('[patient-payments] whatsapp send failed (non-blocking):', err)
    }
  }

  return NextResponse.json({
    success: true,
    paymentId: row.id,
    checkoutUrl: session.url,
    applicationFee,
    sentViaWhatsApp,
  })
}
