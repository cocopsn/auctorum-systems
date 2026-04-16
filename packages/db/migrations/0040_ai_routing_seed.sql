-- 0040_ai_routing_seed.sql
-- Seed routing rows so WhatsApp webhook can resolve incoming messages to a tenant.
-- 100% additive: no ALTER, no new columns. Uses existing bot_instances + integrations schemas.
--
-- Phone number: 1012278385310095 (Meta phone_number_id for dra-martinez shared number)
-- Business id:  998012925883489 (Meta business id)

-- 1) bot_instances row — future-proof routing (not yet used by webhook, reserved for 3-mode impl)
INSERT INTO bot_instances (tenant_id, channel, provider, external_phone_number_id, status, config)
SELECT
  t.id,
  'whatsapp',
  'meta',
  '1012278385310095',
  'active',
  jsonb_build_object(
    'channel_mode', 'shared',
    'external_business_id', '998012925883489'
  )
FROM tenants t
WHERE t.slug = 'dra-martinez'
ON CONFLICT (tenant_id, channel, provider) DO UPDATE SET
  external_phone_number_id = EXCLUDED.external_phone_number_id,
  status = EXCLUDED.status,
  config = EXCLUDED.config,
  updated_at = NOW();

-- 2) integrations row — used today by webhook resolveTenant (type='meta', config->>phone_number_id)
-- status must be one of: connected, disconnected, error (CHECK constraint).
INSERT INTO integrations (tenant_id, type, config, status)
SELECT
  t.id,
  'meta',
  jsonb_build_object(
    'phone_number_id', '1012278385310095',
    'business_id', '998012925883489',
    'channel_mode', 'shared'
  ),
  'connected'
FROM tenants t
WHERE t.slug = 'dra-martinez'
ON CONFLICT (tenant_id, type) DO UPDATE SET
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  updated_at = NOW();
