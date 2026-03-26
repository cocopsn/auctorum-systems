interface CachedTenant {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CachedTenant>();
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedTenant(slug: string) {
  const entry = cache.get(slug);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  cache.delete(slug);
  return null;
}

export function setCachedTenant(slug: string, data: unknown) {
  cache.set(slug, { data, expiresAt: Date.now() + TTL });
}

export function invalidateTenantCache(slug: string) {
  cache.delete(slug);
}
