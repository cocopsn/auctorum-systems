/**
 * Stripe Connect helpers — patients pay doctors directly.
 *
 * Auctorum is the platform; each tenant connects an Express account.
 * Patient payments are *destination charges* on the platform — Stripe
 * collects, withholds Auctorum's application_fee, and transfers the rest
 * to the connected account. Payouts to the doctor's bank are managed by
 * Stripe (typically T+2 days for MX).
 */
import { stripe } from './billing-stripe'

/** Default platform fee percentage (basis points = 5%). Tenant can override
 *  via `tenant.config.stripe_fee_percent`. */
export const DEFAULT_PLATFORM_FEE_PERCENT = 5

/** Minimum platform fee in centavos so we don't lose money on small charges. */
export const MIN_PLATFORM_FEE_CENTAVOS = 1000 // $10 MXN

/** Compute application_fee_amount for a given charge total. */
export function computeApplicationFee(
  amountCentavos: number,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): number {
  const pct = Math.max(0, Math.min(100, feePercent))
  const calculated = Math.round((amountCentavos * pct) / 100)
  return Math.max(calculated, MIN_PLATFORM_FEE_CENTAVOS)
}

interface CreateConnectAccountParams {
  email: string
  tenantId: string
  tenantName: string
}

/**
 * Create a new Stripe Connect Express account for a tenant.
 * Returns the Stripe account.
 */
export async function createConnectAccount({
  email,
  tenantId,
  tenantName,
}: CreateConnectAccountParams) {
  return stripe.accounts.create({
    type: 'express',
    country: 'MX',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      // OXXO is enabled per-PaymentIntent in MX, but we still request it
      // to avoid surprising errors if the doctor opts in later.
      oxxo_payments: { requested: true } as any,
    },
    business_type: 'individual',
    metadata: {
      tenant_id: tenantId,
      tenant_name: tenantName,
    },
  })
}

/**
 * Generate a one-time onboarding link the doctor opens to provide KYC,
 * banking, and ID details. Stripe handles the entire form.
 */
export async function createConnectOnboardingLink({
  accountId,
  refreshUrl,
  returnUrl,
}: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

/**
 * Generate a one-time login link to the Express dashboard. The doctor
 * uses this to see payouts, manage banking info, and download statements.
 */
export async function createConnectLoginLink(accountId: string) {
  return stripe.accounts.createLoginLink(accountId)
}

export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

/** Compute connect status from a retrieved account. */
export function deriveConnectStatus(account: {
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}): ConnectStatus {
  if (account.charges_enabled && account.payouts_enabled) return 'active'
  if (account.details_submitted) return 'restricted'
  return 'pending'
}

/** Retrieve an account and derive its status. */
export async function getConnectAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId)
  return {
    status: deriveConnectStatus({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    }),
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
  }
}

interface CreatePatientCheckoutParams {
  destinationAccountId: string  // tenant.stripeConnectAccountId
  tenantId: string
  tenantName: string
  amountCentavos: number
  applicationFeeCentavos: number
  description: string
  patientName?: string
  patientEmail?: string
  appointmentId?: string
  successUrl: string
  cancelUrl: string
}

/**
 * Create a Checkout Session for a patient → doctor payment.
 *
 * Uses *destination charge* + transfer_data.destination so the funds land
 * in the connected account after Auctorum keeps application_fee.
 *
 * Returns the Checkout Session, including its URL (`session.url`).
 */
export async function createPatientCheckoutSession(params: CreatePatientCheckoutParams) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'oxxo'] as any,
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: params.description.slice(0, 100),
            description: `${params.tenantName}${params.patientName ? ' — ' + params.patientName : ''}`.slice(0, 250),
          },
          unit_amount: params.amountCentavos,
        },
        quantity: 1,
      },
    ],
    customer_email: params.patientEmail,
    payment_intent_data: {
      application_fee_amount: params.applicationFeeCentavos,
      transfer_data: { destination: params.destinationAccountId },
      metadata: {
        type: 'patient_payment',
        tenant_id: params.tenantId,
        appointment_id: params.appointmentId ?? '',
        patient_name: params.patientName ?? '',
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      type: 'patient_payment',
      tenant_id: params.tenantId,
      appointment_id: params.appointmentId ?? '',
    },
  })
}
