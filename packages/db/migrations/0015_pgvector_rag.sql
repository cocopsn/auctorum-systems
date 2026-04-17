-- CREATE EXTENSION IF NOT EXISTS vector; 
-- Must be run as superuser in Supabase/PostgreSQL

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS ix_knowledge_base_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS ix_knowledge_base_tenant ON knowledge_base (tenant_id);

-- Enforce Row Level Security
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolated Tenant Knowledge Base"
  ON knowledge_base
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
