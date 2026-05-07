# Architecture

Mapa detallado de cómo se conectan las piezas del sistema, qué hace cada una,
y por dónde fluyen los datos en los flujos críticos.

## Topología

```
                    ┌─────────────────────────┐
                    │  Cloudflare DNS + CDN   │
                    │  (proxy naranja, WAF)   │
                    └────────────┬────────────┘
                                 │
                                 │ TLS al edge
                                 │
        ┌────────────────────────▼───────────────────────────┐
        │   VPS DigitalOcean Ubuntu 24.04 LTS                │
        │   2 vCPU · 8 GiB RAM · 154 GiB disk · IP única     │
        │                                                    │
        │   ┌──────────────────────────────────────────┐    │
        │   │ Nginx :443 (Let's Encrypt cert)          │    │
        │   │ - rate limit /api → 30 req/min           │    │
        │   │ - rate limit /quotes → 10 req/min        │    │
        │   │ - HSTS, CSP, X-Frame-Options, etc.       │    │
        │   └──────┬───────────────────┬───────────────┘    │
        │          │                   │                    │
        │   ┌──────▼──────┐     ┌──────▼──────────┐         │
        │   │ web :3000   │     │ medconcierge    │         │
        │   │ Next.js 14  │     │ :3001 Next.js   │         │
        │   └─────────────┘     └─────────────────┘         │
        │          │                   │                    │
        │          └───────┬───────────┘                    │
        │                  │                                │
        │   ┌──────────────┼─────────────────────┐          │
        │   │ PM2 process tree                   │          │
        │   │ - auctorum-worker (BullMQ)         │          │
        │   │ - auctorum-campaign-worker         │          │
        │   │ - cron-reminders (4h)              │          │
        │   │ - cron-appointment-reminders (15m) │          │
        │   │ - cron-calendar-sync (5m)          │          │
        │   │ - cron-calendar-pending (5m)       │          │
        │   │ - cron-campaigns (10m)             │          │
        │   │ - cron-webhook-retries (5m)        │          │
        │   └────────────────────────────────────┘          │
        │                                                    │
        │   Redis (BullMQ queue + circuit breaker state)    │
        └──────────────┬─────────────────────────────────────┘
                       │
        ┌──────────────┴────────────────────────────┐
        │                                           │
        ▼                                           ▼
┌────────────────┐                        ┌──────────────────┐
│ Supabase       │                        │ Servicios externos│
│ - Postgres     │                        │ - OpenAI          │
│ - Auth         │                        │ - WhatsApp Cloud  │
│ - Storage      │                        │ - Resend          │
└────────────────┘                        │ - Stripe + MP     │
                                          │ - Google Calendar │
                                          │ - Expo Push       │
                                          └──────────────────┘
```

## Routing por host

Nginx mapea cada vhost a su upstream. La parte fina (extracción de tenant
slug, rewrite a `/[tenant]/...`, gating de auth en `/dashboard`) se hace en
los `middleware.ts` de cada app.

| Host                                    | Upstream             | Rol                                      |
|-----------------------------------------|----------------------|------------------------------------------|
| `auctorum.com.mx`                       | web :3000            | Landing corporativa + B2B                |
| `www.auctorum.com.mx`                   | web :3000            | Redirect canonical a apex                |
| `portal.auctorum.com.mx`                | web :3000            | Dashboard B2B (/ → /dashboard)           |
| `med.auctorum.com.mx`                   | medconcierge :3001   | Landing + dashboard medconcierge + PWA   |
| `dr-*.auctorum.com.mx`                  | medconcierge :3001   | Landing pública del consultorio          |
| `dra-*.auctorum.com.mx`                 | medconcierge :3001   | (igual)                                  |
| `doc-*.auctorum.com.mx`                 | medconcierge :3001   | (igual)                                  |
| `<otro-slug>.auctorum.com.mx`           | web :3000            | Tenant B2B → rewrite a `/[tenant]`       |

## Capa de datos

### Schemas (packages/db/schema/\*.ts)

Cada tabla tiene `tenantId` y RLS por `app.current_tenant_id`. La política
es ALL `USING tenant_id::text = current_setting('app.current_tenant_id')`
y `WITH CHECK` igual.

Grupos:
- **Core**: `tenants`, `users`, `bot_instances`, `user_dashboard_preferences`
- **B2B Quote Engine**: `clients`, `products`, `quotes`, `quote_items`,
  `quote_events`
- **MedConcierge**: `doctors`, `patients`, `patient_files`, `appointments`,
  `appointment_events`, `schedules`, `schedule_blocks`, `clinical_records`,
  `informed_consents`, `patient_payments`, `intake_forms`, `intake_responses`
- **Compartidos B2B/Med**: `conversations`, `messages`, `campaigns`,
  `campaign_messages`, `payments`, `invoices`, `follow_ups`, `funnel_stages`,
  `client_funnel`, `bot_faqs`, `onboarding_progress`, `budgets`,
  `notifications`, `audit_logs`, `subscriptions`
