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
  cron-*.ts             → 5 crons (reminders, calendar-sync, calendar-pending,
                          campaigns, webhook-retries)
  generate-pwa-icons.mjs → Genera íconos PWA con sharp
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
```

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
- SIEMPRE usar `zod` para validar inputs en API routes.
- SIEMPRE wrappear handlers en `try/catch` y devolver 500 limpio (no stack).
- SIEMPRE wrappear llamadas a Google Calendar con `calendarWithFallback` para
  que las fallas se cuelen en `pending_calendar_ops` y el cron las re-intente.
- SIEMPRE pasar acciones rate-limit-sensibles por `checkAndTrackUsage` con
  el plan del tenant.
- PM2 script path: `node_modules/next/dist/bin/next` (NO `.bin/next`).
- CERO `TODO/FIXME/XXX/HACK` markers en `apps/`, `packages/`, `scripts/`. Si
  algo no se puede completar, se elimina; no se deja como TODO.

## Procesos en producción (PM2, 10 + logrotate)

| id | Proceso | Función | Frecuencia |
|----|---------|---------|------------|
| 0  | auctorum-quote-engine    | web :3000                | long-running |
| 1  | auctorum-medconcierge    | medconcierge :3001       | long-running |
| 2  | cron-reminders           | Recordatorios genéricos  | cada 4h |
| 3  | cron-appointment-reminders | Recordatorios de citas | cada 15min |
| 4  | cron-calendar-sync       | Sync hacia Google Cal    | cada 5min |
| 5  | auctorum-worker          | WhatsApp queue consumer  | long-running |
| 6  | auctorum-campaign-worker | Envío masivo de campañas | long-running |
| 7  | cron-campaigns           | Disparador de campañas   | cada 10min |
| 9  | cron-webhook-retries     | Reintenta webhooks 5xx   | cada 5min |
| 10 | cron-calendar-pending    | Drena pending_calendar_ops | cada 5min |
| 8  | pm2-logrotate            | Module                   | — |

`ecosystem.config.js` carga `.env.local` de cada app dinámicamente al arrancar.

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

## Referencias (lee ANTES de tocar un dominio)

- `README.md` — overview alto nivel para humanos
- `docs/ARCHITECTURE.md` — diagrama completo de cómo se conectan las piezas
- `docs/DEPLOYMENT.md` — VPS, Nginx, PM2, SSL, DNS, flujo de deploy
- `docs/PWA.md` — PWA, service worker, Web Push, VAPID, generación de íconos
- `docs/CLOUDFLARE-EMAIL-ROUTING.md` — rutas de email entrante
- `docs/SUPABASE-AUTH-TEMPLATES.md` — plantillas de magic link
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
