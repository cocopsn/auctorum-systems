/**
 * Per-role permission matrix for medconcierge.
 *
 * Added 2026-05-12 alongside the new `secretaria` role. Pre-existing
 * `auth.user.role !== 'admin'` style checks remain valid for endpoints
 * where ONLY admin should pass; this helper covers the more nuanced
 * cases ("admin OR secretaria can edit appointments, but only admin can
 * refund").
 *
 * Source of truth — keep in sync with TENANT_ROLES in
 * apps/medconcierge/src/app/api/dashboard/settings/team/route.ts.
 *
 * Default-deny: if a role isn't listed for a capability, it cannot do
 * it. Adding a new role = explicit grant per capability.
 */

export type Role = 'admin' | 'secretaria' | 'operator' | 'viewer'

export type Capability =
  // Patient management
  | 'patients.read'
  | 'patients.write'
  | 'patients.delete'
  | 'patients.export'
  // Clinical records (PHI)
  | 'clinical_records.read'
  | 'clinical_records.write'
  | 'clinical_records.lock'
  | 'clinical_records.unlock'
  // Appointments / agenda
  | 'appointments.read'
  | 'appointments.write'
  | 'appointments.delete'
  // Conversations / WhatsApp / Instagram inbox
  | 'conversations.read'
  | 'conversations.write'
  | 'campaigns.send'
  // Documents
  | 'documents.read'
  | 'documents.write'
  | 'documents.delete'
  // Billing / payments
  | 'payments.read'
  | 'payments.refund'
  | 'invoices.write'
  | 'subscription.manage'
  // Settings
  | 'settings.tenant'
  | 'settings.bot'
  | 'settings.integrations'
  // Team management
  | 'team.invite'
  | 'team.role_change'
  | 'team.remove'
  // Reports + exports
  | 'reports.read'
  | 'reports.export'
  // Leads + funnel
  | 'leads.read'
  | 'leads.write'

const READ_ALL: Capability[] = [
  'patients.read',
  'clinical_records.read',
  'appointments.read',
  'conversations.read',
  'documents.read',
  'payments.read',
  'reports.read',
  'leads.read',
]

const SECRETARIA_CAPS: Capability[] = [
  ...READ_ALL,
  // Day-to-day operations the secretaria does for the doctor:
  'patients.write',
  'appointments.write',
  'appointments.delete',
  'conversations.write',
  'documents.write',
  'leads.write',
  'reports.export',
  // Allowed to schedule and reschedule, NOT delete patients (NOM-004
  // implications). NOT clinical record write (only the doctor signs).
  // NOT campaigns.send (marketing decision = admin). NOT refunds.
]

const OPERATOR_CAPS: Capability[] = [
  ...SECRETARIA_CAPS,
  // Operator gets the secretaria's set plus a few extras for now —
  // legacy role; converge with secretaria over time.
  'campaigns.send',
]

const ROLE_MATRIX: Record<Role, Set<Capability>> = {
  admin: new Set<Capability>([
    ...READ_ALL,
    ...SECRETARIA_CAPS,
    ...OPERATOR_CAPS,
    // Admin-only — money, team, deletes, role changes, clinical sign.
    'patients.delete',
    'patients.export',
    'clinical_records.write',
    'clinical_records.lock',
    'clinical_records.unlock',
    'documents.delete',
    'payments.refund',
    'invoices.write',
    'subscription.manage',
    'settings.tenant',
    'settings.bot',
    'settings.integrations',
    'team.invite',
    'team.role_change',
    'team.remove',
  ]),
  secretaria: new Set<Capability>(SECRETARIA_CAPS),
  operator: new Set<Capability>(OPERATOR_CAPS),
  viewer: new Set<Capability>(READ_ALL),
}

/** Pure boolean check — does this role have the capability? */
export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false
  const set = ROLE_MATRIX[role as Role]
  if (!set) return false
  return set.has(cap)
}

/**
 * Throw-on-deny helper for route handlers. Pair with try/catch in the
 * handler if you want to convert to NextResponse manually; otherwise
 * the helper version `requireCapResponse` returns a NextResponse.
 */
export class ForbiddenError extends Error {
  constructor(public readonly cap: Capability, public readonly role: string | null) {
    super(`Role ${role ?? '<none>'} lacks capability ${cap}`)
    this.name = 'ForbiddenError'
  }
}

export function requireCap(role: string | null | undefined, cap: Capability): void {
  if (!can(role, cap)) throw new ForbiddenError(cap, role ?? null)
}
