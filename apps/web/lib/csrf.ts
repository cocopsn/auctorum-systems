export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return true; // Allow non-browser requests (API clients)
  const originHost = new URL(origin).host;
  return originHost === host;
}
