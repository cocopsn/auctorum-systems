# Deployment

Cómo se despliega Auctorum Systems en producción. Asume que ya existe el VPS
provisionado y el repo clonado en `/opt/auctorum-systems/repo`. Para bootstrap
desde cero, ver la sección **Provisioning** al final.

## Producción actual

| Recurso          | Valor                                              |
|------------------|----------------------------------------------------|
| VPS              | DigitalOcean droplet · Ubuntu 24.04 LTS            |
| Specs            | 2 vCPU · 8 GiB RAM · 154 GiB SSD · IP única        |
| SSH              | Puerto `2222`, key-only (no password)              |
| Repo path        | `/opt/auctorum-systems/repo`                       |
| Reverse proxy    | Nginx (`/etc/nginx/sites-enabled/auctorum`)        |
| TLS              | Let's Encrypt (`/etc/letsencrypt/live/auctorum.com.mx`) |
| Process manager  | PM2 + `pm2-logrotate` module                       |
| Logs             | `/var/log/auctorum/*.log`                          |
| Node             | v20 LTS (via nvm)                                  |
| pnpm             | 10.x via `corepack`                                |
| DNS              | Cloudflare (proxy naranja para todos los hosts)    |
| DB               | Supabase Postgres (pooler IPv4)                    |
| Redis            | local en el mismo VPS para BullMQ                  |

## Flujo de deploy estándar

Después de probar localmente con `pnpm build` (CI también lo valida en
GitHub Actions):

```bash
# 1. En tu máquina local — push a main
git add -A
git commit -m "feat: ..."
git push origin main
# CI corre tests + build en GitHub Actions. Si falla, no se hace deploy.

# 2. En el VPS — pull + rebuild + restart
ssh -p 2222 root@<vps-ip>
cd /opt/auctorum-systems/repo
sudo -u auctorum git pull origin main
sudo -u auctorum HOME=/home/auctorum corepack pnpm install --frozen-lockfile
sudo -u auctorum HOME=/home/auctorum NODE_OPTIONS='--max-old-space-size=3072' \
  corepack pnpm build

# Restart sin downtime — los 4 procesos Next.js
pm2 reload ecosystem.config.js --update-env
pm2 save

# 3. Verificar
pm2 list | grep -E "web-1|web-2|med-1|med-2"
curl -sI -H 'Host: auctorum.com.mx' http://127.0.0.1:3000/ | head -3
curl -sI -H 'Host: med.auctorum.com.mx' http://127.0.0.1:3001/login | head -3
# Probar el otro puerto del upstream también:
curl -sI -H 'Host: med.auctorum.com.mx' http://127.0.0.1:3011/login | head -3

# Confirmar 0 EADDRINUSE / "Failed to start server" en logs
tail -n 20 /var/log/auctorum/medconcierge-error.log
tail -n 20 /var/log/auctorum/quote-engine-error.log
```

Si hubo cambios en workers/crons:

```bash
pm2 restart auctorum-worker auctorum-campaign-worker --update-env
# Los crons no requieren restart manual — PM2 los re-arranca al disparar
```

Si hubo migraciones nuevas:

```bash
DBURL=$(grep -E '^DATABASE_URL' apps/medconcierge/.env.local | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
psql "$DBURL" -f packages/db/migrations/0050_NEW_MIGRATION.sql
```

## Deploy desde cero (rebuild + reinicio total)

```bash
ssh -p 2222 auctorum@<vps-ip>
cd /opt/auctorum-systems/repo
git fetch origin && git reset --hard origin/main
rm -rf apps/web/.next apps/medconcierge/.next
NODE_OPTIONS='--max-old-space-size=4096' corepack pnpm install --frozen-lockfile
NODE_OPTIONS='--max-old-space-size=4096' corepack pnpm build
pm2 reload all --update-env
pm2 save
```

`pm2 reload` rota workers manteniendo uptime sin tirar tráfico.

## ecosystem.config.js (procesos)

Apps Next.js en **fork mode** — dos procesos por app en puertos distintos
detrás de un upstream pool de Nginx con round-robin. NO usar cluster mode
para Next (ver `docs/ARCHITECTURE.md` sección "Por qué fork mode").

