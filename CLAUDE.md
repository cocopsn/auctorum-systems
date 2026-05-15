# CLAUDE.md — Auctorum

Este archivo es el contrato operativo para agentes (Claude Code, Codex,
sub-agents). Si tocas el repo, asume estas reglas. Para humanos, ver `README.md`.

## Proyecto

Monorepo pnpm workspace · Next.js 14 App Router · Drizzle ORM · multi-tenant SaaS.

```
apps/
  web/                  → Landing corporativa + Motor B2B (puerto 3000)
  medconcierge/         → Concierge Médico (puerto 3001) — PWA instalable
  mobile/               → React Native + Expo Router (no comparte node_modules)
  worker/               → Worker workspace dedicado (legacy, en migración)

packages/
  db/                   → Drizzle ORM + schemas + migraciones (50+ migraciones)
  ai/                   → OpenAI agent runner, tool calling, fallbacks, usage tracking
  notifications/        → WhatsApp Cloud, Resend email, Expo push, Web Push (VAPID)
  payments/             → Stripe + MercadoPago (Connect, Checkout, webhooks)
  pdf/                  → @react-pdf/renderer (cotizaciones, recibos)
  queue/                → BullMQ wrappers
  events/               → Realtime helpers
  ui/                   → AppShell, NotificationBell, shared dashboard primitives

scripts/
  worker.ts             → Worker WhatsApp principal (consume queue, llama IA)
  campaign-worker.ts    → Worker de campañas masivas
  cron-*.ts             → 11 crons:
                          - reminders (4h), appointment-reminders (15min),
                            calendar-sync (5min), calendar-pending (5min)
                          - campaigns (10min), webhook-retries (5min)
                          - weekly-report (lun 8am), data-integrity (diario 6am)
                          - dlq-monitor (15min), data-deletion (4am LFPDPPP)
                          - follow-ups (15min), tenant-cleanup (5am unverified)
  generate-pwa-icons.mjs → Genera íconos PWA con sharp
  nginx-upstream-patch.sh → Idempotente: añade upstream pools al nginx site
  find-dead-components.mjs → Best-effort detector de componentes huérfanos
  seed-kb-dra-martinez.ts        → Embeddings KB para el bot RAG
  seed-dra-martinez-month.ts     → Mes de actividad realista (idempotente)
```

## Comandos

```bash
pnpm build                 # Build web + medconcierge (OBLIGATORIO antes de push)
pnpm build:web             # Solo web
pnpm build:med             # Solo medconcierge
pnpm dev:web               # Dev :3000
pnpm dev:med               # Dev :3001
pnpm db:generate           # Generar migración Drizzle desde schema
pnpm db:migrate            # Aplicar migraciones (usa DATABASE_URL)
pnpm test:run              # 215 tests (unit + integration + AI), ~2s
pnpm test:integrity        # SQL invariants contra Postgres real
```

CI corre `pnpm install --frozen-lockfile && pnpm test:run && pnpm build` en
cada PR y push a main (`.github/workflows/ci.yml`). Si CI falla, no se hace
deploy.

Ver `apps/mobile/README.md` para el flujo de Expo / EAS.

## Stack

Next.js 14.2 · React 18 · TypeScript 5.4 (strict) · Tailwind 3.4 · Drizzle ORM ·
Supabase Postgres (vía pooler `aws-1-us-east-1.pooler.supabase.com:6543`) ·
BullMQ + Redis · PM2 · Nginx + Let's Encrypt · Cloudflare DNS+CDN ·
WhatsApp Cloud API · Resend · OpenAI · MercadoPago + Stripe Connect ·
Expo + React Native (mobile) · Web Push (VAPID, iOS 16.4+).

## Hosts y dominios

- `auctorum.com.mx` — landing corporativa + B2B (web :3000)
- `portal.auctorum.com.mx` — dashboard B2B (web :3000, redirect / → /dashboard)
- `med.auctorum.com.mx` — landing+app medconcierge (medconcierge :3001)
- `<tenant>.auctorum.com.mx` — landings públicas de tenants:
  - prefijo `dr-`, `dra-`, `doc-` → routea a medconcierge :3001
  - cualquier otro slug → routea a web :3000 (`/[tenant]/...`)

`auctorum.com.mx/{privacy,terms,cookies,ai-policy}` redirigen a su equivalente
en `med.auctorum.com.mx` (texto canónico). NUNCA hardcodear `dra-martinez` ni
ningún tenant en redirecciones de marketing.

## Arquitectura Multi-Tenant

Middleware extrae el subdominio → header `x-tenant-slug` → rewrite a
`/[tenant]/...`. SIEMPRE filtrar queries por `tenant_id`. Cada API route
empieza con `getAuthTenant()` (medconcierge) o `getAuthTenant()` (web), y
todas las queries usan `eq(table.tenantId, auth.tenant.id)`.

