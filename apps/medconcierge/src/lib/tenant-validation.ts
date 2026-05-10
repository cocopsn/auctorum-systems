/**
 * tenant-validation.ts — guards against cross-tenant FK injection.
 *
 * Pre-2026-05-10 several POST/PATCH endpoints accepted UUIDs in the request
 * body (clientId, patientId, appointmentId, budgetId, ...) and inserted
 * them directly into rows belonging to the authenticated tenant — without
 * verifying that the foreign UUID was ALSO owned by the same tenant. A
 * malicious tenant could reference another tenant's data in their own
 * funnel/budget/payment rows. The data wasn't readable cross-tenant
 * (RLS holds), but FKs got polluted and analytics broke.
 *
 * These helpers do `SELECT 1 ... WHERE id = $1 AND tenant_id = $2` and
 * throw a typed error you can convert to a 400/404. Use them BEFORE every
 * insert/update that takes an FK from untrusted input.
 */

import { db, clients, patients, appointments, budgets, quotes } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'

export class CrossTenantError extends Error {
  constructor(public readonly entity: string, public readonly id: string) {
    super(`${entity} ${id} does not belong to this tenant`)
    this.name = 'CrossTenantError'
  }
}

async function checkOwnership(
  table: any,
  id: string,
  tenantId: string,
  entity: string,
): Promise<void> {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
    .limit(1)
  if (!row) throw new CrossTenantError(entity, id)
}

export const validateClientBelongsToTenant = (id: string, tenantId: string) =>
  checkOwnership(clients, id, tenantId, 'client')

export const validatePatientBelongsToTenant = (id: string, tenantId: string) =>
  checkOwnership(patients, id, tenantId, 'patient')

export const validateAppointmentBelongsToTenant = (id: string, tenantId: string) =>
  checkOwnership(appointments, id, tenantId, 'appointment')

export const validateBudgetBelongsToTenant = (id: string, tenantId: string) =>
  checkOwnership(budgets, id, tenantId, 'budget')

export const validateQuoteBelongsToTenant = (id: string, tenantId: string) =>
  checkOwnership(quotes, id, tenantId, 'quote')

/**
 * Convenience: verify a list of (entity, id) pairs and throw on the first
 * mismatch. Pass null/undefined ids and they're skipped.
 */
export async function validateForeignIds(
  tenantId: string,
  refs: Array<{ kind: 'client' | 'patient' | 'appointment' | 'budget' | 'quote'; id: string | null | undefined }>,
): Promise<void> {
  for (const r of refs) {
    if (!r.id) continue
    switch (r.kind) {
      case 'client':      await validateClientBelongsToTenant(r.id, tenantId); break
      case 'patient':     await validatePatientBelongsToTenant(r.id, tenantId); break
      case 'appointment': await validateAppointmentBelongsToTenant(r.id, tenantId); break
      case 'budget':      await validateBudgetBelongsToTenant(r.id, tenantId); break
      case 'quote':       await validateQuoteBelongsToTenant(r.id, tenantId); break
    }
  }
}