- **AI**: `ai_knowledge_files`, `ai_usage_events`, `knowledge_base`
- **Integraciones**: `integrations` (Google Calendar, Meta Business),
  `portal_pages`
- **Public API**: `api_keys` (con scopes y rate-limit por plan)
- **Resiliencia**: `pending_calendar_ops`, `webhook_failures`
- **Usage tracking**: `tenant_usage`, `usage_addons`
- **Push**: `users.expoPushToken` (mobile nativa) +
  `web_push_subscriptions` (PWA + browsers)
- **Lead Ads CRM**: `ad_leads` (origen + status pipeline + UTM + raw_data),
  config de Meta/Google en `integrations` con `type='meta_ads'` o `'google_ads'`
- **Documentos**: `documents` (lab_result/radiology/etc, AI summary, signed-URL
  storage). Bucket `documents` en Supabase Storage, bootstrapped con
  service-role en el primer upload.
- **Comms timeline**: `patient_communications` (append-only ledger de
  email/WA/call/note por paciente). Agregado por `sendEmail` cuando recibe
  `{tenantId, patientId}` opcional, o manualmente desde la tab "Comunicaciones"
  en la ficha del paciente.
- **Conversations multi-channel**: `conversations.external_id` permite
  identificar a quien escribe por canales sin teléfono (Instagram PSID,
  Telegram chat_id, etc). UNIQUE `(tenant_id, channel, external_id)` para
  upsert idempotente desde webhooks.

### Migraciones

50 archivos SQL en `packages/db/migrations/`. La última es
`0050_web_push_subscriptions.sql`. Política: cada migración es idempotente
(`IF NOT EXISTS`, `ON CONFLICT`, `DROP POLICY IF EXISTS`).

## Capa de aplicación

### apps/web (puerto 3000)

Dos audiencias:
1. **Marketing** — `/`, `/about`, `/systems`, `/platform`, legal pages
2. **Producto B2B** — `/login`, `/signup`, `/dashboard/*`, `/q/[token]`
   (vista pública de cotización), `/[tenant]` (catálogo white-label)

API routes principales: `/api/quotes`, `/api/quotes/list`,
`/api/quotes/[id]/pdf`, `/api/clients`, `/api/dashboard/*`,
`/api/webhooks/{stripe,mercadopago,whatsapp}`.

### apps/medconcierge (puerto 3001)

Producto vertical médico. Rutas en español: `/agenda`, `/pacientes`,
`/conversaciones`, `/pagos`, `/campanas`, `/reportes`, `/settings/*`,
`/onboarding`, `/api-docs` (Swagger UI público).

API routes: `/api/dashboard/*`, `/api/v1/*` (API pública con `api_keys`),
`/api/wa/[slug]/webhook` (WhatsApp por tenant), `/api/webhooks/{stripe,
mercadopago,meta-data-deletion}`, `/api/dashboard/push/subscribe`.

PWA: `manifest.json`, `sw.js`, íconos en `/icons/`, install prompt y
push bootstrap montados en `DashboardShell`.

### apps/mobile (Expo)

App nativa que consume la API de medconcierge. Usa SecureStore para tokens,
Expo Push para notificaciones, Ionicons (no emojis) en la tab bar. Ver
`apps/mobile/README.md` para EAS build/submit.

### Workers y crons

#### auctorum-worker (`scripts/worker.ts`)
Consume queue `whatsapp_messages` de BullMQ. Por cada mensaje entrante:

1. `checkAndTrackUsage(tenantId, plan, 'whatsapp_messages', 1)` — si excede
   el plan, responde mensaje canónico "alcanzaste tu límite".
2. `isCircuitOpen(tenantId)` — si el breaker está abierto, devuelve fallback.
3. Llama a `runWhatsAppReplyWithTools` (OpenAI tool-calling con catálogo
   de tools por vertical: agenda, productos, FAQs).
4. Persiste el mensaje en `messages` y crea/actualiza `conversations`.
5. Inserta en `notifications` (in-dashboard bell).
6. Manda push a las devices del doctor (Expo + Web Push) en paralelo.
7. Manda la respuesta por WhatsApp Cloud API.
8. `recordSuccess` o `recordFailure` para el circuit breaker.

#### auctorum-campaign-worker
Consume queue `campaigns` con rate-limit por tenant para no exceder
WhatsApp 80msg/seg.

#### Crons (PM2 cron_restart)

| Cron                           | Frecuencia | Qué hace                                  |
|--------------------------------|------------|-------------------------------------------|
| `cron-reminders`               | cada 4h    | Recordatorios genéricos por tenant        |
| `cron-appointment-reminders`   | cada 15min | Recordatorio 24h y 2h antes               |
| `cron-calendar-sync`           | cada 5min  | Push de cambios locales hacia Google Cal  |
| `cron-calendar-pending`        | cada 5min  | Drena `pending_calendar_ops`              |
| `cron-campaigns`               | cada 10min | Dispara campañas con `scheduledAt` vencido|
| `cron-webhook-retries`         | cada 5min  | Reprocesa `webhook_failures` con backoff  |

