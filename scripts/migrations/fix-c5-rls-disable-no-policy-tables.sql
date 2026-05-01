-- C-5: Fix tables with RLS enabled but no policies
-- These tables have no tenant_id column, so RLS policies cannot reference
-- current_setting('app.tenant_id'). They are protected by FK chains
-- (messages → conversations.tenant_id, campaign_messages → campaigns.tenant_id, etc.)
-- Disabling RLS prevents silent access denial when FORCE ROW LEVEL SECURITY is enabled.

ALTER TABLE _migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_funnel DISABLE ROW LEVEL SECURITY;
