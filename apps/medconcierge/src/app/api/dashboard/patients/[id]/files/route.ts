import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db, patients, patientFiles } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';
import { uploadPatientFile } from '@/lib/storage';

// ============================================================
// POST /api/dashboard/patients/[id]/files
// FormData upload → Supabase storage + patient_files row.
// Validates MIME (PDF/JPG/PNG/WEBP/HEIC only) and size (≤10 MB).
// Browser-reported MIME is trusted — no magic-byte sniffing.
// ============================================================

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

type RouteCtx = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Tenant-scoped patient lookup.
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 10 MB)' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido (PDF, JPG, PNG, WEBP, HEIC)' },
        { status: 400 },
      );
    }

    const fileId = randomUUID();
    const storagePath = await uploadPatientFile({
      tenantId: auth.tenant.id,
      patientId: patient.id,
      fileId,
      file,
    });

    const [row] = await db
      .insert(patientFiles)
      .values({
        id: fileId,
        tenantId: auth.tenant.id,
        patientId: patient.id,
        uploadedByUserId: auth.user.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
      })
      .returning();

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    console.error('POST /api/dashboard/patients/[id]/files error:', error);
    const message = error instanceof Error ? error.message : 'Error al subir archivo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
