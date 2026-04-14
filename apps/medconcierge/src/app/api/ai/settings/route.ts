export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAiSettings, saveAiSettings } from '@quote-engine/ai';
import { getAuthTenant } from '@/lib/auth';

export async function GET() {
  try {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, data: getAiSettings(auth.tenant) });

  } catch (err) {
    console.error('[GET]'
  try {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const updated = await saveAiSettings(auth.tenant, {
    enabled: Boolean(body.enabled),
    systemPrompt: String(body.systemPrompt ?? '').slice(0, 8000),
    autoSchedule: Boolean(body.autoSchedule),
    answerFaq: Boolean(body.answerFaq),
    humanHandoff: Boolean(body.humanHandoff),
    model: String(body.model || process.env.OPENAI_MODEL || 'gpt-5-mini').slice(0, 100),
    temperature: body.temperature != null ? Number(body.temperature) : undefined,
    maxTokens: body.maxTokens != null ? Number(body.maxTokens) : undefined,
  });
  return NextResponse.json({ success: true, data: getAiSettings(updated) });

  } catch (err) {
    console.error('[PUT]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
emperature) : undefined,
    maxTokens: body.maxTokens != null ? Number(body.maxTokens) : undefined,
  });
  return NextResponse.json({ success: true, data: getAiSettings(updated) });
}
