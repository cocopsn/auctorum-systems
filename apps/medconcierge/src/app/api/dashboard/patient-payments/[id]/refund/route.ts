export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/patient-payments/[id]/refund
 *
 * Refunds a Stripe Connect destination charge:
 *  - reverse_transfer: true  → reverses the funds that went to the doctor
 *  - refund_application_fee: true → also refunds Auctorum's commission
 *
 * Updates the patient_payments row to status='refunded'.
 * Restricted to status='succeeded' rows only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, patientPayments, auditLog } from '@quote-engine/db'
import { getAuthTenant, requireRole } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { stripe } from '@quote-engine/payments'

type RouteCtx = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Role gate: refunds move real money (Stripe Connect reverse_transfer +
  // refund_application_fee). Pre-2026-05-11 any authed user including
  // viewer could call this — fraud-internal vector. Restrict to admin.
  const adminAuth = await requireRole(['admin'])
  if (!adminAuth) {
    return NextResponse.json(
      { error: 'Solo administradores pueden procesar reembolsos' },
      { status: 403 },
    )
  }

  const [payment] = await db
    .select()
    .from(patientPayments)
    .where(and(eq(patientPayments.id, params.id), eq(patientPayments.tenantId, auth.tenant.id)))
    .limit(1)

  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }
  if (payment.status !== 'succeeded') {
    return NextResponse.json(
      { error: 'Solo se pueden reembolsar pagos exitosos', code: 'NOT_REFUNDABLE' },
      { status: 400 },
    )
  }
  if (!payment.stripePaymentIntentId) {
    return NextResponse.json(
      { error: 'Este pago no tiene PaymentIntent registrado' },
      { status: 400 },
    )
  }

  let refund
  try {
    refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reverse_transfer: true,         // pull funds back from the doctor's account
      refund_application_fee: true,   // also refund Auctorum's cut
      metadata: {
        tenant_id: auth.tenant.id,
        payment_id: payment.id,
        refunded_by: auth.user.id,
      },
    })
  } catch (err) {
    console.error('[refund] stripe error:', err)
    const msg = err instanceof Error ? err.message : 'No se pudo procesar el reembolso'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await db
    .update(patientPayments)
    .set({ status: 'refunded', updatedAt: new Date() })
    .where(eq(patientPayments.id, payment.id))

  await auditLog({
    tenantId: auth.tenant.id,
    userId: auth.user.id,
    action: 'payment.refund',
    entity: `patient_payment:${payment.id}`,
    after: {
      amount: payment.amount,
      applicationFee: payment.applicationFee,
      refundId: refund.id,
    },
  })

  return NextResponse.json({
    success: true,
    refundId: refund.id,
    status: 'refunded',
  })
}