| nombre                         | script                                  | puerto / cadencia |
|--------------------------------|-----------------------------------------|-------------------|
| `auctorum-web-1`               | `node_modules/next/dist/bin/next start` | :3000             |
| `auctorum-web-2`               | `node_modules/next/dist/bin/next start` | :3010             |
| `auctorum-med-1`               | `node_modules/next/dist/bin/next start` | :3001             |
| `auctorum-med-2`               | `node_modules/next/dist/bin/next start` | :3011             |
| `auctorum-worker` x2           | `scripts/worker.ts`                     | BullMQ WA queue   |
| `auctorum-campaign-worker`     | `scripts/campaign-worker.ts`            | BullMQ campaigns  |
| `cron-reminders`               | `scripts/cron-reminders.ts`             | cada 4h           |
| `cron-appointment-reminders`   | `scripts/cron-appointment-reminders.ts` | cada 15m          |
| `cron-calendar-sync`           | `scripts/cron-calendar-sync.ts`         | cada 5m           |
| `cron-calendar-pending`        | `scripts/cron-calendar-pending.ts`      | cada 5m           |
| `cron-campaigns`               | `scripts/cron-campaigns.ts`             | cada 10m          |
| `cron-webhook-retries`         | `scripts/cron-webhook-retries.ts`       | cada 5m           |
| `cron-weekly-report`           | `scripts/cron-weekly-report.ts`         | lun 8:00 am       |
| `cron-data-integrity`          | `scripts/check-data-integrity.ts`       | diario 6:00 am    |
| `cron-dlq-monitor`             | `scripts/cron-dlq-monitor.ts`           | cada 15m          |
| `cron-data-deletion`           | `scripts/cron-data-deletion.ts`         | diario 4:00 am    |
| `cron-follow-ups`              | `scripts/cron-follow-ups.ts`            | cada 15m          |
| `cron-tenant-cleanup`          | `scripts/cron-tenant-cleanup.ts`        | diario 5:00 am    |

`ecosystem.config.js` lee `.env.local` de cada app dinámicamente al arrancar
mediante `loadEnvFile(...)`. Para añadir/cambiar env vars, edita
`.env.local` y luego `pm2 restart <proceso> --update-env`.

Una vez configurado, persistir en `pm2 startup` para que sobreviva reboots:

```bash
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u auctorum --hp /home/auctorum
# Sigue las instrucciones que imprime PM2
```

## Nginx — vhost layout

`/etc/nginx/sites-enabled/auctorum` empieza con dos `upstream` pools y
luego define `server` blocks que los referencian:

```nginx
upstream auctorum_web_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3010;
    keepalive 8;
}
upstream auctorum_med_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3011;
    keepalive 8;
}
```

Los `server` blocks:

1. **HTTP → HTTPS redirect** para `auctorum.com.mx`, `www.*`,
   `portal.*`, `*.auctorum.com.mx`. Permite `/.well-known/acme-challenge/`
   en HTTP para renovación de certificados.

2. **`auctorum.com.mx` + `www.*` → `auctorum_web_backend`**
   - Cache-Control immutable para `/_next/static/`
   - Rate limit `api:30r/m` y `quotes:10r/m`
   - HSTS preload, CSP, X-Frame-Options DENY

3. **`portal.* + *.auctorum.com.mx` → `auctorum_med_backend` si subdomain
   matches `dr-|dra-|doc-` prefix; resto cae a `auctorum_web_backend`.**

4. **`med.auctorum.com.mx` → `auctorum_med_backend`** con headers PWA-friendly:
   `Service-Worker-Allowed: /` y `Cache-Control: no-cache` para
   `/manifest.json` y `/sw.js`.

Para aplicar / re-aplicar las upstream pools en una VPS limpia o nueva:

```bash
sudo bash /opt/auctorum-systems/repo/scripts/nginx-upstream-patch.sh
# Idempotente — corre dos veces sin efecto. Crea backup antes de mutar.

sudo nginx -t                       # valida la config
sudo systemctl reload nginx          # aplica sin downtime
```

## Cloudflare

- DNS: registros `A` apuntando a la IP del VPS para `@`, `www`, `portal`,
  `med`, `*` (wildcard para tenants). Todos en proxy naranja.
- SSL/TLS mode: **Full (strict)** — Cloudflare verifica el cert de Let's Encrypt.
- WAF rules: bloqueo de countries fuera de NA/MX para `/api/v1/*` y
  `/api/webhooks/*` (excepto IPs de WhatsApp Cloud, Stripe, MercadoPago).
- Rate limiting Cloudflare: extra layer encima de Nginx para `/api/auth/*`
  (5 intentos / 5min).
- Origin certificate (Cloudflare → Nginx) se configura en
  `/etc/nginx/cloudflare-origin/` si en algún momento se quiere migrar
  de Let's Encrypt al cert de Cloudflare.

## TLS / Let's Encrypt

