// ============================================================
// Origin-based CSRF guard for dashboard write endpoints.
// Ports the apps/web helper — tightened to require matching
// Origin + Host (no non-browser bypass) because medconcierge
// write routes are only ever hit by the in-app dashboard.
// ============================================================

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
