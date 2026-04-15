import { eq } from "drizzle-orm";
import { db, tenants, type Tenant, type TenantConfig } from "@quote-engine/db";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "./types";

export function getAiSettings(tenant: Tenant): AiSettings {
  const config = tenant.config as TenantConfig;
  return { ...DEFAULT_AI_SETTINGS, ...(config.ai ?? {}) };
}

export async function saveAiSettings(
  tenant: Tenant,
  settings: Partial<AiSettings>,
) {
  const config = tenant.config as TenantConfig;
  const merged = { ...config, ai: { ...getAiSettings(tenant), ...settings } };
  const [updated] = await db
    .update(tenants)
    .set({ config: merged, updatedAt: new Date() })
    .where(eq(tenants.id, tenant.id))
    .returning();
  return updated;
}
