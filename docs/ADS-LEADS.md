# Ads → Leads CRM

Captura automática de leads de campañas (Facebook/Instagram Lead Ads y Google Ads
Lead Forms), persistencia en `ad_leads`, auto-contacto por WhatsApp y un pipeline
visual (kanban) en el dashboard de medconcierge.

## Flujo end-to-end

```
   Doctor corre anuncio
   (Meta Ads Manager / Google Ads)
                │
                │ paciente completa Lead Form
                ▼
   ┌─────────────────────────────┐
   │ Meta / Google webhook       │
   │ POST /api/webhooks/         │
   │      meta-leads             │
   │      google-leads           │
   └────────────┬────────────────┘
                │
                │ verifica HMAC (Meta) o token (Google)
                │ resuelve tenant via integrations.config
                ▼
   ┌─────────────────────────────┐
   │ INSERT INTO ad_leads        │
   │   source, name, phone,      │
   │   email, campaign, raw_data │
   └────────────┬────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ autoContactLead(tenant,lead)│
   │ → sendWhatsAppMessage       │
   │ → status = 'contacted'      │
   │ → whatsapp_sent_at = NOW()  │
   └────────────┬────────────────┘
                │
                │ (paciente responde)
                ▼
   ┌─────────────────────────────┐
   │ Worker AI — agendar cita    │
   │ scripts/worker.ts           │
   └────────────┬────────────────┘
                │
                ▼
   Doctor convierte lead → paciente + cita
   POST /api/dashboard/leads/[id]/convert
   status: appointed → converted
```

## Pipeline

```
NEW → CONTACTED → RESPONDED → APPOINTED → CONVERTED
                                                \→ LOST  (cualquier punto)
```

| Estado       | Cuándo se setea                                              |
|--------------|--------------------------------------------------------------|
| `new`        | INSERT inicial vía webhook o creación manual                 |
| `contacted`  | Después de que `autoContactLead` envía WhatsApp con éxito    |
| `responded`  | Manual desde el dashboard, cuando el lead respondió por WA   |
| `appointed`  | `/convert` con date+startTime+endTime+doctorId               |
| `converted`  | Manual o `/convert` con `markConverted: true`                |
| `lost`       | DELETE en el endpoint (soft — la fila se queda para análisis)|

## Tablas y schema

### `ad_leads` (migración 0051)

Columnas principales:
- `tenant_id`, `source`, `status`, `phone`, `name`, `email`, `message`
- `whatsapp_sent`, `whatsapp_sent_at`
- `appointment_id`, `patient_id` (atribución cuando se convierte)
- `raw_data` JSONB — payload original del webhook (para debugging)
- `utm_source`, `utm_medium`, `utm_campaign`

Índices:
- `(tenant_id, status)` — para el kanban
- `(phone)` — para de-dup futuro y lookup
- `(tenant_id, source)` — para filtrar por canal
- `(tenant_id, created_at DESC)` — para listas paginadas

RLS: `leads_tenant_isolation` — aislamiento por tenant.

Trigger: `trg_ad_leads_updated_at` actualiza `updated_at` en cada UPDATE.

### `integrations` (extensión)

Dos nuevos `type`:

**`meta_ads`** — config:
```ts
{
  pageId: string             // Meta Page ID del consultorio
  pageName?: string
  accessToken: string        // Long-lived page token (leads_retrieval scope)
  formIds?: string[]         // Forms suscritos (informativo)
  autoContact: boolean
  autoContactMessage?: string
  connectedAt: string        // ISO timestamp
}
```

**`google_ads`** — config:
```ts
{
  webhookToken: string       // 48 hex chars, generado al guardar
  customerId?: string        // Google Ads customer ID (informativo)
  autoContact: boolean
  autoContactMessage?: string
  connectedAt: string
}
```

Índices de lookup creados en la migración:
- `integrations_meta_ads_page_idx` — `WHERE type='meta_ads'` sobre `config->>'pageId'`
- `integrations_google_ads_token_idx` — `WHERE type='google_ads'` sobre `config->>'webhookToken'`

Esto hace cada lookup O(log n) acotado a las filas de su tipo, no a toda la
tabla.

## Endpoints

### Webhooks públicos

| Método | Path                          | Auth                                |
|--------|-------------------------------|-------------------------------------|
| GET    | `/api/webhooks/meta-leads`    | `META_LEADS_VERIFY_TOKEN` env       |
| POST   | `/api/webhooks/meta-leads`    | HMAC `X-Hub-Signature-256`          |
| POST   | `/api/webhooks/google-leads`  | `google_key` en body o token header |

Los tres pasan por el middleware en `apps/medconcierge/src/middleware.ts:isStaticOrApi`
porque toda la rama `/api/` ya está exenta del auth gate (las rutas se
auto-protegen con HMAC/token).

### Dashboard API (auth + CSRF)

| Método | Path                                              | Función                              |
|--------|---------------------------------------------------|--------------------------------------|
| GET    | `/api/dashboard/leads`                            | lista + KPIs + pipeline counts       |
| POST   | `/api/dashboard/leads`                            | crear lead manual                    |
| GET    | `/api/dashboard/leads/[id]`                       | detalle + paciente/cita asociados    |
| PATCH  | `/api/dashboard/leads/[id]`                       | actualizar status / campos editables |
| DELETE | `/api/dashboard/leads/[id]`                       | marcar como `lost` (soft)            |
| POST   | `/api/dashboard/leads/[id]/contact`               | re-disparar WhatsApp manual          |
| POST   | `/api/dashboard/leads/[id]/convert`               | crear paciente + (opcional) cita     |

