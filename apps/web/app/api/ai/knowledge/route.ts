export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { deleteKnowledgeFile, listKnowledgeFiles, uploadKnowledgeFile } from '@quote-engine/ai';
import { getAuthTenant } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const files = await listKnowledgeFiles(auth.tenant.id);
    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error('GET /api/ai/knowledge error:', error)
    return NextResponse.json({ error: 'Error al obtener conocimiento' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const record = await uploadKnowledgeFile({ tenant: auth.tenant, userId: auth.user.id, file });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ai/knowledge error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al subir archivo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  
    const deleted = await deleteKnowledgeFile({ tenantId: auth.tenant.id, fileId: id });
    if (!deleted) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error('DELETE /api/ai/knowledge error:', error)
    return NextResponse.json({ error: 'Error al eliminar conocimiento' }, { status: 500 })
  }
}