Rutas estáticas que el middleware DEBE excluir del rewrite:
- `/systems`, `/platform`, `/about`, `/login`, `/signup` (web)
- `/manifest.json`, `/sw.js`, `/icons/*`, `/screenshots/*` (medconcierge — PWA)
- `/api/*`, `/_next/*`, archivos con extensiones estáticas

## Reglas Absolutas

- NUNCA commitear `.env.local`, secrets, passwords, API keys, VAPID privates,
  service-role tokens, BullMQ creds. `.env.local` ya está en `.gitignore`.
- NUNCA usar `output: 'standalone'` en `next.config.js` (rompe el monorepo
  resolver de pnpm).
- NUNCA hacer `DELETE` real en DB para datos de negocio — soft delete con
  `deletedAt`/`isActive`. La excepción es `web_push_subscriptions` cuando el
  endpoint devuelve 410/404 (la subscripción ya está muerta upstream).
- SIEMPRE verificar que `pnpm build` pasa ANTES de commit/push.
- SIEMPRE correr `pnpm test:run` antes de cada push. Tests viven en `tests/`
  con vitest, ver `docs/TESTING.md`. Cero placeholders (`expect(true).toBe(true)`)
  permitidos — un test que no falla cuando debería es peor que no tener test.
- SIEMPRE usar `zod` para validar inputs en API routes.
- SIEMPRE wrappear handlers en `try/catch` y devolver 500 limpio (no stack).
- SIEMPRE usar el API `cookies: { getAll, setAll }` con `@supabase/ssr@0.10+`
  (NO el legacy `get/set/remove` — falla silenciosamente con sessions chunked
  > 4 KB). Patrón en `apps/medconcierge/src/middleware.ts`.
- SIEMPRE usar `supabase.auth.getUser()` (server-validado) en lugar de
  `getSession()` (cookie-trusted) en server routes y server components.
- SIEMPRE proveer fallback `OBJ[key] ?? OBJ.default` cuando indexes un
  Record-style enum-keyed map en una página dashboard. Un valor enum nuevo
  + UI vieja → undefined.tone → "Application error" en blanco.
- SIEMPRE wrappear llamadas a Google Calendar con `calendarWithFallback` para
  que las fallas se cuelen en `pending_calendar_ops` y el cron las re-intente.
- SIEMPRE pasar acciones rate-limit-sensibles por `checkAndTrackUsage` con
  el plan del tenant.
- SIEMPRE castear params en `db.execute(sql\`...\`)` cuando comparas contra
  columnas tipadas. `tenant_id = ${id}::uuid`, `date BETWEEN ${from}::date AND
  ${to}::date`. `postgres-js` envía params como `text`; uuid/date = text falla
  en algunas configs del pooler (rompió `/api/dashboard/stats` el 2026-05-07
  y `/api/dashboard/reports/{revenue,appointments}` el 2026-05-08). Drizzle
  `eq()` y `between()` ya tipan, sólo `sql\`...\`` raw requiere el cast.
- SIEMPRE escribir SQL contra el schema EXACTO de Drizzle, no contra columnas
  inventadas. `bot_instances` no tiene `last_seen_at` ni `verify_token` como
  columnas — `verify_token` vive en `config` JSONB (`config ? 'verify_token'`).
  Antes de escribir un SELECT contra una tabla nueva, lee
  `packages/db/schema/<tabla>.ts`.
- SIEMPRE comparar bot status con `'active'` (el único valor que escribe
  `worker.ts` y `campaign-worker.ts`), NO con `'live'`. Heartbeat real para el
  pill viene de `MAX(messages.created_at) WHERE direction='outbound' AND
  sender_type='bot'`, no de `bot_instances.updated_at` (que sólo se mueve al
  guardar config).
- SIEMPRE proveer fallback a env vars cuando el código lee secretos de
  `bot_instances.config`. Migración `0040_ai_routing_seed.sql` guarda
  `channel_mode='shared'` y deja vacíos `app_secret`/`verify_token` esperando
  que vengan de env. Sin el fallback, el webhook devuelve 403 invalid HMAC
  para todos los mensajes de Meta. Patrón:
  `cfg.app_secret ?? process.env.WHATSAPP_APP_SECRET`.
- SIEMPRE conectar a la VPS por SSH **puerto 2222** (no 22 default), usuario
  `root`. La app vive en `/opt/auctorum-systems/repo` (no `/var/www`). PM2
  corre como usuario `auctorum` (`HOME=/home/auctorum`), no root.
- PM2 script path: `node_modules/next/dist/bin/next` (NO `.bin/next`).
- PM2 cluster mode está PROHIBIDO para los procesos Next.js — Next no
  comparte el socket limpiamente y cada cluster worker secundario crashea
  con `Failed to start server` en loop. Usar `exec_mode: 'fork'` con dos
  procesos en puertos distintos (web 3000+3010, med 3001+3011) y
  round-robin en Nginx vía upstream pool. Ver `ecosystem.config.js` y
  `scripts/nginx-upstream-patch.sh`.
