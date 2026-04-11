export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant, requireRole } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/dashboard/settings/channels
// Returns channels_config JSONB from tenants table
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await db.execute(
      sql`SELECT channels_config FROM tenants WHERE id = ${auth.tenant.id}`
    );

    const [row] = result as any[];
    const channelsConfig = row?.channels_config ?? {};

    return NextResponse.json({ channelsConfig });
  } catch (error) {
    console.error('Error fetching channels config:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuracion de canales' },
      { status: 500 }
    );
  }
}

// Strict channel config schema (FIX 5.2 — JSONB schema validation)
const channelConfigSchema = z.object({
  whatsapp: z.object({
    enabled: z.boolean(),
    configured: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  telegram: z.object({
    enabled: z.boolean(),
    bot_token: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  email: z.object({
    enabled: z.boolean(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  sms: z.object({
    enabled: z.boolean(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
}).passthrough();

const patchSchema = z.object({
  channelsConfig: channelConfigSchema,
});

// PATCH /api/dashboard/settings/channels
// Update channels_config JSONB — body is the full channels_config object
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { channelsConfig } = parsed.data;

    await db.execute(
      sql`UPDATE tenants SET channels_config = ${JSON.stringify(channelsConfig)}::jsonb, updated_at = NOW() WHERE id = ${auth.tenant.id}`
    );

    return NextResponse.json({ channelsConfig });
  } catch (error) {
    console.error('Error updating channels config:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuracion de canales' },
      { status: 500 }
    );
  }
}