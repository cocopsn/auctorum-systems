# AUCTORUM SYSTEMS — Security Audit Report

**Date:** 2026-04-20
**Auditor:** Claude Code (automated static analysis + infrastructure review)
**Scope:** VPS Infrastructure + Next.js Application + Supabase Database + Code Review
**Target:** 142.93.199.126 (SSH port 2222) — Production Environment
**Branch:** `feat/v2-premium-redesign`
**Stack:** Next.js 14.2.35, Supabase, Drizzle ORM, Redis, BullMQ, Nginx, PM2

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **CRITICAL** | 2 |
| **HIGH** | 8 |
| **MEDIUM** | 22 |
| **LOW** | 12 |
| **INFO** | 30+ |
| **Total** | **44+** |

**Overall Security Posture: 58/100**

The application demonstrates strong fundamentals — Supabase Auth with server-validated tokens, HMAC-verified webhooks (WhatsApp/Stripe), proper .env management, and good Nginx hardening. However, two CRITICAL vulnerabilities require immediate attention: the MercadoPago webhook signature bypass (allowing subscription fraud) and the database connection bypassing all RLS policies (eliminating defense-in-depth for multi-tenant isolation). For a medical SaaS handling PHI, the absent audit logging is also a compliance risk.

---

## IMMEDIATELY EXPLOITABLE

### CRIT-01: MercadoPago Webhook Signature Verification Bypass
**OWASP: A08:2021 — Software and Data Integrity Failures**

The MercadoPago webhook only verifies the HMAC signature when BOTH `x-signature` and `x-request-id` headers are present. An attacker can omit these headers and send forged payment confirmations to activate any tenant subscription for free.

**File:** `apps/medconcierge/src/app/api/webhooks/mercadopago/route.ts:13-19`

```typescript
// Current code — verification is OPTIONAL
if (xSignature && xRequestId) {           // attacker omits both headers
  const valid = verifyMPWebhook(...);
  if (!valid) { return 403; }
}
// Processing continues without verification if headers are absent
```

**Impact:** Subscription fraud. Any attacker can craft a POST request with a fake `payment.id` and arbitrary `external_reference` containing `tenant_id` + `plan_id` to activate premium subscriptions without paying.

**Remediation:**
```typescript
if (!xSignature || !xRequestId) {
  return NextResponse.json({ error: "Missing signature" }, { status: 400 });
}
const valid = verifyMPWebhook(xSignature, xRequestId, String(body.data.id));
if (!valid) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}
```

---

### CRIT-02: Application Bypasses All RLS Policies (Connects as `postgres`)
**OWASP: A01:2021 — Broken Access Control**

The `DATABASE_URL` connects as the `postgres` user via `postgres-js` driver (direct connection, not PostgREST). PostgreSQL RLS policies are **not enforced** for table owners. This means ALL 40+ RLS policies defined in the database are effectively dead code. Multi-tenant isolation relies entirely on application-layer `WHERE tenant_id = ...` clauses.

**File:** `packages/db/index.ts` (connection), `apps/medconcierge/.env.local` (DATABASE_URL)

**Impact:** If any single API route handler omits a `tenant_id` filter, all tenants data is accessible. No database-level safety net exists. The existing `withTenant()` function that would enable per-request RLS enforcement is defined but **never called** from any API route.

**Remediation:**
1. Create a dedicated application database role (e.g., `auctorum_app`) that is NOT the table owner
2. `ALTER ROLE auctorum_app SET row_security = on;`
3. Grant only necessary privileges to this role
4. Implement `withTenant()` calls in all dashboard API routes for defense-in-depth
5. Update `DATABASE_URL` to use the new role

---

## CRITICAL Findings

| ID | Finding | OWASP | Location |
|----|---------|-------|----------|
| CRIT-01 | MercadoPago webhook signature bypass | A08 | `api/webhooks/mercadopago/route.ts:13-19` |
| CRIT-02 | App connects as `postgres`, bypassing all RLS | A01 | `packages/db/index.ts`, `.env.local` |

---

## HIGH Findings

### HIGH-01: MercadoPago `external_reference` Injection
**OWASP: A03:2021 — Injection**

