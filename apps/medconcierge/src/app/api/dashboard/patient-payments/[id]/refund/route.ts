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
import { can } from '@/lib/permissions'
import { validateOrigin } from '@/lib/csrf'
import { stripe } from '@quote-engine/payments'

type RouteCtx = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Capability gate. `payments.refund` is admin-only by default — a
  // secretaria can record cash payments but reversing money via Stripe
  // Connect needs the responsible party. See lib/permissions.ts for
  // the full matrix.
  if (!can(auth.user.role, 'payments.refund')) {
    return NextResponse.json(
      { error: 'No tienes permiso para procesar reembolsos. Pide al administrador del consultorio.' },
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
