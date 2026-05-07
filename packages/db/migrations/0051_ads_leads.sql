-- Ads → Leads → CRM. Captura leads de Facebook/Instagram Lead Ads y Google
-- Ads Lead Extensions, los persiste con su origen y metadata UTM, y deja al
-- worker auto-contactarlos por WhatsApp en los primeros minutos (la velocidad
-- es lo que mueve la tasa de conversión en lead ads médicos).
--
-- El status sigue el pipeline visual:
--   new → contacted → responded → appointed → converted
--                                         \→ lost (cualquier punto)

CREATE TABLE IF NOT EXISTS ad_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  source          VARCHAR(20) NOT NULL,
  -- 'facebook' | 'instagram' | 'google' | 'manual' | 'website'
  campaign_name   VARCHAR(255),
  ad_name         VARCHAR(255),
  form_id         VARCHAR(100),

  name            VARCHAR(255),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  message         TEXT,

  status          VARCHAR(20) NOT NULL DEFAULT 'new',
  -- new | contacted | responded | appointed | converted | lost

  whatsapp_sent     BOOLEAN     DEFAULT false,
  whatsapp_sent_at  TIMESTAMPTZ,

  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES patients(id)     ON DELETE SET NULL,

  raw_data        JSONB DEFAULT '{}',
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON ad_leads (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_phone         ON ad_leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_source ON ad_leads (tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON ad_leads (tenant_id, created_at DESC);

ALTER TABLE ad_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_tenant_isolation ON ad_leads;
CREATE POLICY leads_tenant_isolation ON ad_leads
  USING      (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION ad_leads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ad_leads_updated_at ON ad_leads;
CREATE TRIGGER trg_ad_leads_updated_at
  BEFORE UPDATE ON ad_leads
  FOR EACH ROW
  EXECUTE FUNCTION ad_leads_set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- Lookup index for Google Ads webhook auth: every webhook arrives with a token
-- in the header; the route resolves the tenant via integrations.config.
-- This expression index makes the lookup O(log n) bound to google_ads rows.
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS integrations_google_ads_token_idx
  ON integrations ((config->>'webhookToken'))
  WHERE type = 'google_ads';

-- Same idea for Meta Ads (page_id resolution to find the tenant)
CREATE INDEX IF NOT EXISTS integrations_meta_ads_page_idx
  ON integrations ((config->>'pageId'))
  WHERE type = 'meta_ads';
