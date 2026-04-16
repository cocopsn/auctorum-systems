-- Migration 0012: Tier 3 schema changes
-- Features: Payments config, Invoices config, Integrations, Campaigns enhance, Channels, 2FA, Subscriptions

-- ============================================================
-- FEATURE 1: Payments — add missing columns + tenant config
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processor_payment_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{
  "mercadopago_access_token": "",
  "stripe_secret_key": "",
  "active_processor": "manual",
  "currency": "MXN"
}'::jsonb;

-- ============================================================
-- FEATURE 2: Invoices — add missing columns + tenant config
-- ============================================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS iva DECIMAL(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cfdi_uuid VARCHAR(36);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_config JSONB DEFAULT '{
  "enabled": false,
  "facturapi_key": "",
  "rfc_emisor": "",
  "razon_social_emisor": "",
  "regimen_fiscal_emisor": "",
  "codigo_postal_emisor": ""
}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_sequence INTEGER DEFAULT 0;

-- ============================================================
-- FEATURE 3: Integrations table
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS integrations_tenant_type ON integrations(tenant_id, type);

-- ============================================================
-- FEATURE 4: Campaigns — add missing columns
-- ============================================================
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_body TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS messages_failed INTEGER DEFAULT 0;

-- ============================================================
-- FEATURE 5: Channels config on tenants
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS channels_config JSONB DEFAULT '{
  "whatsapp": {"enabled": true, "configured": false},
  "telegram": {"enabled": false, "bot_token": ""},
  "facebook": {"enabled": false, "page_token": ""},
  "instagram": {"enabled": false, "access_token": ""},
  "webchat": {"enabled": false, "widget_color": "#6366f1"},
  "phone": {"enabled": false, "twilio_sid": "", "twilio_token": "", "twilio_number": ""},
  "sms": {"enabled": false, "twilio_sid": "", "twilio_token": "", "twilio_number": ""}
}'::jsonb;

-- ============================================================
-- FEATURE 6: 2FA columns on users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMPTZ;

-- ============================================================
-- FEATURE 7: Subscriptions table + seed
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'MXN',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_method VARCHAR(50),
  processor_subscription_id VARCHAR(255),
  grace_period_days INTEGER DEFAULT 3,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscriptions (tenant_id, plan, status, amount, current_period_start, current_period_end)
SELECT id, 'free', 'active', 0, NOW(), NOW() + INTERVAL '100 years'
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
