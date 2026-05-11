-- 0056_rls_tenant_policies.sql
--
-- Backfill `app.tenant_id`-based RLS policies on the 9 tables that were
-- missing them. Combined with the new tenantScopedDb / withAuthAndTenant
-- wrappers in apps/medconcierge/src/lib/auth.ts (P1-1 audit fix), this
-- provides a defense-in-depth tier under the application-level
-- `eq(table.tenant_id, ...)` filters.
--
-- The connection still uses the `postgres` role (rolbypassrls=true) so
-- application traffic isn't affected by these policies today. The
-- policies become load-bearing the day we either: (a) split the
-- connection into an authenticated-role pool, or (b) any non-bypass role
-- queries these tables. Either way the cost of adding them now is
-- zero and the cost of NOT having them is "the day we flip, things
-- silently break with no rows returned".

DO $$
BEGIN
  -- ad_leads
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ad_leads_tenant_isolation') THEN
    CREATE POLICY ad_leads_tenant_isolation ON ad_leads
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- data_deletion_requests (tenant_id is nullable for meta-source rows
  -- before they're resolved to a tenant; allow the row if EITHER it has
  -- no tenant OR it matches the session tenant)
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ddr_tenant_isolation') THEN
    CREATE POLICY ddr_tenant_isolation ON data_deletion_requests
      USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- doctors
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'doctors_tenant_isolation') THEN
    CREATE POLICY doctors_tenant_isolation ON doctors
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- documents
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'documents_tenant_isolation') THEN
    CREATE POLICY documents_tenant_isolation ON documents
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- messages — no direct tenant_id; FK to conversations.tenant_id.
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'messages_tenant_isolation') THEN
    CREATE POLICY messages_tenant_isolation ON messages
      USING (
        conversation_id IN (
          SELECT id FROM conversations
          WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
        )
      );
  END IF;

  -- patient_communications
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'patient_communications_tenant_isolation') THEN
    CREATE POLICY patient_communications_tenant_isolation ON patient_communications
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- web_push_subscriptions
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'web_push_subscriptions_tenant_isolation') THEN
    CREATE POLICY web_push_subscriptions_tenant_isolation ON web_push_subscriptions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- campaign_messages — also needs RLS enabled (not just policy)
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'campaign_messages') THEN
    ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'campaign_messages_tenant_isolation') THEN
    CREATE POLICY campaign_messages_tenant_isolation ON campaign_messages
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  -- user_push_tokens (Expo push tokens) — also needs RLS enabled
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_push_tokens') THEN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_push_tokens') THEN
      ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'user_push_tokens_tenant_isolation') THEN
      EXECUTE 'CREATE POLICY user_push_tokens_tenant_isolation ON user_push_tokens
        USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';
    END IF;
  END IF;
END $$;
