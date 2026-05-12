-- 0061_secretaria_role.sql
--
-- Add `secretaria` as a valid users.role value. Pre-2026-05-12 the
-- column was a free-form varchar(20); we now CHECK-constrain it so a
-- typo or SQL injection past app validation can't insert an
-- unrecognized role that quietly bypasses all permission checks.
--
-- The set: admin, secretaria, operator, viewer, super_admin. Matches
-- TENANT_ROLES in apps/medconcierge/src/app/api/dashboard/settings/team/route.ts.

-- Drop existing constraint if any (idempotent re-apply).
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- Re-add with the new allowed set.
ALTER TABLE users ADD CONSTRAINT chk_users_role
  CHECK (role IN ('admin', 'secretaria', 'operator', 'viewer', 'super_admin'));

-- Index that the team page uses to list members by role.
CREATE INDEX IF NOT EXISTS idx_users_tenant_role
  ON users (tenant_id, role)
  WHERE is_active = true;
