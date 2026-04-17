-- AI Concierge manager tables
CREATE TABLE IF NOT EXISTS ai_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  openai_file_id VARCHAR(255) NOT NULL,
  vector_store_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes NUMERIC(14, 0) NOT NULL,
  status VARCHAR(30) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_files_tenant ON ai_knowledge_files(tenant_id);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  channel VARCHAR(30) NOT NULL DEFAULT 'playground',
  prompt TEXT NOT NULL,
  response_summary TEXT,
  model VARCHAR(100) NOT NULL,
  response_id VARCHAR(255),
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_tenant ON ai_usage_events(tenant_id);
