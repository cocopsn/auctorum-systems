import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db, patients, patientFiles } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';
import { uploadPatientFile } from '@/lib/storage';
import { z } from 'zod';

// ============================================================
// POST /api/dashboard/patients/[id]/files
// FormData upload -> Supabase storage + patient_files row.
// Validates MIME (PDF/JPG/PNG/WEBP/HEIC/GIF only) and size (<=10 MB).
// Magic-byte validation prevents MIME spoofing (M5 fix).
// ============================================================

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
]);

// Magic byte signatures for server-side file type validation.
// Prevents uploading malicious files with a spoofed Content-Type header.
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],       // %PDF
  'image/jpeg':      [0xFF, 0xD8, 0xFF],              // JFIF/EXIF
  'image/png':       [0x89, 0x50, 0x4E, 0x47],        // .PNG
  'image/gif':       [0x47, 0x49, 0x46],               // GIF
  'image/webp':      [0x52, 0x49, 0x46, 0x46],        // RIFF (WebP container)
  // HEIC uses ftyp box — bytes 4-7 contain "ftyp"; we check bytes 4-11.
};

/**
 * Validate that the first bytes of `buffer` match the expected magic signature
 * for the given `contentType`. For types without a known signature (e.g. HEIC)
 * we fall back to the MIME allowlist only.
 */
function validateMagicBytes(buffer: Buffer, contentType: string): boolean {
  // HEIC: ISO BMFF container — bytes 4..8 should be "ftyp"
  if (contentType === 'image/heic') {
    if (buffer.length < 8) return false;
    const ftypSlice = buffer.slice(4, 8).toString('ascii');
    return ftypSlice === 'ftyp';
  }

  const expected = MAGIC_BYTES[contentType];
  if (!expected) return false;                       // unknown type — reject
  if (buffer.length < expected.length) return false; // too short
  return expected.every((byte, i) => buffer[i] === byte);
}

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
      return NextResponse.json({ error: 'Archivo vacio' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande (max 10 MB)' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido (PDF, JPG, PNG, WEBP, HEIC, GIF)' },
        { status: 400 },
      );
    }

    // M5 FIX: Validate file content matches declared MIME type via magic bytes.
    // This prevents attackers from uploading executables/scripts with a spoofed
    // Content-Type header.
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'El contenido del archivo no coincide con el tipo declarado. Solo PDF, JPEG, PNG, WEBP, HEIC y GIF.' },
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
    console.error('[patient-files] Upload error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