- CERO `TODO/FIXME/XXX/HACK` markers en `apps/`, `packages/`, `scripts/`. Si
  algo no se puede completar, se elimina; no se deja como TODO.
- CERO placebos. Si un toggle / botón / endpoint no funciona end-to-end,
  se quita del UI antes de mergear. La regla es: lo que el usuario ve
  funciona o no existe. Cada vez que añadas un endpoint gated por plan,
  verifica que el `lib/plan-gating.ts` y la UI tienen el badge "PRO" + el
  modal `UpgradePrompt` correctos.
- Plan gating server-side OBLIGATORIO en cada endpoint pagado. Usar
  `hasFeature(plan, '<feature>')` desde `@/lib/plan-gating` y devolver
  402 + `code:'PLAN_LIMIT'` + `feature:'<key>'`. El front intercepta vía
  `usePlanGate` hook y dispara `<UpgradePrompt>`.
- Roles tenant: `admin | secretaria | operator | viewer`. La matriz de
  capabilities vive en `apps/medconcierge/src/lib/permissions.ts`. NUNCA
  hardcodear `if (role === 'admin')` — usar `can(role, capability)`.

## Procesos en producción (PM2)

Apps Next.js en **fork mode** (no cluster — ver "Reglas Absolutas").

| Proceso | Puerto | Tipo / Frecuencia |
|---------|--------|-------------------|
| auctorum-web-1                | :3000 | fork, long-running |
| auctorum-web-2                | :3010 | fork, long-running |
| auctorum-med-1                | :3001 | fork, long-running |
| auctorum-med-2                | :3011 | fork, long-running |
| auctorum-worker x2            | —     | BullMQ WhatsApp queue |
| auctorum-campaign-worker      | —     | BullMQ campaigns queue |
| cron-reminders                | —     | cada 4h |
| cron-appointment-reminders    | —     | cada 15min |
| cron-calendar-sync            | —     | cada 5min |
| cron-calendar-pending         | —     | cada 5min |
| cron-campaigns                | —     | cada 10min |
| cron-webhook-retries          | —     | cada 5min |
| cron-weekly-report            | —     | lunes 8am |
| cron-data-integrity           | —     | diario 6am |
| cron-dlq-monitor              | —     | cada 15min |
| cron-data-deletion            | —     | diario 4am (LFPDPPP) |
| cron-follow-ups               | —     | cada 15min |
| cron-tenant-cleanup           | —     | diario 5am (stale unverified) |
| pm2-logrotate                 | —     | module |

`ecosystem.config.js` carga `.env.local` de cada app dinámicamente al arrancar.

Nginx hace round-robin entre web-1/web-2 y med-1/med-2 con `upstream` pools
+ `keepalive=8`. Ver `scripts/nginx-upstream-patch.sh` (idempotente).

## Med CRM features (mayo 2026)

5 features médico-CRM integrados al dashboard:
- **Help bot** — `/api/dashboard/help-bot` + `<HelpBot/>` flotante. gpt-4o-mini
  con prompt scoped al producto. Rate-limit 30 mensajes/tenant/5min vía Redis.
- **Reporte semanal** — `cron-weekly-report` (PM2 `0 8 * * 1`
  America/Monterrey). KPIs por tenant vía WhatsApp. Skip si no-phone, opted-out
  o cero actividad.
- **Instagram inbox** — `/api/webhooks/instagram` (HMAC con `META_APP_SECRET`),
  resuelve tenant por `integrations.config->>'pageId'` con `type='instagram_dm'`.
  Outbound vía `sendInstagramMessage` cuando `conversations.channel='instagram'`.
  Sin auto-reply IA por ahora (worker solo soporta WA — lo añadimos cuando se
  pida).
- **Smart documents** — `/documentos`. Drag-drop PDF/image → bucket `documents`
  bootstrapped con service-role → pdf-parse + gpt-4o-mini classify → match
  paciente fuzzy. `documents` table 0053. Tipos: `lab_result | radiology |
  prescription | referral | insurance | other`.
- **Comms timeline** — `patient_communications` table 0054. `sendEmail` ya
  acepta `{ tenantId, patientId, createdBy }` opcional y trackea automático.
  Ledger append-only (`note | call | email_* | whatsapp_*`).

Ver `docs/MED-CRM-FEATURES.md` para flow diagrams + setup completo.

## Lead Ads CRM

Webhooks públicos en `apps/medconcierge/src/app/api/webhooks/`:
- `/api/webhooks/meta-leads` — Facebook/Instagram Lead Ads (HMAC `META_APP_SECRET`,
  resuelve tenant por `integrations.config->>'pageId'` con `type='meta_ads'`)
