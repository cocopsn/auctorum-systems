# Auctorum Systems

Plataforma SaaS multi-tenant para automatización de operaciones B2B y consultorios médicos.
Monorepo Next.js 14 + React Native + Drizzle ORM, desplegado en un VPS DigitalOcean
detrás de Nginx + Cloudflare.

## Productos

| Producto              | Stack                              | Dominio                                |
|-----------------------|------------------------------------|----------------------------------------|
| **Auctorum Systems**  | Landing corporativa + Motor B2B    | `auctorum.com.mx`                      |
| **MedConcierge AI**   | Concierge médico (PWA instalable)  | `med.auctorum.com.mx`                  |
| **Auctorum Med App**  | App nativa iOS + Android (Expo)    | distribución TestFlight / EAS          |
| **Tenant landings**   | Páginas públicas white-label       | `<slug>.auctorum.com.mx`               |

## Arquitectura

```
                ┌────────────────┐
                │   Cloudflare   │  DNS + CDN + WAF
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │   Nginx :443   │  TLS, rate limit, vhost routing,
                │                │  upstream round-robin (keepalive)
                └───┬─────────┬──┘
                    │         │
        ┌───────────┴──┐   ┌──┴────────────────────┐
        │ web upstream │   │ med upstream          │
        │ (3000+3010)  │   │ (3001+3011)           │
        │ Next.js x2   │   │ Next.js x2 — PWA      │
        └──────┬───────┘   └──────┬────────────────┘
               │                  │
               └────────┬─────────┘
                        │
            ┌───────────┴─────────────┐
            │  Supabase Postgres      │  + Drizzle ORM
            │  Redis + BullMQ         │
            │  WhatsApp Cloud API     │
            │  OpenAI                 │
            │  Resend (email)         │
            │  Stripe + MercadoPago   │
            │  Google Calendar API    │
            │  Sentry (errors + APM)  │
            └─────────────────────────┘
```

Cada app Next se ejecuta en **dos procesos PM2 en `fork` mode** (no cluster —
Next.js no comparte el socket limpiamente). Nginx hace round-robin entre los
dos puertos por upstream pool con `keepalive=8`.

Workers y crons corren con PM2 en el mismo VPS:
- `auctorum-worker` x2 — consume la queue de WhatsApp, llama a OpenAI con tools,
  envía push notifications al doctor
- `auctorum-campaign-worker` — envío masivo de WhatsApp con rate-limit
- 11 crons (recordatorios, sincronización con Google Calendar, retry de webhooks,
  drenaje de pending_calendar_ops, disparador de campañas, reporte semanal,
  integridad de datos, DLQ monitor, data deletion ARCO/LFPDPPP, follow-ups,
  cleanup de tenants stale)

## Stack técnico

- **Runtime** — Node.js 20, pnpm 10 workspace
- **Frontend** — Next.js 14 (App Router), React 18, TypeScript 5 strict,
  Tailwind 3.4
- **Backend** — Next.js API routes con `force-dynamic`, BullMQ workers en TypeScript
- **DB** — Supabase Postgres (pooler IPv4) + Drizzle ORM con 50+ migraciones SQL
- **Auth** — Supabase Auth (magic link + passwordless), CSRF validado por Origin,
  cookies cross-subdomain con `.auctorum.com.mx`
- **IA** — OpenAI tool-calling con circuit breaker, fallback a respuesta canónica
  cuando el modelo no responde
- **Pagos** — Stripe Checkout + Stripe Connect (suscripciones SaaS y pagos a
  doctores), MercadoPago Checkout Pro (pacientes en MX)
- **Mobile** — React Native 0.74 + Expo SDK 51 + Expo Router, Expo Push
  Notifications
- **PWA** — Service Worker con cache network-first, Web Push (VAPID),
  install prompt iOS+Android, deep-linking via `notificationclick`
- **Observabilidad** — PM2 con logrotate (30 días), heartbeats cada 5min en
  workers, telemetría JSON estructurada en stdout, Sentry (auto-disabled si
  no hay DSN), GitHub Actions CI sobre cada PR + push a main
- **Compliance** — LFPDPPP Art. 32 vía `cron-data-deletion`, NOM-004-SSA3-2012
  vía firma criptográfica + retención 5 años en `clinical_records`, cookie
  consent + cédula snapshot al firmar
- **Plan gating** — server-side en 8 endpoints (campañas, smart documents,
  v1 API, Stripe Connect, Instagram, reports export). 402 + `code:'PLAN_LIMIT'`
  + `UpgradePrompt` modal en el front. Sidebar muestra "PRO" badge en items
  bloqueados

## Quickstart (desarrollo local)

```bash
# 1. Clonar e instalar
git clone https://github.com/cocopsn/auctorum-systems.git
cd auctorum-systems
corepack enable && corepack pnpm install

# 2. Configurar env
cp apps/web/.env.example         apps/web/.env.local
cp apps/medconcierge/.env.example apps/medconcierge/.env.local
# Llenar DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, OPENAI_API_KEY,
# WHATSAPP_TOKEN, STRIPE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, etc.

# 3. Migrar DB
pnpm db:migrate

# 4. Arrancar
pnpm dev:web    # :3000
pnpm dev:med    # :3001
```