Combined with CRIT-01, the `external_reference` field from the payment object is parsed with `JSON.parse()` without try/catch. An attacker can inject arbitrary `tenant_id` and `plan_id` to activate any tenant subscription.

**File:** `apps/medconcierge/src/app/api/webhooks/mercadopago/route.ts:26-29`

```typescript
const extRef = JSON.parse((payment as any).external_reference || "{}");
const tenantId = extRef.tenant_id;  // Used directly in DB update
const planId = extRef.plan_id;
```

**Remediation:** Wrap in try/catch, validate `tenantId` is a valid UUID, validate `planId` against known plan keys. Fix CRIT-01 first.

---

### HIGH-02: `withTenant()` Wrapper Exists But Is Never Called
**OWASP: A01:2021 — Broken Access Control**

The codebase defines a `withTenant()` function that correctly sets `app.tenant_id` via `set_config()` for RLS enforcement. However, a search of all 102+ API route files found **zero** usages. All tenant isolation is purely through application-layer `WHERE` clauses.

**File:** `packages/db/index.ts`

**Remediation:** Implement `withTenant()` in all dashboard API routes as defense-in-depth.

---

### HIGH-03: 4 Tables Have RLS Disabled
**OWASP: A01:2021 — Broken Access Control**

| Table | Content | Risk |
|-------|---------|------|
| `messages` | WhatsApp/chat message content (potential PHI) | Patient conversation data exposed |
| `campaign_messages` | Campaign delivery status | Cross-tenant campaign data |
| `client_funnel` | CRM funnel position | Cross-tenant CRM data |
| `_migrations` | Migration tracking | Benign |

**Remediation:** Enable RLS on `messages`, `campaign_messages`, and `client_funnel`. Add `tenant_id` columns where missing (e.g., `messages` derives tenant through `conversations` FK).

---

### HIGH-04: Hardcoded Default Secret for iCal Token Generation
**OWASP: A02:2021 — Cryptographic Failures**

```typescript
const SECRET = process.env.ICAL_SECRET || process.env.NEXTAUTH_SECRET || "auctorum-ical-default-secret"
```

If neither env var is set, a publicly known fallback secret is used. Tokens are also truncated to 16 hex chars (64 bits), which is weak.

**File:** `apps/medconcierge/src/app/api/appointments/[id]/ical/route.ts:9`

**Remediation:** Remove hardcoded fallback. Require `ICAL_SECRET` in env. Use full HMAC output. Use `timingSafeEqual` for comparison.

---

### HIGH-05: Admin PATCH Tenant Config — No Schema Validation
**OWASP: A04:2021 — Insecure Design**

The admin PATCH endpoint accepts an arbitrary `config` JSON object without schema validation. The `config` field stores sensitive data including Google OAuth tokens and payment processor keys.

**File:** `apps/medconcierge/src/app/api/admin/tenants/[id]/route.ts` (PATCH handler)

```typescript
if (body.config !== undefined) allowedFields.config = body.config  // No validation
```

**Remediation:** Validate with a strict Zod schema. Only allow updating specific, safe config sub-keys.

---

### HIGH-06: Google OAuth Tokens Stored in Plaintext in Database
**OWASP: A02:2021 — Cryptographic Failures**

Google OAuth `access_token` and `refresh_token` are stored directly in the tenant `config` JSONB column without encryption.

**File:** `apps/medconcierge/src/app/api/auth/google/callback/route.ts:75-84`

**Remediation:** Encrypt tokens at rest using AES-256-GCM with an application-level encryption key. Decrypt only at point-of-use.

---

### HIGH-07: Audit Log Table Exists But Nothing Writes To It
**OWASP: A09:2021 — Security Logging and Monitoring Failures**

The `audit_logs` table schema exists with proper fields. An admin UI reads from it. However, **no code anywhere in the codebase actually inserts records into this table**. For a medical SaaS (HIPAA/NOM-024 relevance), audit logging is a compliance requirement.

**Files:** Schema at `packages/db/schema/audit-logs.ts`, Read-only API at `api/admin/audit/route.ts`

**Remediation:** Implement an `auditLog()` helper and call from all sensitive operations: login/logout, patient CRUD, clinical record access, settings changes, payment events, role changes.

