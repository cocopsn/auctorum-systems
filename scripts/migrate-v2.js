const postgres = require("postgres");

async function run() {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS portal_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        slug VARCHAR(100) DEFAULT 'home',
        title VARCHAR(255) NOT NULL,
        is_homepage BOOLEAN DEFAULT false,
        sections JSONB NOT NULL DEFAULT '[]'::jsonb,
        seo_title VARCHAR(255),
        seo_description TEXT,
        published BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        portal_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("portal_pages: OK");

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        metadata TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("notifications: OK");

    await sql.unsafe(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE`);
    console.log("reminder_sent: OK");

    await sql.end();
    console.log("MIGRATIONS COMPLETE");
  } catch (e) {
    console.error("Migration error:", e.message);
    await sql.end();
    process.exit(1);
  }
}

run();
