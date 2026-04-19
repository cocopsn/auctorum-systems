export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    // In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return false;
    // Exact host match
    return url.host === host;
  } catch {
    return false;
  }
}