---

### HIGH-08: Plaintext Git Credentials on Server
**OWASP: A02:2021 — Cryptographic Failures**

Plaintext Git credentials stored at `/root/.git-credentials`. If the server is compromised, these provide access to GitHub repositories.

**File:** `/root/.git-credentials`

**Remediation:** Revoke stored token immediately. Switch to deploy keys with read-only scope or credential helper with timeout. Remove `.git-credentials` file.

---

## MEDIUM Findings

### MED-01: Redis Has No Authentication
**OWASP: A07:2021 — Identification and Authentication Failures**

Redis responds to `PING` without authentication. Any local process can read/write/flush all data.

**File:** `/etc/redis/redis.conf`

**Remediation:** Set `requirepass` with a strong password. Use `rename-command` to disable `FLUSHALL`, `CONFIG`, `DEBUG`, `KEYS`.

---

### MED-02: No Content-Security-Policy in Nginx
**OWASP: A05:2021 — Security Misconfiguration**

CSP is not configured at the Nginx level. The Next.js app config has CSP with `unsafe-inline` for scripts, which weakens XSS protection.

**Files:** `/etc/nginx/sites-enabled/auctorum`, `apps/medconcierge/next.config.js:36`

**Remediation:** Add CSP at Nginx level. Replace `unsafe-inline` with nonce-based CSP.

---

### MED-03: Security Headers Stripped on `/_next/static/`
**OWASP: A05:2021 — Security Misconfiguration**

The `/_next/static/` Nginx location block has its own `add_header Cache-Control`, which causes Nginx to discard ALL inherited security headers (HSTS, X-Frame-Options, etc.) for static assets.

**File:** `/etc/nginx/sites-enabled/auctorum`

**Remediation:** Re-add all security headers inside the `/_next/static/` location block, or use `ngx_headers_more` module.

---

### MED-04: Middleware Skips All API Routes
**OWASP: A01:2021 — Broken Access Control**

All API routes under `/api/*` bypass the middleware entirely. No middleware-level auth defense for `/api/dashboard/*`.

**File:** `apps/medconcierge/src/middleware.ts:26`

**Remediation:** Add middleware-level auth for `/api/dashboard/*`. Only exempt truly public paths.

---

### MED-05: MercadoPago HMAC Uses Non-Timing-Safe Comparison
**OWASP: A02:2021 — Cryptographic Failures**

Uses `===` instead of `crypto.timingSafeEqual()` for signature comparison. (WhatsApp webhook correctly uses `timingSafeEqual`.)

**File:** `packages/payments/src/billing-mercadopago.ts`

**Remediation:** Use `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))`.

---

### MED-06: Meta Data Deletion Webhook Does Not Verify Signature
**OWASP: A08:2021 — Software and Data Integrity Failures**

The webhook decodes Meta `signed_request` payload but never verifies the HMAC signature in `parts[0]`.

**File:** `apps/medconcierge/src/app/api/webhooks/meta-data-deletion/route.ts`

**Remediation:** Verify HMAC signature using `WHATSAPP_APP_SECRET` before processing.

---

### MED-07: In-Memory Rate Limiter Does Not Survive Restarts
**OWASP: A04:2021 — Insecure Design**

Rate limiter uses a process-local `Map`. Resets on PM2 restart. Does not scale to multiple processes.

**File:** `apps/medconcierge/src/lib/rate-limit.ts`

**Remediation:** Use Redis-backed rate limiting.

---

### MED-08: Rate Limiter Trusts Spoofable `x-forwarded-for`
**OWASP: A04:2021 — Insecure Design**

Client can set arbitrary `X-Forwarded-For` headers to bypass per-IP rate limits.

**Files:** `api/appointments/route.ts`, `api/availability/route.ts`, `api/auth/magic-link/route.ts`

**Remediation:** Use Cloudflare `cf-connecting-ip` or configure Nginx to strip client-provided `X-Forwarded-For`.

---

### MED-09: CSRF Protection Missing on 5 Write Endpoints
**OWASP: A01:2021 — Broken Access Control**

