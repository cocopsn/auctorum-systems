import { db } from "./index";
import { sql } from "drizzle-orm";

export async function auditLog(params: {
  tenantId: string;
  userId?: string | null;
  action: string;
  entity: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, entity, before, after, ip, created_at)
      VALUES (
        ${params.tenantId}::uuid,
        ${params.userId || null}::uuid,
        ${params.action},
        ${params.entity},
        ${JSON.stringify(params.before || {})}::jsonb,
        ${JSON.stringify(params.after || {})}::jsonb,
        ${params.ip || null},
        NOW()
      )
    `);
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}