Settings de la integración:

| Método | Path                                  | Función                          |
|--------|---------------------------------------|----------------------------------|
| GET    | `/api/dashboard/settings/ads`         | estado de meta_ads + google_ads  |
| PUT    | `/api/dashboard/settings/ads`         | upsert config                    |
| POST   | `/api/dashboard/settings/ads`         | rotar webhook token (google_ads) |
| DELETE | `/api/dashboard/settings/ads?kind=`   | desconectar                      |

## UI

- **`/leads`** (dashboard) — KPIs, filtros (source/status/búsqueda), 2 vistas
  (lista y kanban), modal "Nuevo lead manual"
- **`/settings/ads`** — dos cards (Meta + Google), conectar/desconectar/rotar,
  copy del webhook URL, campo de auto-contacto editable

## Setup en Meta App (Lead Ads)

1. **Crear Meta App** (si no existe ya): https://developers.facebook.com/apps
2. Añadir el producto "Webhooks"
3. En **Webhooks → Page**, click "Subscribe" y configurar:
   - **Callback URL:** `https://med.auctorum.com.mx/api/webhooks/meta-leads`
   - **Verify Token:** el valor de la env `META_LEADS_VERIFY_TOKEN` en el VPS
4. Suscribir el campo **`leadgen`** del objeto **`page`**
5. Añadir el producto "Lead Ads", obtener **Page Access Token** con scopes:
   - `leads_retrieval`
   - `pages_show_list`
   - `pages_read_engagement`
6. **HMAC**: la env `META_APP_SECRET` debe coincidir con el App Secret de la
   Meta App (el mismo que usa el webhook de WhatsApp si compartes la app).
7. En el dashboard medconcierge → `/settings/ads` → Facebook card:
   - Pegar el **Page ID**
   - Pegar el **Access Token**
   - Activar auto-contacto y editar el mensaje
8. Probar: en Meta Ads Manager, **Lead Ads Testing Tool** dispara un lead a
   tu URL.

## Setup en Google Ads

1. En el dashboard medconcierge → `/settings/ads` → Google card → click
   **"Guardar"** sin tocar nada. Se genera un `webhookToken` aleatorio
   (48 hex chars) y se muestra UNA SOLA VEZ.
2. **Cópialo en ese momento** — después solo se mostrará enmascarado.
3. En Google Ads:
   - Crea o edita un **Lead Form Asset**
   - En **Lead delivery → Webhook integration** pega:
     - **Webhook URL:** `https://med.auctorum.com.mx/api/webhooks/google-leads`
     - **Webhook Key:** el token que copiaste
4. Click **"Send test data"** — debe llegar un lead de prueba al CRM.
5. Para rotar el token: botón **"Rotar"** en la UI. El viejo deja de
   funcionar inmediatamente (los webhooks pendientes con el viejo token
   serán rechazados con `401`).

## Variables de entorno requeridas

En `apps/medconcierge/.env.local`:

```bash
# Meta Lead Ads
META_APP_SECRET="..."                  # App Secret de la Meta App
META_LEADS_VERIFY_TOKEN="..."          # Token elegido al suscribir el webhook

# Google Ads — no necesita env. El token vive en integrations.config por tenant.

# WhatsApp (ya existe — el auto-contacto lo usa)
WHATSAPP_TOKEN="..."
WHATSAPP_PHONE_NUMBER_ID="..."
```

## Verificación post-deploy

```bash
# Webhooks llegan
curl -i -H 'Host: med.auctorum.com.mx' \
  http://127.0.0.1:3001/api/webhooks/google-leads
# 401 sin token (correcto — no autorizado sin token)

curl -i 'https://med.auctorum.com.mx/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=BAD&hub.challenge=test'
# 403 con token inválido — correcto

curl -i 'https://med.auctorum.com.mx/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=$META_LEADS_VERIFY_TOKEN&hub.challenge=test'
# 200 con body "test" — correcto

# Dashboard endpoint requiere auth
curl -s -o /dev/null -w '%{http_code}\n' \
  https://med.auctorum.com.mx/api/dashboard/leads
# 401 sin sesión — correcto
```

En la UI:
- `/leads` debe mostrar el sidebar item con badge si hay nuevos
- `/settings/ads` debe mostrar las dos cards
- Después de conectar Meta + correr una campaña, los leads deben aparecer
  en `/leads` con source=facebook|instagram en menos de 60s

## Troubleshooting

| Síntoma                                          | Causa probable                          | Fix                                      |
|--------------------------------------------------|-----------------------------------------|------------------------------------------|
| Webhook Meta devuelve 403                        | `META_APP_SECRET` no coincide o falta   | Verificar env, restart medconcierge      |
| Lead llega pero `field_data` está vacío          | Access token sin scope `leads_retrieval`| Regenerar long-lived page token          |
| Google Ads webhook devuelve 401                  | Token rotado y aún no actualizado en GA | Copiar el nuevo token a Google Ads       |
| Lead se inserta sin teléfono                     | El form de Meta no pide phone_number    | Editar el Lead Form, hacer phone required|
| Auto-contacto no envía                           | `WHATSAPP_TOKEN` o `_PHONE_NUMBER_ID` faltan | Ver env del worker; restart            |
| El sidebar no muestra "Leads"                    | El item está oculto en preferencias     | `/dashboard/preferencias` → activar      |