```bash
# Renovación auto vía systemd timer (verificar):
sudo systemctl list-timers | grep certbot

# Renovación manual / nuevos hosts:
sudo certbot --nginx -d auctorum.com.mx -d www.auctorum.com.mx \
  -d portal.auctorum.com.mx -d med.auctorum.com.mx \
  --non-interactive --agree-tos --email armando@auctorum.com.mx

# El cert wildcard *.auctorum.com.mx requiere DNS-01 challenge
# (Cloudflare API token con scope Zone.DNS:Edit):
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.cloudflare-credentials \
  -d '*.auctorum.com.mx' -d auctorum.com.mx
```

## Firewall (`ufw`)

```bash
sudo ufw status
# Esperado:
# 80/tcp     ALLOW   Anywhere      (HTTP — solo redirect)
# 443/tcp    ALLOW   Anywhere      (HTTPS)
# 2222/tcp   ALLOW   Anywhere      (SSH custom port)
# Default: deny incoming, allow outgoing
```

Apps Next.js bindean a `127.0.0.1`, no a `0.0.0.0`. Solo Nginx (corriendo en
`:443`) ve tráfico externo.

## Logs

PM2 escribe a `/var/log/auctorum/*.log`. `pm2-logrotate` rota cada 30 días o
10 MB:

```bash
pm2 logs <process> --lines 100 --nostream    # tail sin streaming
pm2 logs <process> --lines 100               # streaming en vivo
ls /var/log/auctorum/                        # archivos rotados
sudo journalctl -u nginx --since '1 hour ago' | tail -50
```

Workers emiten heartbeats cada 5min en JSON estructurado:

```json
{"type":"heartbeat","uptime":300,"rss":"95MB","heap":"18MB","processed":42,"timestamp":"..."}
```

Crons emiten un objeto por ejecución:

```json
{"action":"calendar_pending_cycle","ms":117,"retried":0,"resolved":0,"failed":0,"deadLetter":0}
```

Estos formatos son grep-ables y pueden enviarse a Loki / Datadog / etc.

## Variables de entorno

Cada app tiene su `.env.local`. Variables clave:

```bash
# Compartido
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."   # SOLO server-side
NEXT_PUBLIC_APP_DOMAIN="auctorum.com.mx"

# IA
OPENAI_API_KEY="sk-..."

# WhatsApp Cloud
WHATSAPP_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_VERIFY_TOKEN="..."        # match con configuración Meta
WHATSAPP_APP_SECRET="..."          # para HMAC del webhook

# Email
RESEND_API_KEY="re_..."

# Pagos
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
MERCADOPAGO_WEBHOOK_SECRET="..."

# PWA Web Push (medconcierge únicamente)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="B..."
VAPID_PUBLIC_KEY="B..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:contacto@auctorum.com.mx"

# Meta Lead Ads (medconcierge — opcional, requerido si conectas Lead Ads)
META_APP_SECRET="..."                  # comparte con WhatsApp si misma Meta App
META_LEADS_VERIFY_TOKEN="..."          # token elegido en Meta App webhook setup

# Google Calendar (per-tenant — guardado en DB, no aquí)

# Sentry (opcional — auto-disabled si no está)
NEXT_PUBLIC_SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
SENTRY_ORG="auctorum"
SENTRY_PROJECT="medconcierge"          # o "web" según el .env.local
SENTRY_AUTH_TOKEN="..."                # SOLO en CI / VPS — subir source maps
SENTRY_ENV="production"                # opcional, default=NODE_ENV

# Encryption (medconcierge — OAuth tokens encriptados en integrations.config)
ENCRYPTION_KEY="<32 bytes hex — openssl rand -hex 32>"

# Tenant cleanup (opcional)
TENANT_STALE_DAYS="14"                 # default si no se setea
```

`NUNCA` commitear `.env.local`. El `.gitignore` ya los excluye.

## Migraciones DB

Dos modos:

```bash
# Modo Drizzle (genera + aplica)
pnpm db:generate    # toma cambios de packages/db/schema/*.ts
pnpm db:migrate     # aplica via DATABASE_URL

# Modo SQL manual (cuando una migración requiere lógica fuera de Drizzle)
DBURL=$(grep -E '^DATABASE_URL' apps/medconcierge/.env.local \
  | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
psql "$DBURL" -f packages/db/migrations/0050_web_push_subscriptions.sql
```

Política: cada SQL es idempotente. La numeración es estricta y monótona.

## Health checks

Un script de smoke test típico (después de cualquier deploy):

