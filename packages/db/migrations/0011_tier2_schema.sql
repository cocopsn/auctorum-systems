-- Migration 0011: Tier 2 schema changes
-- Feature 1: Funnel stages seeding + clients.funnel_stage_id
-- Feature 3: User roles expansion
-- Feature 5: Budgets table

-- ============================================================
-- FEATURE 1: Seed default funnel stages for existing tenants
-- ============================================================
INSERT INTO funnel_stages (tenant_id, name, position, color)
SELECT t.id, s.name, s.position, s.color
FROM tenants t
CROSS JOIN (VALUES
  ('Nuevo contacto', 0, '#3B82F6'),
  ('Interesado', 1, '#F59E0B'),
  ('Cita agendada', 2, '#8B5CF6'),
  ('Confirmada', 3, '#06B6D4'),
  ('Atendido', 4, '#10B981'),
  ('Seguimiento', 5, '#F97316'),
  ('Perdido', 6, '#EF4444')
) AS s(name, position, color)
WHERE NOT EXISTS (SELECT 1 FROM funnel_stages fs WHERE fs.tenant_id = t.id)
ON CONFLICT DO NOTHING;

-- Add funnel_stage_id to clients if not exists
ALTER TABLE clients ADD COLUMN IF NOT EXISTS funnel_stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL;

-- ============================================================
-- FEATURE 3: User roles expansion
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID;

-- ============================================================
-- FEATURE 5: Budgets table
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  folio VARCHAR(20),
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(tenant_id, status);

-- Add budget_sequence to tenants for auto-folio
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS budget_sequence INTEGER DEFAULT 0;
