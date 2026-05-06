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

Después de probar localmente con `pnpm build`:

```bash
# 1. En tu máquina local — push a main
git add -A
git commit -m "feat: ..."
git push origin main

# 2. En el VPS — pull + rebuild + restart
ssh -p 2222 auctorum@<vps-ip>
cd /opt/auctorum-systems/repo
git fetch origin && git reset --hard origin/main

# Build solo lo que cambió
NODE_OPTIONS='--max-old-space-size=4096' corepack pnpm --filter web build
NODE_OPTIONS='--max-old-space-size=4096' corepack pnpm --filter medconcierge build

# Restart sin downtime
pm2 restart auctorum-quote-engine auctorum-medconcierge --update-env
pm2 save

# 3. Verificar
pm2 list
curl -sI -H 'Host: auctorum.com.mx' http://127.0.0.1:3000/ | head -3
curl -sI -H 'Host: med.auctorum.com.mx' http://127.0.0.1:3001/login | head -3
pm2 logs auctorum-medconcierge --lines 20 --nostream | grep -iE 'error|warn' | head -5
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

## ecosystem.config.js (10 procesos)

| id | nombre                         | script                              | tipo         |
|----|--------------------------------|-------------------------------------|--------------|
| 0  | `auctorum-quote-engine`        | `node_modules/next/dist/bin/next`   | long-running |
| 1  | `auctorum-medconcierge`        | `node_modules/next/dist/bin/next`   | long-running |
| 2  | `cron-reminders`               | `scripts/cron-reminders.ts`         | cron 4h      |
| 3  | `cron-appointment-reminders`   | `scripts/cron-appointment-reminders.ts` | cron 15m |
| 4  | `cron-calendar-sync`           | `scripts/cron-calendar-sync.ts`     | cron 5m      |
| 5  | `auctorum-worker`              | `scripts/worker.ts`                 | long-running |
| 6  | `auctorum-campaign-worker`     | `scripts/campaign-worker.ts`        | long-running |
| 7  | `cron-campaigns`               | `scripts/cron-campaigns.ts`         | cron 10m     |
| 9  | `cron-webhook-retries`         | `scripts/cron-webhook-retries.ts`   | cron 5m      |
| 10 | `cron-calendar-pending`        | `scripts/cron-calendar-pending.ts`  | cron 5m      |

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

`/etc/nginx/sites-enabled/auctorum` define cuatro `server` blocks:

1. **HTTP → HTTPS redirect** para `auctorum.com.mx`, `www.*`,
   `portal.*`, `*.auctorum.com.mx`. Permite `/.well-known/acme-challenge/`
   en HTTP para renovación de certificados.

2. **`auctorum.com.mx` + `www.*` → web :3000**
   - Cache-Control immutable para `/_next/static/`
   - Rate limit `api:30r/m` y `quotes:10r/m`
   - HSTS preload, CSP, X-Frame-Options DENY

3. **`portal.* + *.auctorum.com.mx` → medconcierge :3001 si subdomain
   matches `dr-|dra-|doc-` prefix; resto cae a web :3000.**

4. **`med.auctorum.com.mx` → medconcierge :3001** con headers PWA-friendly:
   `Service-Worker-Allowed: /` y `Cache-Control: no-cache` para
   `/manifest.json` y `/sw.js`.

```bash
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

# Google Calendar (per-tenant — guardado en DB, no aquí)
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

## Rollback

```bash
ssh -p 2222 auctorum@<vps-ip>
cd /opt/auctorum-systems/repo
git log --oneline -10
git reset --hard <sha-bueno>
NODE_OPTIONS='--max-old-space-size=4096' corepack pnpm build
pm2 reload all --update-env
```

Para una migración de DB, escribir y aplicar una migración inversa (drop
de columnas/tablas con `IF EXISTS`). Nunca editar la migración original
después de mergear.

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