- `/api/webhooks/google-leads` — Google Ads Lead Forms (token-gated,
  resuelve por `integrations.config->>'webhookToken'` con `type='google_ads'`)

Ambos insertan en `ad_leads` y disparan `autoContactLead(tenant, lead)`
(`apps/medconcierge/src/lib/lead-autocontact.ts`) — best-effort, nunca rompen
la captura.

Pipeline visible: `new → contacted → responded → appointed → converted` (con
`lost` como side branch). El doctor maneja el kanban en `/leads`.

Settings UI en `/settings/ads` permite conectar/desconectar Meta + Google,
rotar el token de Google, y editar el mensaje de auto-contacto. La config
vive en `integrations` (UNIQUE por `tenant_id+type`), NO en `tenants.config`.

Ver `docs/ADS-LEADS.md` para setup completo en Meta App + Google Ads.

## Resiliencia

- **Circuit breaker** — `isCircuitOpen/recordSuccess/recordFailure` en
  `@quote-engine/ai`. El worker abre el circuito tras N fallos consecutivos
  de OpenAI y devuelve un fallback en español hasta que cierra.
- **Calendar fallback** — toda llamada a Google Calendar pasa por
  `calendarWithFallback`. Si falla (token expirado, red, 5xx) la operación se
  encola en `pending_calendar_ops` y `cron-calendar-pending` la reintenta.
- **Rate limiting** — `checkAndTrackUsage(tenantId, plan, metric, n)` en cada
  punto de uso (worker WhatsApp, API v1). 429 con `Retry-After` y
  `X-RateLimit-Remaining`.
- **Webhook retries** — fallas de webhook se persisten en `webhook_failures`
  y `cron-webhook-retries` re-procesa cada 5min con backoff.
- **Push notifications** — best-effort en ambos transports (Expo + Web Push).
  Endpoints muertos (404/410) se podan automáticamente en el helper.
- **Tenant cleanup** — `cron-tenant-cleanup` (diario 5am) sweep tenants stuck
  en `unverified`/`pending_plan` > 14 días: soft-delete, libera slug con
  sufijo, borra orphan Supabase auth identity.
- **Sentry** — `@sentry/nextjs` cableado en ambas apps con PII strip en
  `beforeSend` (medical SaaS → LFPDPPP). Auto-disabled si
  `NEXT_PUBLIC_SENTRY_DSN` no está seteado (CI builds, dev local).
- **Disaster recovery** — `docs/DISASTER-RECOVERY.md` con 4 escenarios
  (VPS muerta, DB corrupta, secrets comprometidos, deploy malo) + drill de
  backup restore con Docker Postgres throwaway.

## Referencias (lee ANTES de tocar un dominio)

- `README.md` — overview alto nivel para humanos
- `docs/ARCHITECTURE.md` — diagrama completo de cómo se conectan las piezas
- `docs/DEPLOYMENT.md` — VPS, Nginx, PM2, SSL, DNS, flujo de deploy
- `docs/PWA.md` — PWA, service worker, Web Push, VAPID, generación de íconos
- `docs/ADS-LEADS.md` — Lead Ads CRM (Meta + Google webhooks, pipeline, settings)
- `docs/MED-CRM-FEATURES.md` — Help bot, reporte semanal, Instagram inbox,
  documents AI, patient comms timeline
- `docs/TESTING.md` — vitest unit/integration/ai/e2e-vps + integrity script,
  cómo agregar tests sin caer en placebos
- `docs/CLOUDFLARE-EMAIL-ROUTING.md` — rutas de email entrante
- `docs/SUPABASE-AUTH-TEMPLATES.md` — plantillas de magic link
- `docs/ONBOARDING.md` — paso a paso para provisionar un cliente nuevo
  (ruta corta vía script + ruta larga manual + variantes + troubleshooting)
- `docs/DISASTER-RECOVERY.md` — runbook 3am (4 escenarios, comandos shell)
- `brand-identity.md` — identidad, paleta, tipografía, copy
- `apps/mobile/README.md` — Expo + EAS para la app nativa
- `docs/archive/` — auditorías y QA reports históricos (NO son fuente de verdad)

## Orquestación

Cuando una tarea toca varios dominios, despacha sub-agents en paralelo:
- **Frontend** — components, Tailwind, animaciones, responsive
- **Backend** — API routes, DB, validación, webhooks, queues
- **Infra** — `next.config.js`, `tailwind.config.js`, `globals.css`,
  `layout.tsx`, `middleware.ts`, `ecosystem.config.js`, `nginx`

Cada sub-agent trabaja aislado. El agente principal verifica conflictos,
corre `pnpm build`, hace SCP+restart en VPS, y solo entonces commit+push.
