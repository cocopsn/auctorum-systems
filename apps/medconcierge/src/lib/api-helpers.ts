import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(status: number, message: string, details?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}
