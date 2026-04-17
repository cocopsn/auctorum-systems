import { NextRequest, NextResponse } from 'next/server';
import { db, patientFiles } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';
import { getPatientFileSignedUrl, deletePatientFile } from '@/lib/storage';
import { z } from 'zod';

// ============================================================
// GET    /api/dashboard/patients/[id]/files/[fileId]
//        → { url: signed-URL (5 min) } for download
// DELETE /api/dashboard/patients/[id]/files/[fileId]
//        → hard-deletes storage object + metadata row
// Both tenant-scoped + auth-guarded. DELETE also origin-guarded.
// ============================================================

type RouteCtx = { params: { id: string; fileId: string } };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [row] = await db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.id, params.fileId),
        eq(patientFiles.patientId, params.id),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const url = await getPatientFileSignedUrl(row.storagePath, 300);
    return NextResponse.json({ url, filename: row.filename });
  } catch (error) {
    console.error('GET /api/dashboard/patients/[id]/files/[fileId] error:', error);
    return NextResponse.json({ error: 'Error al generar enlace' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteCtx) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [row] = await db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.id, params.fileId),
        eq(patientFiles.patientId, params.id),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // Storage delete first; swallow failures so a missing object doesn't
    // block metadata cleanup.
    try {
      await deletePatientFile(row.storagePath);
    } catch (storageError) {
      console.warn('Storage delete failed (continuing with DB cleanup):', storageError);
    }

    await db.delete(patientFiles).where(eq(patientFiles.id, params.fileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dashboard/patients/[id]/files/[fileId] error:', error);
    return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 });
  }
}
