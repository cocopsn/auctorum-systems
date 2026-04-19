export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// GET /api/dashboard/integrations
// List all integrations for the authenticated tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await db.execute(
      sql`SELECT * FROM integrations WHERE tenant_id = ${auth.tenant.id} ORDER BY created_at DESC`
    );

    return NextResponse.json({ integrations: result });
  } catch (error) {
    console.error('Error listing integrations:', error);
    return NextResponse.json(
      { error: 'Error al obtener integraciones' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/integrations
// Create or update (upsert) an integration for the tenant
const CreateIntegrationSchema = z.object({
  type: z.string().min(1).max(100),
  config: z.record(z.unknown()).optional().default({}),
});

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateIntegrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, config } = parsed.data;
    const configJson = JSON.stringify(config);

    const result = await db.execute(
      sql`INSERT INTO integrations (tenant_id, type, status, config, created_at, updated_at)
          VALUES (${auth.tenant.id}, ${type}, 'connected', ${configJson}::jsonb, NOW(), NOW())
          ON CONFLICT (tenant_id, type)
          DO UPDATE SET
            config = ${configJson}::jsonb,
            status = 'connected',
            updated_at = NOW()
          RETURNING *`
    );

    const [integration = null] = result as any[];

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    console.error('Error upserting integration:', error);
    return NextResponse.json(
      { error: 'Error al crear integracion' },
      { status: 500 }
    );
  }
}
