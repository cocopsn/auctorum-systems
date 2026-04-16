-- 0041_dra_martinez_tenant_type.sql
-- Marks dra-martinez as a medical tenant so the system prompt builder
-- picks the MEDICAL_TEMPLATE reliably (instead of relying on slug heuristic).
-- Idempotent: safe to re-run.
UPDATE tenants
SET tenant_type = 'medical'
WHERE slug = 'dra-martinez'
  AND tenant_type IS DISTINCT FROM 'medical';