The following auth-protected endpoints lack `validateOrigin()` checks:
- `/api/dashboard/settings/appearance` (PATCH)
- `/api/dashboard/patients/[id]/avatar` (POST)
- `/api/dashboard/billing/checkout` (POST)
- `/api/dashboard/billing/portal` (POST)
- `/api/dashboard/billing/checkout-mp` (POST)

**Remediation:** Apply `validateOrigin(request)` to all mutating dashboard endpoints.

---

### MED-10: No Server-Side Rate Limiting on Password Login
**OWASP: A04:2021 — Insecure Design**

Password login calls Supabase directly from client. No server-side rate limiting or account lockout.

**File:** `apps/medconcierge/src/app/login/page.tsx`

**Remediation:** Route through a server-side API with rate limiting. Add account lockout after N failures.

---

### MED-11: `requireRole()` Returns Null Instead of Failing
**OWASP: A01:2021 — Broken Access Control**

Unlike `requireAuth()` which redirects on failure, `requireRole()` returns `null`, requiring every caller to check. Error-prone pattern.

**File:** `apps/medconcierge/src/lib/auth.ts`

**Remediation:** Create a `requireAdmin()` that throws/redirects on failure.

---

### MED-12: Portal Token Brute-Force Risk
**OWASP: A01:2021 — Broken Access Control**

Portal file access is rate-limited per-token (not per-IP) using in-memory `Map`. Resets on restart. Multiple tokens can be brute-forced in parallel.

**File:** `apps/medconcierge/src/app/api/portal/[token]/files/[fileId]/route.ts`

**Remediation:** Add IP-based rate limiting via Redis. Ensure tokens have 128+ bits entropy. Add expiration.

---

### MED-13: Avatar Upload Missing Magic-Byte Validation
**OWASP: A04:2021 — Insecure Design**

Avatar upload checks `file.type.startsWith("image/")` but does not validate magic bytes (unlike the main file upload which has `validateMagicBytes`).

**File:** `apps/medconcierge/src/app/api/dashboard/patients/[id]/avatar/route.ts`

**Remediation:** Apply the same `validateMagicBytes` validation used in the files endpoint.

---

### MED-14: Clinical Record Files Missing Magic-Byte Validation
**OWASP: A04:2021 — Insecure Design**

Same issue as MED-13 for clinical record file uploads.

**File:** `apps/medconcierge/src/app/api/dashboard/patients/[id]/records/[recordId]/files/route.ts`

**Remediation:** Apply `validateMagicBytes` function.

---

### MED-15: Stripe Webhook Swallows Processing Errors
**OWASP: A09:2021 — Security Logging and Monitoring Failures**

After signature verification, all processing errors return `200 OK`. Failed subscription activations are silently lost.

**File:** `apps/medconcierge/src/app/api/webhooks/stripe/route.ts:109-111`

**Remediation:** Return 500 for transient errors (so Stripe retries). Add dead-letter mechanism for failed processing.

---

### MED-16: `sql.raw()` in Admin Health Check
**OWASP: A03:2021 — Injection**

Health check uses `sql.raw()` with hardcoded table names. While safe now, any future dynamic table name = SQL injection.

**File:** `apps/medconcierge/src/app/api/admin/health/route.ts:30-34`

**Remediation:** Use parameterized queries for each table individually.

---

### MED-17: SSH Port Open to All IPs
**OWASP: N/A — Infrastructure**

UFW allows port 2222 from any source IP. Protected by key-only auth + Fail2Ban but increases attack surface.

**Remediation:** Restrict to known admin IPs: `ufw allow from YOUR_IP to any port 2222`.

---

### MED-18: PermitRootLogin Set to `prohibit-password`
**OWASP: N/A — Infrastructure**

Root can log in via SSH keys. Best practice is to disable entirely and use sudo.

**File:** `/etc/ssh/sshd_config`

**Remediation:** Set `PermitRootLogin no`. Create admin user with sudo access.

---

### MED-19: No Fail2Ban Jails for Nginx
**OWASP: N/A — Infrastructure**

Only SSH brute-force protection. No jails for nginx auth failures, bot scanners, or rate-limit abusers.

**Remediation:** Add `nginx-botsearch`, `nginx-http-auth`, `nginx-limit-req` jails.

