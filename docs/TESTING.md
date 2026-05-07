# Testing strategy

Real tests against real code. No placeholders, no `expect(true).toBe(true)`,
no skipped scaffolds. The rule:

> **A test that doesn't fail when it should is worse than no test.**

Every test in this repo points at production code, asserts a specific
contract, and breaks loudly when that contract drifts.

## Layout

```
tests/
├── setup.ts                            # global vitest setup (env stubs, log filtering)
├── unit/                               # pure functions, no I/O    — pnpm test:unit
│   ├── appointment-validator.test.ts
│   ├── plan-limits.test.ts
│   ├── specialty-templates.test.ts
│   ├── icd10.test.ts
│   ├── circuit-breaker.test.ts
│   ├── fallback-emergency.test.ts
│   ├── lead-autocontact.test.ts
│   ├── web-push.test.ts
│   └── document-analyzer.test.ts
├── integration/                        # talks to local Redis only — pnpm test:integration
│   ├── csrf-validation.test.ts
│   ├── rate-limit.test.ts
│   └── webhook-hmac.test.ts
├── ai/                                 # static analysis of LLM   — pnpm test:ai
│   └── hallucination-guard.test.ts     # prompts (no model calls)
└── e2e-vps/                            # HTTP against deployed VPS — pnpm test:e2e
    └── public-routes.test.ts             (separate config, not in test:run)
```

## Commands

```bash
pnpm test:run           # unit + integration + ai (all offline, deterministic, ~2s)
pnpm test               # same as above but in watch mode
pnpm test:unit          # just unit/
pnpm test:integration   # just integration/
pnpm test:ai            # just ai/
pnpm test:e2e           # HTTP against med.auctorum.com.mx (requires internet)
pnpm test:integrity     # real SQL audit against DATABASE_URL
pnpm test:coverage      # v8 coverage report (text + lcov)
pnpm test:ci            # verbose reporter for CI logs
```

## What's actually covered

### Unit (188 assertions, ~2 s)

| Suite | Targets |
|-------|---------|
| `appointment-validator` | `createAppointmentSchema` + `bookingFormSchema` — date/time regex, phone format, email, length caps |
| `plan-limits` | `PLAN_LIMITS`, `ADDON_PACKAGES`, `getPlanLimits`, `getAddonPackage`, `currentPeriod` |
| `specialty-templates` | All 7 templates: shape, welcome `{nombre}` placeholder, schedule HH:MM, `NUNCA` guard |
| `icd10` | `ICD10_COMMON` — WHO ICD-10 regex, no duplicates, includes E11.9/I10/K02.9 |
| `circuit-breaker` | Real `recordSuccess/recordFailure/isCircuitOpen` from `@quote-engine/ai` — opens at threshold, closes on success, half-open after reset window (uses `vi.useFakeTimers`) |
| `fallback-emergency` | Real `isEmergency` + `generateFallbackResponse` — true positives, true negatives, doesn't leak diagnosis verbs, businessName interpolation |
| `lead-autocontact` | `formatPhoneMX` — strip non-digits, prepend 52 for 10-digit MX, preserve existing 52 |
| `web-push` | `isWebPushConfigured`, `sendWebPush`, `sendWebPushBatch` — fail-soft contract when VAPID is unset |
| `document-analyzer` | `analyzeDocument` — fails to NEUTRAL when OPENAI_API_KEY unset, on 5xx, on bad JSON; coerces unknown types; rejects malformed dates |

### Integration

| Suite | Notes |
|-------|-------|
| `csrf-validation` | Imports the real `validateOrigin` and verifies cross-origin / scheme / port behavior. No server. |
| `rate-limit` | Imports the real Redis-backed `rateLimit`. **Auto-detects Redis availability** via a probe — if Redis is up, it asserts the over-limit path; if Redis is down, it asserts the documented fail-open contract. Never silent-skips. |
| `webhook-hmac` | Pins the SHA-256 HMAC algorithm Meta uses across WhatsApp / Lead Ads / Instagram webhooks. Tests against tampering, wrong secret, missing signature, malformed header, byte-perfect raw-body equality. |

