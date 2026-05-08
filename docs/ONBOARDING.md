# Onboarding de un Cliente Nuevo — Guía Exhaustiva

Esta guía es el procedimiento completo, paso a paso, comando por comando, para
provisionar un cliente nuevo en Auctorum (medconcierge o B2B), darle acceso, y
activar todas las funcionalidades. Cubre las variantes que aparecen en
producción real: doctor solo, clínica con varios médicos, con o sin pagos
online, con o sin Lead Ads, con o sin Google Calendar, con número WhatsApp
compartido o dedicado.

> **Convención de notación:** los comandos asumen `cwd = /opt/auctorum-systems/repo`
> en la VPS (puerto SSH **2222**, usuario `root` para administración, usuario
> `auctorum` para PM2). En tu máquina local el `cwd` es la raíz del repo. Cada
> bloque indica `# LOCAL` o `# VPS` cuando importa.

---

## Tabla de contenidos

1. [Prerequisitos del operador](#1-prerequisitos-del-operador)
2. [Información que necesitas del cliente](#2-información-que-necesitas-del-cliente)
3. [Ruta corta — provisionar con script (medical)](#3-ruta-corta--provisionar-con-script-medical)
4. [Ruta larga — paso a paso manual](#4-ruta-larga--paso-a-paso-manual)
5. [Configuración de WhatsApp Cloud API](#5-configuración-de-whatsapp-cloud-api)
6. [Configuración de Google Calendar OAuth](#6-configuración-de-google-calendar-oauth)
7. [Configuración de pagos (Stripe Connect + MercadoPago)](#7-configuración-de-pagos-stripe-connect--mercadopago)
8. [Configuración de Lead Ads (Meta + Google)](#8-configuración-de-lead-ads-meta--google)
9. [Configuración de Instagram DM inbox](#9-configuración-de-instagram-dm-inbox)
10. [Configuración de email (Resend + Cloudflare)](#10-configuración-de-email-resend--cloudflare)
11. [Configuración de la landing del tenant](#11-configuración-de-la-landing-del-tenant)
12. [Configuración del bot — system prompt + FAQs + KB](#12-configuración-del-bot--system-prompt--faqs--kb)
13. [Variantes — clínica con varios doctores, B2B, etc.](#13-variantes)
14. [Verificación y entrega al cliente](#14-verificación-y-entrega-al-cliente)
15. [Troubleshooting](#15-troubleshooting)
16. [Deprovisionar un tenant](#16-deprovisionar-un-tenant)

---

## 1. Prerequisitos del operador

Antes de empezar el onboarding del cliente, asegúrate de tener:

### 1.1 Acceso a la VPS

```bash
# LOCAL — verificar que SSH funciona en puerto 2222
ssh -p 2222 root@<vps-ip> "hostname && pm2 ls --user auctorum 2>&1 | head -5"
```

Si no resuelve, revisa `~/.ssh/config` o agrega el host. SSH NO está en el
puerto 22 — el daemon está movido a **2222** y `auctorum-systems-firewall`
bloquea el 22.

### 1.2 Acceso a Supabase

- Console: <https://supabase.com/dashboard/project/tewvtgvvxcvkijqeeoky>
- `DATABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` viven en
  `/opt/auctorum-systems/repo/apps/medconcierge/.env.local`. Nunca copies
  estos valores fuera de la VPS.

### 1.3 Acceso a la cuenta Meta Business

- App ID + App Secret de la app Meta. Se usan para el verify token y HMAC del
  webhook de WhatsApp. La app actual: `Auctorum WhatsApp Cloud`.
- Webhook URL global: `https://med.auctorum.com.mx/api/wa/<slug>/webhook` para
  cada tenant en modo dedicated; o `https://med.auctorum.com.mx/api/webhooks/whatsapp`
  para el modo shared.

### 1.4 Acceso a Cloudflare

- Zona `auctorum.com.mx`. Necesitas permiso de DNS para verificar que el
  wildcard `*.auctorum.com.mx` apunta a la VPS (ya está configurado, pero
  confirma).

### 1.5 Cuenta de Google Cloud (para Calendar API)

- Proyecto: `auctorum-systems-13d160cec0b6`. Solo si el cliente quiere sync
  con Google Calendar.

### 1.6 Cuenta de Stripe Connect (para pagos online)

- Solo si el cliente quiere cobrar consultas online.

---

## 2. Información que necesitas del cliente

Antes de provisionar, ten esta planilla llena (mándale un Google Form o
similar):

| Campo                       | Ejemplo                                  | Obligatorio |
|-----------------------------|------------------------------------------|-------------|
| Nombre completo / razón social | Dra. María López González             | sí          |
| Slug del subdominio         | `dra-lopez` (debe iniciar con dr-/dra-/doc-) | sí      |
| Especialidad principal      | Cardiología                              | sí          |
| Sub-especialidad            | Cardiología pediátrica                   | no          |
| Cédula profesional          | 1234567                                  | recomendado |
| Cédula de especialidad      | 7654321                                  | recomendado |
| Email del titular           | dra.lopez@gmail.com                      | sí          |
| Teléfono / WhatsApp         | +528441234567 (formato E.164)            | sí          |
| Dirección del consultorio   | Blvd. V. Carranza #100, Saltillo        | sí          |
| Costo de consulta (MXN)     | 1000                                     | sí          |
| Duración de consulta (min)  | 30                                       | no          |
| Horario semanal             | L-V 9-18, Sáb 9-13, Dom cerrado         | sí          |
| Plan de suscripción         | `starter` / `pro` / `enterprise`         | sí (default `pro`) |
| ¿Acepta seguros?            | sí / no                                  | no          |
| Logo / fotos del consultorio| URLs o archivos                          | no          |
| Servicios + precios         | Lista (consulta inicial $1000, etc.)    | recomendado |
| FAQs específicas            | "¿Atienden niños?", etc.                 | recomendado |
| Mensaje de bienvenida bot   | "¡Hola! Gracias por contactar..."        | recomendado |

Variantes opcionales:

- **Pagos online** → SI: necesitas RFC, razón social, datos bancarios para
  Stripe Connect onboarding (el cliente lo hace solo, vía link).
- **Lead Ads (Facebook/Instagram)** → SI: pageId de Facebook + business
  manager + permisos para conectar.
- **Google Calendar sync** → SI: necesita OAuth del cliente con su cuenta
  Google.
- **Instagram DM inbox** → SI: pageId, mismo sistema que Lead Ads.

---

## 3. Ruta corta — provisionar con script (medical)

Para el 80% de los casos, el script `provision-tenant.sh` hace todo en una
sola corrida (DB row, auth user, bot instance, KB seed). Ideal para un
cliente solo (un doctor, un consultorio).

### 3.1 Conectar a la VPS

```bash
# LOCAL
ssh -p 2222 root@<vps-ip>
cd /opt/auctorum-systems/repo
git pull origin main
```

### 3.2 Ejecutar el script

```bash
# VPS
sudo -u auctorum env HOME=/home/auctorum bash scripts/provision-tenant.sh \
  --slug dra-lopez \
  --name "Dra. María López González" \
  --specialty "Cardiología" \
  --sub-specialty "Cardiología pediátrica" \
  --email "dra.lopez@gmail.com" \
  --phone "+528441234567" \
  --address "Blvd. V. Carranza #100, Col. Centro, Saltillo, Coah." \
  --fee 1000 \
  --plan pro
```

El script:

1. Valida formato de slug (`dr-`/`dra-`/`doc-` + lowercase) y unicidad.
2. Inserta `tenants` con un `config` JSONB completo.
3. Crea el auth user en Supabase (password temporal autogenerado).
4. Inserta `users` con `role='admin'` y `tenant_id` enlazado.
5. Inserta `bot_instances` (channel='whatsapp', provider='meta',
   status='pending_setup', config con verify_token de 32 bytes).
6. Genera 7 chunks de KB (ubicación, horarios, precios, formas de pago,
   primera consulta, política de cancelación, urgencias) y los embebe con
   `text-embedding-3-small` en `knowledge_base`.
7. Imprime al final: tenant_id, URL, password temporal, verify_token, y
   pendientes manuales.

**Salida esperada:**

```
TENANT PROVISIONADO EXITOSAMENTE

  Slug:           dra-lopez
  Tenant ID:      <uuid>
  URL:            https://dra-lopez.auctorum.com.mx
  Dashboard:      https://dra-lopez.auctorum.com.mx/login
  Admin email:    dra.lopez@gmail.com
  Admin password: AuctorumXXXXXXXX!

  PENDIENTE MANUAL:
  1. Configurar WhatsApp en Meta Business Suite
     Webhook URL:  https://dra-lopez.auctorum.com.mx/api/wa/dra-lopez/webhook
     Verify token: <hex-de-64-chars>
  2. Enviar credenciales al cliente (cambiar password en primer login)
  3. Personalizar landing page (servicios, testimonios) en dashboard
  4. Agendar sesión de onboarding
```

### 3.3 Verificar inmediatamente

```bash
# VPS — comprobar que la DB tiene todo bien
PGPASSWORD="$(grep -oP '(?<=postgresql://[^:]+:)[^@]+(?=@)' apps/medconcierge/.env.local | head -1)" \
  psql "$DATABASE_URL" -c "
    SELECT t.slug, t.name, t.provisioning_status, u.email, u.role,
           bi.channel, bi.status AS bot_status,
           (SELECT COUNT(*) FROM knowledge_base WHERE tenant_id = t.id) AS kb_chunks
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    LEFT JOIN bot_instances bi ON bi.tenant_id = t.id
    WHERE t.slug = 'dra-lopez';
  "
```

Esperado: 1 row con status `active`, role `admin`, kb_chunks = 7.

```bash
# VPS — comprobar que la URL responde
curl -sI -H 'Host: dra-lopez.auctorum.com.mx' http://127.0.0.1:3001/ | head -3
# Esperado: HTTP/1.1 200 OK
```

```bash
# LOCAL — abrir desde tu navegador
# https://dra-lopez.auctorum.com.mx        ← landing pública
# https://dra-lopez.auctorum.com.mx/login  ← dashboard
```

A partir de aquí, sigue las secciones 5–14 según las variantes contratadas.

---

## 4. Ruta larga — paso a paso manual

Si necesitas más control o el script no aplica (clínica con varios médicos,
B2B, slug fuera del prefix `dr-/dra-/doc-`), hazlo manual. Cada paso muestra
exactamente el SQL/comando que el script ejecuta.

### 4.1 Validar pre-condiciones

```bash
# VPS
# 1) Slug disponible
psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM tenants WHERE slug = 'dra-lopez';"
# Esperado: 0

# 2) DNS wildcard ok (debe regresar 200 con cualquier slug)
curl -sI https://test-imaginario-9999.auctorum.com.mx/ | head -1
# Esperado: HTTP/2 200 (Nginx contesta)
```

### 4.2 Insertar el tenant

```bash
# VPS — abre psql interactivo o ejecuta vía -c
psql "$DATABASE_URL" <<'SQL'
INSERT INTO tenants (
  slug, name, tenant_type, public_subdomain, public_subdomain_prefix,
  provisioning_status, provisioned_at, plan, is_active,
  config
)
VALUES (
  'dra-lopez',
  'Dra. María López González',
  'medical',
  'dra-lopez',
  'dra',
  'active',
  now(),
  'pro',
  true,
  '{
    "colors": {"primary": "#0D9488", "secondary": "#F59E0B", "accent": "#6366F1", "background": "#FFFFFF"},
    "contact": {"phone": "+528441234567", "email": "dra.lopez@gmail.com", "whatsapp": "+528441234567", "address": "Blvd. V. Carranza #100, Col. Centro, Saltillo, Coah."},
    "business": {"razon_social": "María López González", "rfc": "", "giro": "Servicios médicos"},
    "account": {"type": "medical", "plan": "pro", "publicHost": "dra-lopez.auctorum.com.mx"},
    "medical": {"specialty": "Cardiología", "sub_specialty": "Cardiología pediátrica", "cedula_profesional": "1234567", "cedula_especialidad": "7654321", "consultation_fee": 1000, "consultation_duration_min": 30, "accepts_insurance": false, "insurance_providers": []},
    "schedule": {
      "monday":    {"enabled": true, "start": "09:00", "end": "18:00"},
      "tuesday":   {"enabled": true, "start": "09:00", "end": "18:00"},
      "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
      "thursday":  {"enabled": true, "start": "09:00", "end": "18:00"},
      "friday":    {"enabled": true, "start": "09:00", "end": "18:00"},
      "saturday":  {"enabled": true, "start": "09:00", "end": "13:00"},
      "sunday":    {"enabled": false, "start": "09:00", "end": "13:00"}
    },
    "schedule_settings": {"timezone": "America/Monterrey", "advance_booking_days": 30, "min_booking_hours_ahead": 2, "cancellation_hours": 24, "auto_confirm": false, "show_fee_on_portal": true},
    "notifications": {"whatsapp_on_new_appointment": true, "whatsapp_reminder_24h": true, "whatsapp_reminder_2h": true, "email_on_new_appointment": true, "notify_on_cancellation": true},
    "features": {"clinical_notes": true, "ai_scribe": false, "telehealth": false, "online_payment": false, "prescription_pdf": false, "receipt_pdf": false},
    "ai": {"enabled": true, "systemPrompt": "", "autoSchedule": true, "answerFaq": true, "humanHandoff": true, "model": "gpt-4o-mini", "temperature": 0.3, "maxTokens": 1024},
    "landing": {"tagline": "Atención médica de calidad con calidez humana", "years_experience": 0, "rating": 5.0, "review_count": 0, "services": []}
  }'::jsonb
)
RETURNING id;
SQL
```

Guarda el `id` — lo vas a usar en cada paso siguiente. Llámalo `$TENANT_ID`.

### 4.3 Crear el usuario en Supabase Auth

```bash
# VPS
TEMP_PASSWORD="Auctorum$(openssl rand -hex 4)!"
curl -sX POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"dra.lopez@gmail.com\",
    \"password\": \"$TEMP_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {\"name\": \"Dra. María López\", \"tenant_slug\": \"dra-lopez\"}
  }" | jq -r '.id'
# Esperado: un uuid — guárdalo como $AUTH_USER_ID
```

### 4.4 Enlazar el usuario al tenant

```bash
# VPS
psql "$DATABASE_URL" -c "
INSERT INTO users (id, tenant_id, email, name, role, is_active)
VALUES ('$AUTH_USER_ID', '$TENANT_ID', 'dra.lopez@gmail.com', 'Dra. María López', 'admin', true)
ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
"
```

### 4.5 Crear bot instance (WhatsApp)

Hay dos modos: **shared** (usa el WABA común de Auctorum, los secretos vienen
de env) y **dedicated** (cliente trae su propio número Meta, secretos en
config).

#### 4.5.a Modo shared (default, sin trabajo del cliente)

```bash
# VPS
psql "$DATABASE_URL" -c "
INSERT INTO bot_instances (tenant_id, channel, provider, status, config)
VALUES (
  '$TENANT_ID', 'whatsapp', 'meta', 'active',
  jsonb_build_object('channel_mode', 'shared')
);
"
# Las credenciales (verify_token, app_secret) vienen de env vars en .env.local:
#   WHATSAPP_VERIFY_TOKEN
#   WHATSAPP_APP_SECRET
# El resolver del webhook (apps/medconcierge/src/app/api/wa/[slug]/webhook/route.ts)
# hace fallback a env si la config no las tiene (fix del 2026-05-08).
```

#### 4.5.b Modo dedicated (cliente trae su propio número)

```bash
# VPS
VERIFY_TOKEN=$(openssl rand -hex 32)
APP_SECRET="<el-app-secret-de-la-app-meta-del-cliente>"
psql "$DATABASE_URL" -c "
INSERT INTO bot_instances (tenant_id, channel, provider, status, config)
VALUES (
  '$TENANT_ID', 'whatsapp', 'meta', 'pending_setup',
  jsonb_build_object(
    'channel_mode', 'dedicated',
    'verify_token', '$VERIFY_TOKEN',
    'app_secret', '$APP_SECRET'
  )
);
"
echo "Verify token (dáselo a Meta): $VERIFY_TOKEN"
echo "Webhook URL (dáselo a Meta):  https://dra-lopez.auctorum.com.mx/api/wa/dra-lopez/webhook"
```

### 4.6 Seedear el knowledge base (RAG)

```bash
# VPS
sudo -u auctorum env HOME=/home/auctorum DATABASE_URL="$DATABASE_URL" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  /usr/bin/pnpm exec tsx scripts/seed-kb-dra-martinez.ts
# (el script tiene el slug hardcodeado a 'dra-martinez' — para uno nuevo
# duplica el archivo y cámbialo, o hazlo desde el dashboard `/settings/bot`,
# que ya hace el embedding automático en el PATCH).
```

### 4.7 (Opcional) Generar mes de actividad realista para demo

Si vas a hacer un demo o quiere ver el dashboard "vivo" antes de tener
tráfico real, corre el seed mensual contra ese tenant. **Editar el TENANT_ID
hardcodeado** en `scripts/seed-dra-martinez-month.ts` línea 22 antes de
ejecutar:

```bash
# VPS
sudo -u auctorum env HOME=/home/auctorum DATABASE_URL="$DATABASE_URL" \
  /usr/bin/pnpm exec tsx scripts/seed-dra-martinez-month.ts
```

Es idempotente (marcadores `+52844999*`, `seed-conv-*`, `metadata.seeded='1'`)
así que se puede re-correr sin duplicar. **Ojo**: avisa al cliente que es
data ficticia que se borra antes del go-live.

---

## 5. Configuración de WhatsApp Cloud API

### 5.1 Ruta A — modo shared (sin trabajo del cliente)

Si el tenant usa el WABA compartido de Auctorum (el caso por default):

1. **No hay configuración del lado del cliente.** El bot empieza a responder
   inmediatamente cuando alguien le escribe al número WhatsApp central de
   Auctorum (mostrado en su landing).
2. Verifica que recibe mensajes:
   ```bash
   # VPS — prueba sintética (curl con HMAC válido)
   set -a; . apps/medconcierge/.env.local; set +a
   BODY='{"object":"whatsapp_business_account","entry":[{"id":"test","changes":[{"value":{"metadata":{"phone_number_id":"<phone-id-shared>"}},"field":"messages"}]}]}'
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" -hex | awk '{print $2}')
   curl -sw '\nHTTP %{http_code}\n' -X POST http://127.0.0.1:3001/api/wa/dra-lopez/webhook \
     -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$SIG" -d "$BODY"
   # Esperado: {"ok":true} HTTP 200
   ```

### 5.2 Ruta B — modo dedicated (cliente trae número)

El cliente debe haber:

1. **Creado un Meta Business Account** y verificado su negocio.
2. **Agregado un número WhatsApp** (que NO esté en uso en otra cuenta).
3. **Creado una App de tipo Business** en <https://developers.facebook.com/apps>.
4. **Agregado el producto "WhatsApp"** a la app y **agregado el número**.

Una vez listo, configura el webhook:

1. Ve a tu app Meta → Settings → Basic. Copia **App Secret** (ya lo tienes
   guardado en `bot_instances.config.app_secret` desde §4.5.b).
2. Ve a tu app Meta → WhatsApp → Configuration.
3. **Webhook URL**: `https://<slug>.auctorum.com.mx/api/wa/<slug>/webhook`
4. **Verify token**: el hex de 64 chars que generaste en §4.5.b.
5. Click **Verify and save**. Meta hace un GET con `hub.mode=subscribe` y
   `hub.verify_token`; si la app responde 200 con el challenge, queda verificado.
6. **Subscribe** a estos webhook fields: `messages`, `message_status`.
7. **Permanent Access Token**: ve a System Users → genera un token
   con permiso `whatsapp_business_messaging` + `whatsapp_business_management`.
   Guárdalo en `bot_instances.config.access_token`:
   ```bash
   psql "$DATABASE_URL" -c "
   UPDATE bot_instances
   SET config = config || '{\"access_token\": \"<token>\"}'::jsonb
   WHERE tenant_id = '$TENANT_ID' AND channel = 'whatsapp';
   "
   ```
8. Cambia el status a `active`:
   ```bash
   psql "$DATABASE_URL" -c "
   UPDATE bot_instances SET status = 'active', updated_at = now()
   WHERE tenant_id = '$TENANT_ID' AND channel = 'whatsapp';
   "
   ```
9. Pídele al cliente que mande un WhatsApp al número. En `pm2 logs auctorum-worker`
   debes ver `processed: 1+` en el siguiente heartbeat.

### 5.3 Smoke test end-to-end

```bash
# VPS — desde tu propio celular, manda un WhatsApp al número del tenant
# Esperado en logs:
sudo -u auctorum env HOME=/home/auctorum pm2 logs auctorum-medconcierge --lines 50 --nostream | \
  grep -E 'wa/dra-lopez' | tail -5
# Debe ver: enqueued message id=<wamid>

sudo -u auctorum env HOME=/home/auctorum pm2 logs auctorum-worker --lines 50 --nostream | \
  grep -E 'process|reply' | tail -5
# Debe ver: processed message ... AI replied with ...
```

---

## 6. Configuración de Google Calendar OAuth

Solo si el cliente quiere que las citas creadas en el dashboard se reflejen
automáticamente en su Google Calendar.

### 6.1 Pre-requisito una sola vez (operador)

El proyecto Google Cloud `auctorum-systems-13d160cec0b6` ya tiene un OAuth
client configurado con redirect URI
`https://med.auctorum.com.mx/api/dashboard/google/callback`. Si necesitas
verificar:

- Console: <https://console.cloud.google.com/apis/credentials>
- Client ID + Client Secret están en `apps/medconcierge/.env.local`:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`

### 6.2 Conectar la cuenta del cliente

El cliente lo hace solo desde el dashboard:

1. Login en `https://<slug>.auctorum.com.mx/login`.
2. Ve a `/settings/calendar` → click **Conectar Google Calendar**.
3. Autoriza con su cuenta Google (selecciona el calendario donde quiere ver
   sus citas).
4. La app guarda `refresh_token` cifrado en `integrations.config` con
   `type='google_calendar'`.

Si quieres hacerlo manualmente para él (tiene la sesión iniciada):

```bash
# VPS — comprueba que se guardó la integración
psql "$DATABASE_URL" -c "
SELECT type, status, jsonb_object_keys(config)
FROM integrations
WHERE tenant_id = '$TENANT_ID' AND type = 'google_calendar';
"
# Esperado: type=google_calendar, status=connected, keys incluyen refresh_token
```

### 6.3 Verificar que sync funciona

```bash
# VPS — crear una cita test en el dashboard, luego:
sudo -u auctorum env HOME=/home/auctorum pm2 logs cron-calendar-sync --lines 30 --nostream | tail -10
# Debe ver: synced X appointments to Google Calendar
```

Si algo falla, las operaciones se encolan en `pending_calendar_ops`:

```bash
psql "$DATABASE_URL" -c "
SELECT operation, status, error, created_at
FROM pending_calendar_ops
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 5;
"
# El cron-calendar-pending re-intenta cada 5min con backoff.
```

---

## 7. Configuración de pagos (Stripe Connect + MercadoPago)

Solo si el cliente quiere cobrar consultas online (link de pago + push de
saldo a su cuenta).

### 7.1 Stripe Connect Express onboarding

Usado para suscripciones a Auctorum + para cobros directos al cliente final.

1. **Habilitar feature flag**:
   ```bash
   psql "$DATABASE_URL" -c "
   UPDATE tenants
   SET config = jsonb_set(config, '{features,online_payment}', 'true'::jsonb)
   WHERE id = '$TENANT_ID';
   "
   ```

2. **Generar onboarding link** (lo manda el dashboard, pero también puedes
   forzarlo):
   ```bash
   curl -sX POST https://med.auctorum.com.mx/api/dashboard/stripe/connect/onboard \
     -H "Cookie: <admin-session>" \
     | jq -r '.url'
   # Output: https://connect.stripe.com/express/onboarding/...
   ```

3. **Mándale el link al cliente.** El cliente:
   - Llena RFC, razón social, datos bancarios.
   - Sube su INE / pasaporte.
   - Acepta términos.

4. **Webhook de Stripe** al completar onboarding actualiza
   `tenants.config.stripe.connect_account_id` y
   `tenants.config.stripe.charges_enabled`.

### 7.2 MercadoPago (para pacientes en MX, sin Stripe)

1. El cliente abre cuenta MercadoPago Comercio.
2. Ve a Developers → Tu integración → **Credentials** → copia `access_token`
   y `public_key`.
3. Guarda en `integrations`:
   ```bash
   psql "$DATABASE_URL" -c "
   INSERT INTO integrations (tenant_id, type, config, status)
   VALUES (
     '$TENANT_ID',
     'mercadopago',
     '{\"access_token\":\"APP_USR-...\", \"public_key\":\"APP_USR-...\"}'::jsonb,
     'connected'
   )
   ON CONFLICT (tenant_id, type) DO UPDATE
   SET config = EXCLUDED.config, status = 'connected', updated_at = now();
   "
   ```
4. **Webhook MP**: el cliente debe configurar
   `https://med.auctorum.com.mx/api/webhooks/mercadopago` en su panel de
   Developers → Webhooks. Eventos: `payment.created`, `payment.updated`.

### 7.3 Verificar checkout end-to-end

```bash
# Desde el dashboard del cliente, agendar una cita y enviar link de pago.
# Pagar con tarjeta de prueba (Stripe: 4242 4242 4242 4242 / MP: tarjeta
# de prueba sandbox).
psql "$DATABASE_URL" -c "
SELECT amount/100.0 AS pesos, status, payment_method, created_at
FROM patient_payments
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 3;
"
# Esperado: row con status='succeeded'
```

---

## 8. Configuración de Lead Ads (Meta + Google)

### 8.1 Meta Lead Ads

1. **El cliente debe tener una Facebook Page** (no perfil personal).
2. **Permisos**: el cliente da acceso a su Page a la app Meta de Auctorum
   (Business Manager → People → Add Page → asignar la app).
3. **Subscribe a leadgen** (lado servidor):
   ```bash
   # Para cada page del cliente
   curl -sX POST "https://graph.facebook.com/v19.0/<PAGE_ID>/subscribed_apps" \
     -d "subscribed_fields=leadgen&access_token=<PAGE_ACCESS_TOKEN>"
   # Esperado: {"success":true}
   ```
4. **Guardar la integración**:
   ```bash
   psql "$DATABASE_URL" -c "
   INSERT INTO integrations (tenant_id, type, config, status)
   VALUES (
     '$TENANT_ID',
     'meta_ads',
     '{\"pageId\":\"<PAGE_ID>\", \"pageAccessToken\":\"<PAGE_TOKEN>\"}'::jsonb,
     'connected'
   )
   ON CONFLICT (tenant_id, type) DO UPDATE
   SET config = EXCLUDED.config, status = 'connected', updated_at = now();
   "
   ```
5. **Webhook URL global ya está**: `https://med.auctorum.com.mx/api/webhooks/meta-leads`.
   La app Meta de Auctorum ya lo tiene configurado — solo necesitas que la
   page esté subscribed.

### 8.2 Google Ads Lead Form

1. El cliente crea un Lead Form en Google Ads.
2. **Genera token único** para el tenant:
   ```bash
   GOOGLE_LEAD_TOKEN=$(openssl rand -hex 32)
   psql "$DATABASE_URL" -c "
   INSERT INTO integrations (tenant_id, type, config, status)
   VALUES (
     '$TENANT_ID',
     'google_ads',
     jsonb_build_object('webhookToken', '$GOOGLE_LEAD_TOKEN'),
     'connected'
   )
   ON CONFLICT (tenant_id, type) DO UPDATE
   SET config = EXCLUDED.config, status = 'connected';
   "
   echo "Webhook URL: https://med.auctorum.com.mx/api/webhooks/google-leads?token=$GOOGLE_LEAD_TOKEN"
   ```
3. En Google Ads → Lead Form → **Webhook integration**:
   - URL: el printeado arriba
   - Key: `<GOOGLE_LEAD_TOKEN>`
   - Click **Send test data** y verifica que aparezca en `/leads` en el dashboard.

### 8.3 Auto-contacto

Cuando llega un lead, la app dispara `autoContactLead(tenant, lead)` que
manda un WhatsApp template aprobado. El mensaje base vive en
`tenants.config.ai.lead_autocontact_message` y se puede editar desde
`/settings/ads`.

```bash
# VPS — verifica que llegan leads
psql "$DATABASE_URL" -c "
SELECT source, name, status, whatsapp_sent, created_at
FROM ad_leads
WHERE tenant_id = '$TENANT_ID'
ORDER BY created_at DESC LIMIT 5;
"
```

Pipeline visible en `/leads`: kanban con `new → contacted → responded →
appointed → converted` (`lost` como side branch).

Ver `docs/ADS-LEADS.md` para el detalle completo.

---

## 9. Configuración de Instagram DM inbox

Permite que el doctor responda DMs de Instagram desde la misma inbox unificada
de WhatsApp en `/conversaciones`.

### 9.1 Pre-requisitos del cliente

- Cuenta Instagram Business o Creator (no personal).
- Conectada a una Facebook Page.
- App Meta del cliente con producto "Messenger" agregado y permisos
  `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`.

### 9.2 Conectar

```bash
# VPS
psql "$DATABASE_URL" -c "
INSERT INTO integrations (tenant_id, type, config, status)
VALUES (
  '$TENANT_ID',
  'instagram_dm',
  jsonb_build_object(
    'pageId', '<FB_PAGE_ID>',
    'instagramBusinessAccountId', '<IG_ACC_ID>',
    'pageAccessToken', '<PAGE_TOKEN>'
  ),
  'connected'
)
ON CONFLICT (tenant_id, type) DO UPDATE SET config = EXCLUDED.config;
"
```

### 9.3 Webhook

URL global: `https://med.auctorum.com.mx/api/webhooks/instagram`. Subscribe a
`messages` en la página de Meta. Cada DM entrante crea/actualiza un row en
`conversations` con `channel='instagram'`.

> Nota: el worker actualmente sólo auto-responde por WhatsApp. Los DMs de IG
> aparecen en la inbox para que el doctor los conteste manualmente.

---

## 10. Configuración de email (Resend + Cloudflare)

Auctorum manda emails desde `noreply@auctorum.com.mx` por default, pero el
cliente puede pedir que vengan de su propio dominio (`citas@drlopez.com`).

### 10.1 Email entrante (por dominio Auctorum)

Todos los emails a `cualquiera@auctorum.com.mx` se rutean vía Cloudflare Email
Routing al inbox del operador. No hay nada que configurar por tenant. Ver
`docs/CLOUDFLARE-EMAIL-ROUTING.md`.

### 10.2 Email saliente — dominio propio del cliente

1. El cliente da acceso DNS a su dominio (ej. `drlopez.com`).
2. Agregar dominio en Resend → <https://resend.com/domains> → genera 3 DNS
   records (DKIM + Return-Path + DMARC).
3. Cliente agrega los DNS records en su provider.
4. Verificar:
   ```bash
   curl -sH "Authorization: Bearer $RESEND_API_KEY" \
     https://api.resend.com/domains | jq '.data[] | {name,status}'
   ```
5. Guardar en tenant config:
   ```bash
   psql "$DATABASE_URL" -c "
   UPDATE tenants
   SET config = jsonb_set(config, '{email}', '{\"from\":\"citas@drlopez.com\",\"reply_to\":\"contacto@drlopez.com\"}'::jsonb)
   WHERE id = '$TENANT_ID';
   "
   ```

---

## 11. Configuración de la landing del tenant

El cliente lo hace solo desde `/settings/landing`, pero estos son los
campos que más mueven la aguja:

| Campo                     | Dónde se edita        | Impacto                              |
|---------------------------|-----------------------|--------------------------------------|
| `tagline`                 | /settings/landing     | H1 del hero                          |
| `years_experience`        | /settings/landing     | Subtítulo del hero                   |
| `rating` + `review_count` | /settings/landing     | Trust badge + Google rating chip     |
| `services` (lista)        | /settings/services    | Sección "Servicios y precios"        |
| `testimonials`            | /settings/landing     | Carrusel de testimonios              |
| `colors.primary`          | /settings/appearance  | Tema de la landing y dashboard       |
| Logo / portrait           | /settings/landing     | Hero portrait + favicon              |

### 11.1 Subir el portrait (foto del doctor)

```bash
# LOCAL — desde tu máquina, scp la imagen al bucket
scp -P 2222 fotos/dra-lopez.jpg \
  root@<vps-ip>:/opt/auctorum-systems/repo/apps/medconcierge/public/portraits/dra-lopez.jpg

# VPS — actualizar el config
ssh -p 2222 root@<vps-ip>
psql "$DATABASE_URL" -c "
UPDATE tenants
SET config = jsonb_set(config, '{landing,portrait_url}', '\"/portraits/dra-lopez.jpg\"'::jsonb)
WHERE id = '$TENANT_ID';
"
```

Si NO subes una foto, el componente `<DoctorSilhouette gender='female'>` se
muestra como placeholder.

---

## 12. Configuración del bot — system prompt + FAQs + KB

El bot tiene 3 capas de conocimiento. **El cliente las edita desde el
dashboard**, pero aquí está cómo verificarlas y poblarlas vía API si necesitas
hacerlo a mano.

### 12.1 System prompt

Vive en `tenants.config.ai.systemPrompt`. Hay templates por especialidad
en `apps/medconcierge/src/lib/specialty-templates.ts`. Para aplicar un
template (cliente lo hace desde `/ai-settings`):

```bash
# VPS
psql "$DATABASE_URL" -c "
UPDATE tenants
SET config = jsonb_set(
  jsonb_set(config, '{ai,systemPrompt}', '\"Eres el asistente virtual de Dra. María López, cardióloga pediátrica en Saltillo. Responde en español formal, agenda citas, y deriva urgencias al 911. NUNCA des diagnósticos.\"'::jsonb),
  '{applied_specialty_template}', '\"cardiologia\"'::jsonb
)
WHERE id = '$TENANT_ID';
"
```

### 12.2 FAQs

Vive en `tenants.config.ai.faqs` (array). El dashboard
(`/settings/bot` → "Preguntas frecuentes") las edita y al guardar las
embebe automáticamente en `knowledge_base` con `metadata.source='settings_bot_faq'`
para RAG. Una FAQ típica:

```json
{
  "question": "¿Atienden niños?",
  "answer": "Sí. La Dra. López es cardióloga pediátrica y atiende desde recién nacidos hasta 18 años. La consulta de niños incluye valoración del padre/madre acompañante."
}
```

### 12.3 Bot messages (recordatorios, plantillas)

Vive en `tenants.config.bot_messages`. Editado en `/settings/messages`:

```json
{
  "appointment_confirmation": "¡Hola {name}! ✅ Su cita con {doctor_name} está confirmada para {date} a las {time}. Dirección: {address}. Para cancelar/reprogramar responda con CANCELAR o NUEVO HORARIO.",
  "reminder_24h": "Recordatorio: Mañana {date} a las {time} tiene cita con {doctor_name}. Confirme con OK o cancele con CANCELAR.",
  "reminder_2h": "En 2 horas tiene cita con {doctor_name} a las {time}. {address}.",
  "post_consultation": "Gracias por su visita {name}. Si necesita receta o estudios adicionales, avísenos por este chat."
}
```

Variables disponibles: `{name}`, `{doctor_name}`, `{date}`, `{time}`,
`{address}`, `{specialty}`, `{phone}`, `{fee}`. Se interpolan en
`apps/medconcierge/src/lib/bot-messages.ts`.

### 12.4 Knowledge base (RAG)

Tabla `knowledge_base` con `tenant_id + content + embedding (vector(1536)) +
metadata`. El bot hace cosine similarity contra esto antes de cada respuesta.

```bash
# VPS — ver chunks del tenant
psql "$DATABASE_URL" -c "
SELECT metadata->>'title' AS title, metadata->>'source' AS source, length(content) AS chars
FROM knowledge_base
WHERE tenant_id = '$TENANT_ID'
ORDER BY (metadata->>'title');
"

# VPS — test de búsqueda semántica (manual)
sudo -u auctorum env HOME=/home/auctorum DATABASE_URL="$DATABASE_URL" \
  OPENAI_API_KEY="$OPENAI_API_KEY" /usr/bin/pnpm exec tsx -e "
import { db } from './packages/db';
import { sql } from 'drizzle-orm';
const q = '¿Cuánto cuesta la consulta?';
const res = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'text-embedding-3-small', input: q }),
});
const { data } = await res.json();
const emb = '[' + data[0].embedding.join(',') + ']';
const rows = await db.execute(sql\`
  SELECT content, 1 - (embedding <=> \${emb}::vector) AS sim
  FROM knowledge_base
  WHERE tenant_id = '$TENANT_ID'
  ORDER BY embedding <=> \${emb}::vector LIMIT 3
\`);
console.log(rows);
process.exit(0);
"
```

---

## 13. Variantes

### 13.1 Clínica con varios doctores

Una sola row en `tenants` (la clínica), múltiples rows en `doctors`:

```bash
psql "$DATABASE_URL" <<SQL
INSERT INTO doctors (
  tenant_id, name, email, specialty, sub_specialty, cedula_profesional,
  consultation_fee, schedule, is_active
)
VALUES
  ('$TENANT_ID', 'Dr. Juan Pérez',  'juan@clinica.com', 'Cardiología',  null, '111111', '1200', '...', true),
  ('$TENANT_ID', 'Dra. Ana García', 'ana@clinica.com',  'Pediatría',    null, '222222', '900',  '...', true),
  ('$TENANT_ID', 'Dr. Luis Cruz',   'luis@clinica.com', 'Dermatología', null, '333333', '1000', '...', true);
SQL
```

Las citas referencian `appointments.doctor_id`. La inbox y el bot operan
sobre la clínica como un todo (un solo número WhatsApp), pero las citas
se asignan al doctor correspondiente.

### 13.2 Tenant B2B (web :3000, no medconcierge)

Si el cliente NO es médico (es PyME B2B), `tenant_type='business'` y el slug
no debe empezar con `dr-/dra-/doc-`. El middleware lo rutea a la app web
en lugar de medconcierge.

```bash
psql "$DATABASE_URL" -c "
INSERT INTO tenants (slug, name, tenant_type, public_subdomain, public_subdomain_prefix, plan, is_active, config)
VALUES (
  'pymeacme', 'PyME ACME S.A.', 'business', 'pymeacme', '',
  'starter', true, '{...}'::jsonb
);
"
```

Sigue el flujo de Stripe Connect como en §7. NO crees `bot_instances` (B2B
no usa el bot de WhatsApp).

### 13.3 Tenant con número WhatsApp dedicado y Lead Ads + Calendar

Combina §4–8. Orden recomendado:

1. Provisionar tenant (script o manual).
2. Modo dedicated WhatsApp (§5.2).
3. Pagos Stripe Connect (§7.1).
4. Google Calendar OAuth (§6).
5. Lead Ads Meta + Google (§8).
6. Personalizar landing + bot (§11–12).

### 13.4 Tenant solo con web (sin WhatsApp)

Útil para pruebas/demos sin querer involucrar a Meta.

```bash
# El bot_instances NO se crea (o se deja status='paused').
# El widget de chat de la landing puede apuntar a Telegram o quedar oculto.
psql "$DATABASE_URL" -c "
UPDATE tenants
SET config = jsonb_set(config, '{features,whatsapp_disabled}', 'true'::jsonb)
WHERE id = '$TENANT_ID';
"
```

---

## 14. Verificación y entrega al cliente

Antes de mandar credenciales al cliente, corre el checklist:

```bash
# VPS — checklist de verificación
psql "$DATABASE_URL" <<SQL
SELECT
  t.slug,
  t.provisioning_status,
  COUNT(DISTINCT u.id)                                                         AS users,
  COUNT(DISTINCT bi.id) FILTER (WHERE bi.status='active')                      AS active_bots,
  COUNT(DISTINCT kb.id)                                                        AS kb_chunks,
  COUNT(DISTINCT i.id) FILTER (WHERE i.type='google_calendar')                 AS gcal_connected,
  COUNT(DISTINCT i.id) FILTER (WHERE i.type='meta_ads')                        AS meta_ads_connected,
  COUNT(DISTINCT i.id) FILTER (WHERE i.type='google_ads')                      AS google_ads_connected,
  COUNT(DISTINCT i.id) FILTER (WHERE i.type IN ('mercadopago'))                AS mp_connected,
  t.config->'features'->>'online_payment'                                      AS online_payment
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN bot_instances bi ON bi.tenant_id = t.id
LEFT JOIN knowledge_base kb ON kb.tenant_id = t.id
LEFT JOIN integrations i ON i.tenant_id = t.id
WHERE t.slug = 'dra-lopez'
GROUP BY t.id;
SQL
```

```bash
# VPS — smoke tests de URLs
for path in "/" "/login" "/agendar"; do
  curl -sw "$path -> %{http_code}\n" -o /dev/null -m 10 \
    -H 'Host: dra-lopez.auctorum.com.mx' http://127.0.0.1:3001$path
done
# Esperado: / 200, /login 200, /agendar 200
```

```bash
# VPS — confirma logs limpios después de un refresh
sudo -u auctorum env HOME=/home/auctorum pm2 logs auctorum-medconcierge --lines 30 --nostream | \
  grep -iE 'error|warn' | grep -v 'next-auth\|deprecation' | head -10
```

### 14.1 Email de bienvenida al cliente

Plantilla:

```
Hola Dra. López,

Bienvenida a Auctorum. Su consultorio digital está listo:

📍 Su sitio:    https://dra-lopez.auctorum.com.mx
🔐 Dashboard:   https://dra-lopez.auctorum.com.mx/login
👤 Email:       dra.lopez@gmail.com
🔑 Contraseña:  Auctorum<XXXXXXXX>!  (cámbiela en el primer login)

Lo que ya está funcionando:
✅ Landing pública con sus datos y servicios
✅ Bot de WhatsApp respondiendo en español
✅ Inbox unificada (WhatsApp + Instagram si aplicó)
✅ Dashboard con citas, pacientes, documentos y reportes

Lo que necesitamos de usted:
1. Cambiar la contraseña en el primer login
2. Subir su foto de perfil en /settings/landing
3. Editar el sistema prompt del bot en /ai-settings (o usar nuestro template)
4. Agregar sus servicios y precios en /settings/services
5. (Opcional) Conectar Google Calendar en /settings/calendar
6. (Opcional) Activar pagos online en /settings/payments

Próximos pasos:
- Sesión de onboarding: <fecha>
- Dudas: armando@auctorum.com.mx
```

### 14.2 Cambiar password forzado en primer login

El sistema actual usa magic link, pero si quieres forzar reset:

```bash
curl -sX PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$AUTH_USER_ID" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_metadata": {"force_password_reset": true}}'
```

---

## 15. Troubleshooting

### 15.1 La URL no responde

```bash
# VPS
ss -tlnp | grep -E ':(3000|3001) '
# medconcierge debe estar en :3001. Si no, restart:
sudo -u auctorum env HOME=/home/auctorum pm2 restart auctorum-medconcierge
```

```bash
# VPS — Nginx OK?
nginx -t
systemctl status nginx
# Cloudflare proxy desactivado? Prueba con --resolve para skipearlo:
curl -sI --resolve "dra-lopez.auctorum.com.mx:443:<VPS_IP>" \
  https://dra-lopez.auctorum.com.mx/login
```

### 15.2 Login redirige a landing o se queda en blanco

Casi siempre es un cookie chunked corrupto del @supabase/ssr@0.10. Limpia
desde la consola del browser:

```js
document.cookie.split(';').forEach(c => {
  const name = c.split('=')[0].trim();
  if (name.startsWith('sb-')) {
    document.cookie = `${name}=; max-age=0; path=/; domain=.auctorum.com.mx`;
  }
});
location.reload();
```

Si persiste, verificar en el código que se usa `getAll/setAll` (no
`get/set/remove`). Ver `apps/medconcierge/src/middleware.ts`.

### 15.3 El bot no responde en WhatsApp

```bash
# VPS — error log del webhook
tail -n 30 /var/log/auctorum/medconcierge-error.log | grep -E 'wa/|HMAC|signature'

# Si ve 'invalid HMAC signature':
#   - modo shared: revisa WHATSAPP_APP_SECRET en .env.local
#   - modo dedicated: revisa bot_instances.config.app_secret

# Si ve mensajes que llegan pero no se procesan:
sudo -u auctorum env HOME=/home/auctorum pm2 logs auctorum-worker --lines 40 --nostream
# Heartbeat con processed=0 = el webhook no está enqueueando
# Heartbeat con processed=N pero no llega respuesta = circuit breaker OpenAI activo
```

### 15.4 Stats / dashboard 500

Casi siempre es column drift (column inexistente en SQL raw). Patrón:

```bash
tail -n 100 /var/log/auctorum/medconcierge-error.log | grep -E 'column.*does not exist|errorMissingColumn'
```

Si aparece, busca el `db.execute(sql\`...\`)` ofensivo y compara con
`packages/db/schema/<table>.ts`. Casos resueltos: `bot_instances.last_seen_at`
(no existe), `notifications.body` (es `message`).

### 15.5 Cargas lentas / timeouts

```bash
# VPS — RSS de Next.js
sudo -u auctorum env HOME=/home/auctorum pm2 list
# auctorum-medconcierge debe estar < 350MB. Si > 600MB:
sudo -u auctorum env HOME=/home/auctorum pm2 restart auctorum-medconcierge

# VPS — connection pool de Supabase saturado?
psql "$DATABASE_URL" -c "
SELECT state, COUNT(*) FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
"
# Si hay > 80 active, kill idle:
psql "$DATABASE_URL" -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state='idle in transaction' AND state_change < now() - INTERVAL '5 minutes';
"
```

### 15.6 Reportes no carga datos

Tres causas comunes:
1. Sin datos en el rango — el seed mensual ayuda en demo (§4.7).
2. Cast de uuid faltando en SQL raw — fix histórico del 2026-05-08; verificar
   `apps/medconcierge/src/app/api/dashboard/reports/{revenue,appointments}/route.ts`.
3. Rango invertido (`from > to`) — el frontend valida pero no de-vuelta-en-vuelta.

---

## 16. Deprovisionar un tenant

Si el cliente cancela. **No borra los datos**, marca como `is_active=false`
para auditoría.

```bash
# VPS — soft delete
psql "$DATABASE_URL" <<SQL
BEGIN;

UPDATE tenants SET is_active = false, provisioning_status = 'cancelled',
       updated_at = now()
WHERE slug = 'dra-lopez';

UPDATE bot_instances SET status = 'paused', updated_at = now()
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='dra-lopez');

UPDATE integrations SET status = 'disconnected', updated_at = now()
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='dra-lopez');

COMMIT;
SQL
```

```bash
# VPS — opcional: revocar el auth user
TENANT_USER_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE slug='dra-lopez')")
curl -sX DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$TENANT_USER_ID" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

```bash
# VPS — revocar webhooks Meta (si era dedicated)
PAGE_ID=$(psql "$DATABASE_URL" -tAc "SELECT config->>'pageId' FROM integrations WHERE tenant_id=(SELECT id FROM tenants WHERE slug='dra-lopez') AND type='meta_ads'")
[ -n "$PAGE_ID" ] && curl -sX DELETE \
  "https://graph.facebook.com/v19.0/$PAGE_ID/subscribed_apps?access_token=<token>"
```

DNS y Nginx no requieren acción — el wildcard sigue, pero ahora la app
devuelve 404 para slugs con `is_active=false`.

---

## Apéndice — Comandos útiles del operador

```bash
# Listar todos los tenants
psql "$DATABASE_URL" -c "
SELECT slug, name, plan, is_active, provisioning_status,
       (SELECT COUNT(*) FROM appointments WHERE tenant_id = t.id) AS appts,
       (SELECT COUNT(*) FROM patients WHERE tenant_id = t.id)     AS patients
FROM tenants t
ORDER BY created_at DESC;
"

# Ver activity de un tenant en las últimas 24h
psql "$DATABASE_URL" -c "
SELECT
  (SELECT COUNT(*) FROM appointments WHERE tenant_id = t.id AND created_at > now() - INTERVAL '24h') AS new_appts,
  (SELECT COUNT(*) FROM patient_payments WHERE tenant_id = t.id AND created_at > now() - INTERVAL '24h' AND status='succeeded') AS new_payments,
  (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.tenant_id = t.id AND m.created_at > now() - INTERVAL '24h') AS new_messages,
  (SELECT COUNT(*) FROM ad_leads WHERE tenant_id = t.id AND created_at > now() - INTERVAL '24h') AS new_leads
FROM tenants t WHERE t.slug = 'dra-lopez';
"

# Snapshot de uso por tenant (para billing/quota)
psql "$DATABASE_URL" -c "
SELECT t.slug, tu.metric, tu.usage_count, tu.period_start, tu.period_end
FROM tenants t
JOIN tenant_usage tu ON tu.tenant_id = t.id
WHERE tu.period_end > now() - INTERVAL '30 days'
ORDER BY t.slug, tu.metric;
"

# Migrar todos los tenants a una nueva config key (ej. agregar feature flag)
psql "$DATABASE_URL" -c "
UPDATE tenants
SET config = jsonb_set(config, '{features,new_feature}', 'false'::jsonb)
WHERE config->'features'->>'new_feature' IS NULL;
"
```

---

**Ultima revisión:** 2026-05-08 · `git rev-parse HEAD` cuando se commitea
este doc identifica el snapshot del flujo. Si algo cambia (new feature,
new integration), agrega una sección y actualiza `README.md` con el link.