---

### MED-20: `quotes_update_public` Policy Uses `USING (true)`
**OWASP: A01:2021 — Broken Access Control**

Several RLS policies still allow unrestricted access: `quotes_update_public`, `quote_items_select_public`, `quote_items_insert_public`.

**Remediation:** Restrict to tenant-scoped policies using `auth.uid()` or `current_setting('app.tenant_id')`.

---

### MED-21: DATABASE_URL Lacks Explicit SSL Mode
**OWASP: A02:2021 — Cryptographic Failures**

No `sslmode=require` in the connection string. MITM could downgrade to plaintext.

**Remediation:** Add `?sslmode=require` to `DATABASE_URL`.

---

### MED-22: Logger is Console-Only
**OWASP: A09:2021 — Security Logging and Monitoring Failures**

Structured JSON logger goes only to stdout/stderr. No persistent storage or aggregation.

**File:** `apps/medconcierge/src/lib/logger.ts`

**Remediation:** Integrate with a log aggregation service (Datadog, Logtail, Axiom).

---

## LOW Findings

| ID | Finding | Location | Remediation |
|----|---------|----------|-------------|
| LOW-01 | No SSH AllowUsers directive | `/etc/ssh/sshd_config` | Add `AllowUsers auctorum` |
| LOW-02 | No LoginGraceTime set (default 120s) | `/etc/ssh/sshd_config` | Set `LoginGraceTime 30` |
| LOW-03 | Large `.bash_history` (72KB) may contain secrets | `/root/.bash_history` | Set `HISTIGNORE`, truncate periodically |
| LOW-04 | Default Fail2Ban settings (10min ban) | `/etc/fail2ban/` | Increase `bantime`, enable `bantime.increment` |
| LOW-05 | No Permissions-Policy header | Nginx config | Add `Permissions-Policy: camera=(), microphone=(), geolocation=()` |
| LOW-06 | No OCSP stapling | Nginx config | Add `ssl_stapling on; ssl_stapling_verify on;` |
| LOW-07 | TypeScript/ESLint errors ignored in builds | `next.config.js` | Enable checks: `ignoreBuildErrors: false` |
| LOW-08 | `dangerouslySetInnerHTML` for JSON-LD | `apps/web/app/[tenant]/page.tsx` | Escape `</script>` sequences in JSON |
| LOW-09 | Avatar signed URL has 1-year expiry | `api/dashboard/patients/[id]/avatar/route.ts` | Use short-lived URLs (5-15 min), generate on demand |
| LOW-10 | Both apps share identical secrets | `.env.local` files | Use separate DB credentials with different privileges |
| LOW-11 | Error messages may leak internal details | `api/dashboard/patients/[id]/files/route.ts` | Return generic error messages to client |
| LOW-12 | Internal health endpoint IP check bypassable | `api/internal/health/route.ts` | Use shared secret header instead of `x-forwarded-for` |

---

## INFO Findings (What Is Already Good)

| Check | Status |
|-------|--------|
| SSH key-only auth (PasswordAuthentication no) | PASS |
| UFW active with deny-by-default | PASS |
| Ports 80/443 restricted to Cloudflare IPs | PASS |
| Redis bound to 127.0.0.1 only | PASS |
| Next.js/PM2 on localhost only | PASS |
| unattended-upgrades enabled | PASS |
| Fail2Ban active for SSH (2,290+ blocked attempts) | PASS |
| HSTS with max-age=2yr, includeSubDomains, preload | PASS |
| TLS 1.2/1.3 only, strong ciphers | PASS |
| Let's Encrypt cert valid (expires 2026-06-23) | PASS |
| server_tokens off | PASS |
| Dotfile blocking (`.git`, `.env` -> 404) | PASS |
| HTTP to HTTPS redirect | PASS |
| .env.local files mode 600, owned by auctorum | PASS |
| .gitignore excludes .env files | PASS |
| No .env files in git history | PASS |
| NEXT_PUBLIC vars are all public-safe | PASS |
| Service role key used only server-side | PASS |
| Auth uses `getUser()` not `getSession()` | PASS |
| WhatsApp webhook HMAC with `timingSafeEqual()` | PASS |
| Stripe webhook `constructEvent()` verification | PASS |
| Drizzle ORM parameterized queries (no raw SQL injection) | PASS |
| No `eval()` or `new Function()` in code | PASS |
| No user-controlled URLs in server-side fetch (no SSRF) | PASS |
| Middleware fail-closed on error (redirects to login) | PASS |
| Zod `.strict()` validation on patient endpoints | PASS |
| Magic-byte validation on main file upload | PASS |
| Per-phone rate limiting in WhatsApp worker | PASS |
| AI budget checking prevents runaway costs | PASS |
| Minimal server service footprint (23 services) | PASS |
| Tenant-scoped queries in dashboard routes | PASS |
| `poweredByHeader: false` in Next.js config | PASS |
| Nginx rate limiting on API (30r/m) and quotes (10r/m) | PASS |

