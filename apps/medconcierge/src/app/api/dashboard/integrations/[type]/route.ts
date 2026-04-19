export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// POST /api/dashboard/integrations/[type]
// Actions: connect, disconnect, sync

const ActionSchema = z.object({
  action: z.enum(['connect', 'disconnect', 'sync']),
  config: z.record(z.unknown()).optional().default({}),
});

export async function POST(
  request: NextRequest,
  {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
 params }: { params: { type: string } }
) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { type } = params;

    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, config } = parsed.data;

    if (action === 'connect') {
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

      const [connected = null] = result as any[];
      return NextResponse.json({
        integration: connected,
        message: 'Integracion conectada',
      });
    }

    if (action === 'disconnect') {
      const result = await db.execute(
        sql`UPDATE integrations
            SET status = 'disconnected', updated_at = NOW()
            WHERE tenant_id = ${auth.tenant.id} AND type = ${type}
            RETURNING *`
      );

      if (!result.length) {
        return NextResponse.json(
          { error: 'Integracion no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        integration: (result as any[])[0],
        message: 'Integracion desconectada',
      });
    }

    if (action === 'sync') {
      const result = await db.execute(
        sql`UPDATE integrations
            SET last_sync_at = NOW(), updated_at = NOW()
            WHERE tenant_id = ${auth.tenant.id} AND type = ${type}
            RETURNING *`
      );

      if (!result.length) {
        return NextResponse.json(
          { error: 'Integracion no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        integration: (result as any[])[0],
        message: 'Sincronizacion iniciada',
      });
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 });
  } catch (error) {
    console.error('Error in integration action:', error);
    return NextResponse.json(
      { error: 'Error al procesar la accion' },
      { status: 500 }
    );
  }
}
