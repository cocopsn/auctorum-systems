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
                │   Nginx :443   │  TLS, rate limiting, vhost routing
                └───┬─────────┬──┘
                    │         │
        ┌───────────┴──┐   ┌──┴────────────┐
        │ web :3000    │   │ medconcierge  │
        │ (Next.js)    │   │ :3001         │
        └──────┬───────┘   └──────┬────────┘
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
            └─────────────────────────┘
```

Workers y crons corren con PM2 en el mismo VPS:
- `auctorum-worker` — consume la queue de WhatsApp, llama a OpenAI con tools,
  envía push notifications al doctor
- `auctorum-campaign-worker` — envío masivo de WhatsApp con rate-limit
- 5 crons (recordatorios, sincronización con Google Calendar, retry de webhooks,
  drenaje de operaciones pendientes de calendario, disparador de campañas)

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
  workers, telemetría JSON estructurada en stdout

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
| `docs/PWA.md`                          | Service worker, Web Push, íconos, VAPID        |
| `docs/CLOUDFLARE-EMAIL-ROUTING.md`     | Rutas de email entrante                        |
| `docs/SUPABASE-AUTH-TEMPLATES.md`      | Plantillas de magic link                       |
| `brand-identity.md`                    | Paleta, tipografía, copy                       |
| `apps/mobile/README.md`                | Expo + EAS para la app nativa                  |
| `docs/archive/`                        | Auditorías y QA reports históricos             |

## Estado actual (mayo 2026)

- 4 apps en producción, 8 packages compartidos
- 10 procesos PM2 + logrotate, todos `online` con cero errores
- 50 migraciones aplicadas (la última es `0050_web_push_subscriptions`)
- Cero `TODO/FIXME/XXX/HACK` markers en código fuente
- PWA instalable en iOS 16.4+, Android, Desktop con Web Push activo

## Licencia y autoría

© 2026 Auctorum. Saltillo, Coahuila, MX.
BDFL: Armando Flores · `armando@auctorum.com.mx`
