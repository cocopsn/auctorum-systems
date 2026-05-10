export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledgeFile, listKnowledgeFiles, uploadKnowledgeFile } from '@quote-engine/ai';
import { getAuthTenant } from '@/lib/auth';
import { validateOrigin } from '@/lib/csrf';

export async function GET() {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, data: await listKnowledgeFiles(auth.tenant.id) });
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  try {
    const record = await uploadKnowledgeFile({ tenant: auth.tenant, userId: auth.user.id, file });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al subir archivo' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const deleted = await deleteKnowledgeFile({ tenantId: auth.tenant.id, fileId: id });
  if (!deleted) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, data: deleted });
}