```bash
ssh -p 2222 auctorum@<vps-ip> "
echo '=== PM2 ==='
pm2 list | grep -E 'online|errored' | head -15
echo '=== web routes ==='
for path in / /about /systems /platform /signup /login; do
  code=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: auctorum.com.mx' http://127.0.0.1:3000\$path)
  echo \"\$path -> \$code\"
done
echo '=== med routes ==='
for path in /login /signup /privacy /terms /api-docs; do
  code=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: med.auctorum.com.mx' http://127.0.0.1:3001\$path)
  echo \"\$path -> \$code\"
done
echo '=== PWA ==='
for path in /manifest.json /sw.js /icons/icon-192.png /apple-touch-icon.png; do
  code=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: med.auctorum.com.mx' http://127.0.0.1:3001\$path)
  echo \"\$path -> \$code\"
done
"
```

Esperado: todos `200` excepto algunos `307` (redirects intencionales) y
`401` en endpoints auth-protected si se golpean sin sesión.

## CI / GitHub Actions

`.github/workflows/ci.yml` corre en cada PR y push a `main`:

1. `corepack pnpm install --frozen-lockfile`
2. `pnpm test:run` (215 tests unit + integration + AI guard)
3. `pnpm build:med` y `pnpm build:web` con env vars stub
4. Secret-leak scan inline (`sk_live_`, service_role keys, `.env.local`
   tracked)

Concurrency: corre solo el último commit de cada branch — pushes
encadenados cancelan el anterior. Tiempo total: ~6-10 min, cubierto
sobradamente por el free tier (2,000 min/mes).

Si CI falla, NO se hace deploy. Aún se requiere `pm2 reload` manual en
la VPS — no hay deploy automático desde CI por ahora.

## Rollback

```bash
ssh -p 2222 root@<vps-ip>
cd /opt/auctorum-systems/repo

# Opción A (preferida) — revert commit, push, redeploy
sudo -u auctorum git log --oneline -10
sudo -u auctorum git revert HEAD --no-edit
sudo -u auctorum git push origin main
sudo -u auctorum HOME=/home/auctorum NODE_OPTIONS='--max-old-space-size=3072' \
  corepack pnpm build
pm2 reload ecosystem.config.js --update-env

# Opción B (destructivo, sólo si nadie pulló) — hard reset
sudo -u auctorum git reset --hard <sha-bueno>
sudo -u auctorum git push -f origin main
sudo -u auctorum HOME=/home/auctorum NODE_OPTIONS='--max-old-space-size=3072' \
  corepack pnpm build
pm2 reload ecosystem.config.js --update-env
```

Para una migración de DB, escribir y aplicar una migración inversa (drop
de columnas/tablas con `IF EXISTS`). Nunca editar la migración original
después de mergear.

Ver `docs/DISASTER-RECOVERY.md` para escenarios más graves (VPS muerta,
DB corrupta, secrets comprometidos).

## Provisioning (bootstrap desde cero)

Resumen: Ubuntu 24.04 → user `auctorum` → SSH key-only :2222 → instalar
Node/pnpm/PM2/Nginx/Redis → clonar repo → `.env.local` → `pnpm build` →
`pm2 start ecosystem.config.js` → `pm2 save && pm2 startup` → certbot.

```bash
# Como root al provisionar
adduser --disabled-password --gecos "" auctorum
mkdir -p /home/auctorum/.ssh && chmod 700 /home/auctorum/.ssh
echo "<tu-ssh-pubkey>" >> /home/auctorum/.ssh/authorized_keys
chmod 600 /home/auctorum/.ssh/authorized_keys
chown -R auctorum:auctorum /home/auctorum/.ssh

# /etc/ssh/sshd_config: Port 2222, PasswordAuthentication no, PermitRootLogin no
systemctl reload ssh

# Software
apt update && apt install -y nginx redis-server postgresql-client
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Como auctorum:
nvm install --lts && corepack enable
npm install -g pm2

# ufw
ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 2222/tcp
ufw --force enable

# Repo
mkdir -p /opt/auctorum-systems && chown auctorum:auctorum /opt/auctorum-systems
sudo -u auctorum git clone https://github.com/cocopsn/auctorum-systems.git /opt/auctorum-systems/repo
cd /opt/auctorum-systems/repo
sudo -u auctorum corepack pnpm install --frozen-lockfile

# .env.local copiados manualmente (sftp). Luego:
sudo -u auctorum corepack pnpm build
sudo -u auctorum pm2 start ecosystem.config.js
sudo -u auctorum pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u auctorum --hp /home/auctorum

# Nginx vhost — copiar /etc/nginx/sites-available/auctorum desde el repo de infra
ln -s /etc/nginx/sites-available/auctorum /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# TLS
certbot --nginx -d auctorum.com.mx -d www.auctorum.com.mx -d portal.auctorum.com.mx -d med.auctorum.com.mx
```