## Flujos críticos

### Mensaje WhatsApp entrante de paciente

```
WhatsApp Cloud
   │ POST /api/wa/<slug>/webhook (HMAC verified)
   ▼
medconcierge:3001
   │ verifica HMAC, identifica tenant por slug, encola job
   ▼
Redis BullMQ (queue: whatsapp_messages)
   │
   ▼
auctorum-worker
   ├─ checkAndTrackUsage           (rate limit por plan)
   ├─ isCircuitOpen                (resiliencia OpenAI)
   ├─ runWhatsAppReplyWithTools    (tool calling con OpenAI)
   │      └─ tools: search_appointments, create_appointment,
   │               check_availability, get_patient_info, ...
   ├─ persiste message + actualiza conversation
   ├─ inserta notification (bell)
   ├─ notifyDoctorDevices (Expo Push + Web Push en paralelo)
   └─ envía respuesta por WhatsApp Cloud API
```

### Cita creada por el doctor (dashboard)

```
medconcierge dashboard /agenda
   │ POST /api/dashboard/appointments
   ▼
medconcierge :3001
   ├─ valida zod, getAuthTenant, RLS scope
   ├─ INSERT appointments + INSERT appointment_events
   ├─ calendarWithFallback({op: 'create', call: createCalendarEvent})
   │      └─ si OK: guarda googleEventId
   │      └─ si falla: encola en pending_calendar_ops
   └─ dispara WhatsApp confirmación al paciente
```

### Lead de Facebook/Instagram entra al CRM

```
Paciente completa Lead Form en IG/FB
   │ Meta dispara webhook
   ▼
medconcierge :3001
   POST /api/webhooks/meta-leads
   ├─ verifica HMAC con META_APP_SECRET
   ├─ por cada change.value con field=='leadgen':
   │     ├─ resuelve tenant: integrations WHERE type='meta_ads' AND config->>'pageId'=page_id
   │     ├─ fetch a https://graph.facebook.com/v19.0/{leadgen_id} con accessToken
   │     ├─ extrae name/phone/email/message del field_data
   │     ├─ INSERT INTO ad_leads (source='facebook'|'instagram', ...)
   │     └─ if config.autoContact !== false:
   │           autoContactLead(tenant, lead) → sendWhatsAppMessage
   │           → status = 'contacted', whatsapp_sent_at = NOW()
   └─ devuelve { success: true, persisted, autoContacted, errors }
```

Google Ads sigue el mismo patrón pero el webhook se autentica con un token
generado en el dashboard (`/settings/ads`) en lugar de HMAC. Detalle completo
en `ADS-LEADS.md`.

### Pago aceptado (Stripe addon o MercadoPago)

```
Stripe / MercadoPago
   │ POST /api/webhooks/stripe (signed)
   ▼
medconcierge :3001
   ├─ verifica firma
   ├─ if metadata.type == 'addon_purchase':
   │     creditAddon(tenantId, packageId) → INSERT usage_addons
   ├─ elif patient_payment:
   │     marca patient_payments.status='paid'
   │     dispara recibo PDF + email/WhatsApp
   └─ idempotente vía (processor, externalPaymentId) UNIQUE
```

## Seguridad

- TLS terminado en Nginx (Let's Encrypt auto-renew).
- HSTS preload, CSP estricto (solo `'self'` + dominios explícitos),
  X-Frame-Options DENY, X-Content-Type-Options nosniff.
- Apps escuchan solo en `127.0.0.1` (no expuestas externamente sin Nginx).
- Cloudflare como única puerta exterior; `ufw` permite solo `:80`, `:443`,
  `:2222` (SSH).
- SSH solo por clave en puerto no estándar (`2222`).
- Cookies de auth con `Secure`, `HttpOnly`, `SameSite=Lax`, dominio
  `.auctorum.com.mx` para SSO entre subdominios.
- Webhooks verifican HMAC (WhatsApp + Stripe) o firma SDK (MercadoPago).
- CSRF en API routes vía `validateOrigin(req)`.
- API pública (`/api/v1/*`) gated por `api_keys` con scopes y rate limit
  por plan.
- RLS en cada tabla con `tenant_id`. La conexión de aplicación setea
  `app.current_tenant_id` antes de cada query.

## Puntos sensibles a monitorear

- **Memoria PM2** — cada Next.js está limitado a `--max-old-space-size=600`,
  reinicia automáticamente al cruzar 512 MB. Si los reinicios > 50 en una
  semana, hay leak.
- **Queue depth** — si BullMQ acumula > 100 jobs en `whatsapp_messages`,
  el worker no está dando abasto (revisar circuit breaker, rate limit
  upstream de OpenAI).
- **`pending_calendar_ops`** — si pasa de 50 filas, el cron está fallando
  (token expirado, cuota Google Calendar agotada).
- **`webhook_failures`** — > 20 filas activas indica que un proveedor está
  intermitente o que la verificación HMAC está rota.