---

## Recommendations (Ordered by Priority)

### Immediate (Fix This Week)
1. **CRIT-01:** Make MercadoPago webhook signature mandatory — this is actively exploitable for subscription fraud
2. **CRIT-02:** Create a dedicated DB role that respects RLS, stop connecting as `postgres`
3. **HIGH-08:** Revoke and delete `/root/.git-credentials`, rotate the GitHub token
4. **HIGH-01:** Add try/catch and validation to MercadoPago `external_reference` parsing

### Urgent (Fix Within 2 Weeks)
5. **HIGH-04:** Remove hardcoded `"auctorum-ical-default-secret"` fallback, require env var
6. **HIGH-05:** Add Zod schema validation to admin PATCH tenant config endpoint
7. **HIGH-06:** Encrypt Google OAuth tokens at rest in the database
8. **HIGH-07:** Implement actual audit log writes for sensitive operations (compliance risk)
9. **HIGH-02/03:** Enable RLS on `messages`, `campaign_messages`, `client_funnel` tables
10. **MED-01:** Set Redis `requirepass` and disable dangerous commands

### Important (Fix Within 1 Month)
11. **MED-02/03:** Add proper CSP, fix security header inheritance on static assets
12. **MED-04:** Add middleware-level auth for `/api/dashboard/*` routes
13. **MED-07/08:** Switch to Redis-backed rate limiting, use `cf-connecting-ip`
14. **MED-09:** Apply CSRF `validateOrigin` to all mutating dashboard endpoints
15. **MED-05/06:** Fix timing-safe comparisons for MercadoPago and Meta webhooks
16. **MED-13/14:** Apply magic-byte validation to avatar and record file uploads
17. **MED-17/18/19:** Restrict SSH IPs, disable root login, add Nginx Fail2Ban jails

### Recommended (Best Practice Improvements)
18. **MED-15:** Implement dead-letter mechanism for failed Stripe webhook processing
19. **MED-22:** Integrate structured logging with a log aggregation service
20. **LOW-07:** Enable TypeScript/ESLint build checks in CI/CD
21. **LOW-09:** Use short-lived signed URLs for patient avatars
22. **LOW-10:** Separate database credentials per application

---

## Methodology

This audit was performed through:
1. **Infrastructure review:** SSH into the production VPS, inspecting system configuration (SSH, UFW, Nginx, Redis, Fail2Ban, SSL/TLS, file permissions, running services)
2. **Static code analysis:** Reading all API routes, middleware, auth code, webhook handlers, admin endpoints, file upload handlers, worker scripts
3. **Database review:** Examining RLS policies (all 40+ policies), table permissions, connection security, multi-tenant isolation patterns
4. **Secrets audit:** Checking .env files, git history, NEXT_PUBLIC exposure, file permissions, CLAUDE.md, Supabase client patterns
5. **OWASP Top 10 mapping:** Each finding categorized against OWASP 2021 framework

### Limitations
- No dynamic/penetration testing was performed
- No dependency audit (`pnpm audit`) was run due to environment constraints
- No load testing for rate limiter effectiveness
- Database policies were reviewed but not tested with actual tenant switching
- Third-party service configurations (Supabase Auth rate limits, Cloudflare WAF rules) were not audited

---

*Report generated by Claude Code automated security audit on 2026-04-20. All findings should be verified before remediation.*
