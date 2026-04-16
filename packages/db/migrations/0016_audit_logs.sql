CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NOT NULL,
  before JSONB DEFAULT '{}'::jsonb,
  after JSONB DEFAULT '{}'::jsonb,
  ip VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant ON audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);
