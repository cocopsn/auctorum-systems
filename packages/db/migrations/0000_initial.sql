-- ============================================================
-- Auctorum Systems — Motor de Cotizaciones B2B
-- Migration: 0000_initial.sql
-- 7 tablas: tenants, products, quotes, quote_items, users, quote_events, clients
-- ============================================================

-- tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  plan VARCHAR(20) DEFAULT 'basico',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  unit_price DECIMAL(12,2) NOT NULL,
  unit_type VARCHAR(50) DEFAULT 'pieza',
  image_url TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id) WHERE is_active = true;

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number SERIAL,
  tracking_token VARCHAR(32) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0.1600,
  tax_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_tracking ON quotes(tracking_token);

-- quote_items
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_type VARCHAR(50),
  line_total DECIMAL(12,2) NOT NULL
);

-- users (references Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- quote_events (analytics/tracking)
CREATE TABLE IF NOT EXISTS quote_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(30) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_quote ON quote_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON quote_events(tenant_id);

-- clients (CRM involuntario)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  total_quotes INTEGER DEFAULT 0,
  total_quoted_amount DECIMAL(14,2) DEFAULT 0,
  total_accepted INTEGER DEFAULT 0,
  total_accepted_amount DECIMAL(14,2) DEFAULT 0,
  last_quote_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Public: read active products for catalog
CREATE POLICY "products_select_active" ON products
  FOR SELECT USING (is_active = true);

-- Public: insert quotes (stateless portal)
CREATE POLICY "quotes_insert_public" ON quotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "quote_items_insert_public" ON quote_items
  FOR INSERT WITH CHECK (true);

-- Public: read quotes by tracking token
CREATE POLICY "quotes_select_by_token" ON quotes
  FOR SELECT USING (tracking_token IS NOT NULL);

-- Public: insert events (tracking)
CREATE POLICY "quote_events_insert_public" ON quote_events
  FOR INSERT WITH CHECK (true);

-- Public: insert clients (CRM upsert from quote flow)
CREATE POLICY "clients_insert_public" ON clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "clients_update_public" ON clients
  FOR UPDATE USING (true);

-- Authenticated: CRUD own tenant data
CREATE POLICY "tenants_select_public" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "products_select_tenant" ON products
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "products_insert_tenant" ON products
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "products_update_tenant" ON products
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "quotes_select_tenant" ON quotes
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "quote_events_select_tenant" ON quote_events
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "clients_select_tenant" ON clients
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "tenants_update_owner" ON tenants
  FOR UPDATE USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
