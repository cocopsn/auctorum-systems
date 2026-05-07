-- Conversations now store an `external_id` to identify the upstream party in
-- channels where there's no phone number, like Instagram DMs (Page-Scoped
-- User ID, "PSID"). For WhatsApp the external_id can stay NULL — `clientId`
-- + the client's phone is enough.
--
-- Together with (tenant_id, channel) the external_id forms a UNIQUE key for
-- idempotent webhook upserts: re-delivery of the same message just hits the
-- existing conversation row instead of creating a duplicate thread.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_tenant_channel_extid
  ON conversations (tenant_id, channel, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_channel
  ON conversations (channel);

-- Same expression-index trick as for meta_ads / google_ads: lookup tenant by
-- IG page id without scanning the full integrations table.
CREATE INDEX IF NOT EXISTS integrations_instagram_dm_page_idx
  ON integrations ((config->>'pageId'))
  WHERE type = 'instagram_dm';
