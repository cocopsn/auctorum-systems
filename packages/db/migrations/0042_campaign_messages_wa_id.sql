-- Add whatsapp_message_id + tenant_id + denormalized phone/name to campaign_messages.
-- whatsapp_message_id lets the WhatsApp webhook match delivery/read status updates
-- back to the campaign_message row. tenant_id is denormalized for fast row-level
-- filtering. phone + recipient_name are denormalized so the worker can send without
-- joining clients on every iteration (and so we keep a record of what was sent
-- even if the client is later deleted).

ALTER TABLE campaign_messages
  ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS tenant_id           UUID,
  ADD COLUMN IF NOT EXISTS phone               VARCHAR(50),
  ADD COLUMN IF NOT EXISTS recipient_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message_body        TEXT;

-- Backfill tenant_id from campaigns (for existing rows, if any)
UPDATE campaign_messages cm
SET tenant_id = c.tenant_id
FROM campaigns c
WHERE cm.campaign_id = c.id
  AND cm.tenant_id IS NULL;

-- Index for webhook status lookups (one row per WA message id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_camp_msg_wa_id
  ON campaign_messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_camp_msg_tenant
  ON campaign_messages(tenant_id);
