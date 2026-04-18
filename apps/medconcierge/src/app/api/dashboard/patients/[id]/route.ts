export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, patients, patientFiles, appointments } from '@quote-engine/db';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';

// ============================================================
// GET /api/dashboard/patients/[id]
// Fetch patient detail with files and appointments.
// ============================================================

type RouteCtx = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const files = await db
      .select()
      .from(patientFiles)
      .where(eq(patientFiles.patientId, id))
      .orderBy(desc(patientFiles.createdAt));

    const patientAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, id))
      .orderBy(desc(appointments.date))
      .limit(20);

    return NextResponse.json({ patient, files, appointments: patientAppointments });
  } catch (error) {
    console.error('GET /api/dashboard/patients/[id] error:', error);
    return NextResponse.json({ error: 'Error al cargar paciente' }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/dashboard/patients/[id]
// Partial update of clinical record fields (allergies,
// medications, chronic conditions, clinical notes, plus
// insurance/emergency-contact demographics). Tenant-scoped,
// origin-guarded, Zod .strict() — unknown keys 400.
// ============================================================

const updateSchema = z
  .object({
    allergies: z.string().max(4000, 'Alergias demasiado largo').nullable().optional(),
    medications: z.string().max(4000, 'Medicamentos demasiado largo').nullable().optional(),
    chronicConditions: z.string().max(4000, 'Condiciones demasiado largo').nullable().optional(),
    notes: z.string().max(8000, 'Notas demasiado largas').nullable().optional(),
    bloodType: z.string().max(5).nullable().optional(),
    insuranceProvider: z.string().max(255).nullable().optional(),
    insurancePolicy: z.string().max(100).nullable().optional(),
    emergencyContactName: z.string().max(255).nullable().optional(),
    emergencyContactPhone: z.string().max(50).nullable().optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Tenant ownership check.
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updateData[key] = value;
    }

    const [updated] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /api/dashboard/patients/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
  }
}
