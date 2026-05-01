export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  isGoogleCalendarConfigured,
  testCalendarConnection,
} from '@/lib/google-calendar';
import { validateOrigin } from '@/lib/csrf'

// GET — check if Google Calendar is configured
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const config = auth.tenant.config as Record<string, any>;
    const configured = isGoogleCalendarConfigured(config);
    const calendarId = config?.googleCalendar?.calendarId ?? null;

    return NextResponse.json({
      configured,
      calendarId,
      autoSync: config?.googleCalendar?.autoSync ?? false,
    });
  } catch (err: any) {
    console.error('Google Calendar GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST — save credentials and test connection
const SaveSchema = z.object({
  calendarId: z.string().email('Calendar ID debe ser un email valido'),
  serviceAccountEmail: z.string().email('Service Account Email invalido'),
  serviceAccountPrivateKey: z.string().min(100, 'Private key demasiado corta'),
  autoSync: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { calendarId, serviceAccountEmail, serviceAccountPrivateKey, autoSync } = parsed.data;

    // Build a temporary config to test the connection
    const testConfig: Record<string, any> = {
      googleCalendar: { calendarId, serviceAccountEmail, serviceAccountPrivateKey },
    };

    try {
      const result = await testCalendarConnection(testConfig);
      console.log('[gcal config] connection test passed, events found:', result.eventCount);
    } catch (testErr: any) {
      console.error('[gcal config] connection test failed:', testErr?.message);
      return NextResponse.json(
        { error: `No se pudo conectar a Google Calendar: ${testErr?.message || 'Error desconocido'}` },
        { status: 400 },
      );
    }

    // Save to tenant config
    const config = (auth.tenant.config as Record<string, any>) || {};
    config.googleCalendar = {
      calendarId,
      serviceAccountEmail,
      serviceAccountPrivateKey,
      autoSync,
      connectedAt: new Date().toISOString(),
    };

    await db
      .update(tenants)
      .set({ config, updatedAt: new Date() })
      .where(eq(tenants.id, auth.tenant.id));

    return NextResponse.json({
      success: true,
      message: 'Google Calendar conectado exitosamente',
      calendarId,
    });
  } catch (err: any) {
    console.error('Google Calendar POST error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE — disconnect Google Calendar
export async function DELETE(request: Request) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const config = (auth.tenant.config as Record<string, any>) || {};
    delete config.googleCalendar;

    await db
      .update(tenants)
      .set({ config, updatedAt: new Date() })
      .where(eq(tenants.id, auth.tenant.id));

    return NextResponse.json({ success: true, message: 'Google Calendar desconectado' });
  } catch (err: any) {
    console.error('Google Calendar DELETE error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
