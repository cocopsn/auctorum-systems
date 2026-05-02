-- Stripe Connect — patients pay doctors directly, Auctorum keeps an
-- application_fee on each transaction. Each tenant gets its own Stripe
-- Express account; we just store the account id + status.
--
-- Note: existing `payments` table is for the doctor's own bookkeeping
-- (cash, manual transfers, MercadoPago, etc.). Patient_payments is a
-- separate table dedicated to Stripe Connect destination charges so we
-- don't pollute the existing accounting flow.

-- ─── tenants — Stripe Connect onboarding state ───
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_account_id   VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_status       VARCHAR(20) DEFAULT 'none';
-- none|pending|active|restricted|disabled
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_connect
  ON tenants(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- ─── patient_payments — Stripe Connect destination charges ───
CREATE TABLE IF NOT EXISTS patient_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  -- Stripe identifiers
  stripe_checkout_session_id VARCHAR(100),
  stripe_payment_intent_id   VARCHAR(100),
  stripe_charge_id           VARCHAR(100),
  -- Money (centavos MXN)
  amount          INTEGER NOT NULL,
  application_fee INTEGER NOT NULL DEFAULT 0, -- Auctorum's cut, in centavos
  currency VARCHAR(3) NOT NULL DEFAULT 'mxn',
  -- Status: pending | processing | succeeded | failed | refunded | cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Snapshot data
  description     TEXT,
  patient_name    VARCHAR(255),
  patient_email   VARCHAR(255),
  payment_method  VARCHAR(50),  -- card | oxxo | etc.
  receipt_url     TEXT,
  failure_reason  TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_payments_tenant
  ON patient_payments(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_payments_session
  ON patient_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_payments_intent
  ON patient_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_payments_appointment
  ON patient_payments(appointment_id);

ALTER TABLE patient_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_payments_tenant ON patient_payments;
CREATE POLICY patient_payments_tenant ON patient_payments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