Para arrancar el worker localmente:

```bash
pnpm tsx scripts/worker.ts
```

## Estructura del repo

```
auctorum-systems/
├── apps/
│   ├── web/              # Landing + Motor B2B (puerto 3000)
│   ├── medconcierge/     # Concierge Médico — PWA (puerto 3001)
│   ├── mobile/           # React Native + Expo
│   └── worker/           # Workspace dedicado (en migración)
├── packages/
│   ├── db/               # Drizzle ORM + schemas + migraciones
│   ├── ai/               # OpenAI agent runner, tools, fallbacks, usage
│   ├── notifications/    # WhatsApp, Resend, Expo Push, Web Push
│   ├── payments/         # Stripe + MercadoPago
│   ├── pdf/              # @react-pdf/renderer
│   ├── queue/            # BullMQ wrappers
│   ├── events/           # Realtime helpers
│   └── ui/               # AppShell + componentes compartidos
├── scripts/              # worker.ts, cron-*.ts, deploy.sh, generate-pwa-icons.mjs
├── docs/                 # ARCHITECTURE, DEPLOYMENT, PWA, etc.
└── ecosystem.config.js   # PM2 (10 procesos)
```

## Documentación

| Doc                                    | Para qué                                       |
|----------------------------------------|------------------------------------------------|
| `CLAUDE.md`                            | Reglas operativas para agentes AI              |
| `docs/ARCHITECTURE.md`                 | Diagrama detallado del sistema y data flow     |
| `docs/DEPLOYMENT.md`                   | VPS, Nginx, PM2, SSL, DNS, deploy step-by-step |
| `docs/DISASTER-RECOVERY.md`            | Runbook 3am — VPS muerta, DB corrupta, secrets |
| `docs/PWA.md`                          | Service worker, Web Push, íconos, VAPID        |
| `docs/ADS-LEADS.md`                    | Lead Ads CRM (Meta + Google + auto-contacto)   |
| `docs/MED-CRM-FEATURES.md`             | Help bot, weekly report, IG inbox, docs, comms |
| `docs/TESTING.md`                      | Vitest layout, what's covered, how to add tests|
| `docs/CLOUDFLARE-EMAIL-ROUTING.md`     | Rutas de email entrante                        |
| `docs/SUPABASE-AUTH-TEMPLATES.md`      | Plantillas de magic link                       |
| `docs/ONBOARDING.md`                   | Paso a paso para provisionar un tenant nuevo   |
| `brand-identity.md`                    | Paleta, tipografía, copy                       |
| `apps/mobile/README.md`                | Expo + EAS para la app nativa                  |
| `docs/archive/`                        | Auditorías y QA reports históricos             |

## Estado actual (mayo 2026)

- 4 apps en producción, 8 packages compartidos
- **14+ procesos PM2** + logrotate. Apps Next.js en fork mode x2 cada una
  (web-1/web-2/med-1/med-2). Cero "Failed to start server" desde el cutover
  a fork mode + Nginx upstream.
- **61 migraciones aplicadas** (última: `0061_secretaria_role.sql`)
- Cero `TODO/FIXME/XXX/HACK` markers en código fuente
- PWA instalable en iOS 16.4+, Android, Desktop con Web Push activo
- Lead Ads CRM activo (captura Meta + Google → WhatsApp en menos de 60s)
- 5 features médico-CRM: help bot, weekly KPI report, Instagram unified
  inbox, smart document classification (gated Auctorum+), patient comms
  timeline
- **215 vitest tests** pasando (unit + integration + AI guard) en ~2s, más
  e2e suite contra la VPS desplegada y auditoría SQL diaria
  (`pnpm test:integrity`)
- **Plan tier gating real** vía `apps/{medconcierge,web}/lib/plan-gating.ts`.
  402 + `code:'PLAN_LIMIT'` en 8 endpoints, `UpgradePrompt` modal en el
  front, sidebar "PRO" badge en items bloqueados/desbloqueados.
- **Rol secretaria** (admin/secretaria/operator/viewer/super_admin) con
  capability matrix en `apps/medconcierge/src/lib/permissions.ts`.
  Secretaria: lectura general + escritura limitada (pacientes, citas,
  conversaciones). Excluida de refunds, team invite, campañas, firma
  clínica, borrado de pacientes.
- **Portal builder** para landings públicas — drag-and-drop de 9 tipos de
  sección (hero, about, services, gallery, testimonials, team, faq, contact,
  cta). Subdominio del tenant renderea la página pública con
  `force-dynamic` para que los cambios del dashboard se vean inmediatamente.
- **Subscription bypass cerrado** en ambas apps — cualquier cambio de plan
  requiere Stripe Checkout. Pre-fix anyone autenticado podía auto-upgradearse
  gratis con un PATCH a `/api/dashboard/settings/subscription`.
- **CI/CD**: `.github/workflows/ci.yml` corre tests + build en cada PR y
  push a main. Sentry wired en ambas apps (auto-disabled si no hay DSN).
  Disaster recovery runbook documentado en `docs/DISASTER-RECOVERY.md`.

## Licencia y autoría

© 2026 Auctorum. Saltillo, Coahuila, MX.
BDFL: Armando Flores · `armando@auctorum.com.mx`