### AI / static prompt analysis

| Suite | Notes |
|-------|-------|
| `hallucination-guard` | Iterates every entry of `SPECIALTY_TEMPLATES`. Each must contain `NUNCA`, mention emergency/urgent escalation, mention diagnosis/prescribe/medicate, contain at least one anti-diagnosis sentence, and have ≥5 emergency keywords. Welcome messages must contain `{nombre}` and not hardcode common patient names. |

### E2E against deployed VPS (`pnpm test:e2e`)

Excluded from `test:run`. Requires internet.

- Public routes (`/login`, `/signup`, `/privacy`, `/terms`, `/api-docs`, `/manifest.json`, `/sw.js`, `/icons/icon-192.png`) → 200
- Auth-gated routes without session → 401 / 307
- Webhook signature rejection paths (Stripe, Meta-leads, Instagram, Google-leads) → 400 / 401 / 403
- Web app legal redirects → no `dra-martinez` regression
- Security headers: HSTS, no `X-Powered-By`, X-Frame-Options DENY, X-Content-Type-Options nosniff, CSP present

These tests stay on **rejection paths** so they never mutate prod data and
never trip live rate limits.

### Data integrity (`pnpm test:integrity`)

Runs `scripts/check-data-integrity.ts` — real SQL against the production
`DATABASE_URL` (loaded from `apps/medconcierge/.env.local`). Each check is a
single SELECT asserting an invariant count = 0:

- No null `tenant_id` on `patients`, `appointments`, `patient_payments`
- Cross-tenant FK consistency: `appointments.tenant_id == patients.tenant_id` (and `clinical_records`, `patient_payments`)
- No orphans: `campaign_messages`, `messages`, `appointment_events`, `ad_leads.appointment_id`, `documents.patient_id`, `web_push_subscriptions.user_id`
- NOM-004: every `clinical_records` row with `is_locked=true` MUST have `doctor_cedula` snapshot
- Uniqueness: `(tenant_id, phone)` on `patients`, `slug` on `tenants`, `(tenant_id, type)` on `integrations`

Each check classified as `fatal` or `warn`. Exit code 1 only on fatal
failures — designed to run as a daily PM2 cron without false noise.

Output is one JSON line per check + a summary line, ready for Loki / Datadog
ingestion.

## Adding a new test

1. Pick the right tier (`unit/`, `integration/`, `ai/`, `e2e-vps/`).
2. Import the **real** export under test. Never invent function names.
3. Each `it(...)` asserts ONE specific contract. Avoid `expect(true).toBe(true)`.
4. If the test would always pass when the feature is missing — it's a bad
   test. Make it fail-prone: assert presence, structure, regex, exact value.
5. If it requires an external service that isn't deterministic, either mock
   (vitest's `vi.spyOn(globalThis, 'fetch').mockResolvedValue(...)`) or move
   the suite into `tests/e2e-vps/`.
6. Run `pnpm test:run` before committing.

## CI hookup (recommended, not yet wired)

Add a GitHub Actions step:

```yaml
- run: corepack pnpm install --frozen-lockfile
- run: corepack pnpm test:ci   # full unit + integration + ai
```

Optional nightly job:

```yaml
- run: corepack pnpm test:e2e         # 30s, hits prod
- run: corepack pnpm test:integrity   # 1s, hits Supabase Postgres
```

## Coverage target

Not enforced yet. The goal is meaningful coverage of:

- All exports from `packages/ai/`
- All exports from `packages/notifications/`
- Schemas + helpers in `apps/medconcierge/src/lib/`

Run `pnpm test:coverage` to see the v8 lcov report. Don't chase numbers —
chase contract coverage of the modules listed above.
