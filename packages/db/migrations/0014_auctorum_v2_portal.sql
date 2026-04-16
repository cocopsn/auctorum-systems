ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_type varchar(20) NOT NULL DEFAULT 'industrial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS public_subdomain varchar(120);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS public_subdomain_prefix varchar(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS provisioning_status varchar(20) NOT NULL DEFAULT 'draft';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS provisioned_at timestamptz;

ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS vertical jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden_widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  widget_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_landing_module varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_dashboard_preferences_user_tenant
  ON user_dashboard_preferences(user_id, tenant_id);

CREATE TABLE IF NOT EXISTS bot_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel varchar(50) NOT NULL,
  provider varchar(50) NOT NULL,
  external_bot_id varchar(255),
  external_phone_number_id varchar(255),
  status varchar(30) NOT NULL DEFAULT 'draft',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bot_instances_tenant_channel_provider
  ON bot_instances(tenant_id, channel, provider);
