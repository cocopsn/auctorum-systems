# Disaster Recovery Runbook — Auctorum Systems

This document is the 3am playbook. Print it. Save it offline. Don't read
through it for the first time during an incident.

## Recovery targets

| Target | Value |
|---|---|
| **RTO** (Recovery Time Objective) | 2 hours |
| **RPO** (Recovery Point Objective) | 24 hours (daily Supabase backup) |
| **MTTD** (Mean Time To Detect) | 5 minutes (Sentry + UptimeRobot — once wired) |

## Where data lives

| Asset | Location | Recovery |
|---|---|---|
| **Postgres data** (tenants, patients, appointments, clinical_records, etc.) | Supabase (`aws-1-us-east-1.pooler.supabase.com:6543`) | Supabase PITR + daily backup |
| **Uploaded files** (clinical attachments, portal images, signed PDFs) | Supabase Storage buckets `clinical-files`, `documents`, `portal-images` | Supabase replicates storage; PITR within retention |
| **Redis state** (BullMQ queues, rate-limit counters, locks) | VPS local `/var/lib/redis` with AOF | **Lost on VPS death.** Jobs re-enqueue; rate-limit windows reset (acceptable) |
| **Application logs** | `/var/log/auctorum/*.log` on VPS, rotated daily | Lost on VPS death (acceptable) |
| **Secrets** | `apps/web/.env.local`, `apps/medconcierge/.env.local` on VPS | Must be kept in an out-of-band password manager (1Password / Bitwarden) |
| **Code** | GitHub `cocopsn/auctorum-systems` | Always recoverable |

## Backup restore drill

Run quarterly. Do NOT skip — an untested backup is a non-existent backup.

```bash
# 1. Dump current production state to a portable .sql
pg_dump "$DATABASE_URL" --no-owner --no-acl --no-comments \
  > /tmp/auctorum-backup-$(date +%Y%m%d).sql

# 2. Sanity-check shape (don't restore yet)
head -50 /tmp/auctorum-backup-*.sql
wc -l /tmp/auctorum-backup-*.sql      # should be tens of thousands of lines
grep -c "INSERT INTO" /tmp/auctorum-backup-*.sql

# 3. Spin up a throwaway local Postgres and restore into it
docker run -d --name auctorum-restore-test \
  -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16
sleep 4
psql "postgresql://postgres:test@localhost:55432/postgres" \
  -c "CREATE DATABASE auctorum_restore;"
psql "postgresql://postgres:test@localhost:55432/auctorum_restore" \
  < /tmp/auctorum-backup-*.sql

# 4. Verify counts match production (sanity, not exhaustive)
psql "postgresql://postgres:test@localhost:55432/auctorum_restore" \
  -c "SELECT 'tenants' AS table, COUNT(*) FROM tenants
      UNION ALL SELECT 'patients', COUNT(*) FROM patients
      UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
      UNION ALL SELECT 'clinical_records', COUNT(*) FROM clinical_records;"

# 5. Cleanup
docker rm -f auctorum-restore-test
rm /tmp/auctorum-backup-*.sql
```

If any step fails: **stop, fix, retry**. Document what broke in this
runbook.

## Scenario 1 — VPS dies completely

**Symptom:** UptimeRobot fires; `ssh -p 2222 root@68.183.137.44` times
out; DO console shows the droplet in "stopped" or unreachable.

```bash
# 1. Create a new droplet (DigitalOcean panel)
#    - Region: NYC1 (closest to Supabase us-east-1)
#    - Size: s-4vcpu-8gb (same as current)
#    - Image: Ubuntu 24.04 LTS x64
#    - SSH key: add yours

# 2. Bootstrap (run as root on the new droplet)
apt update && apt upgrade -y
adduser --disabled-password --gecos "" auctorum
mkdir -p /opt/auctorum-systems && chown auctorum: /opt/auctorum-systems

# 3. Install runtime
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx redis-server postgresql-client
corepack enable
npm i -g pm2

# 4. Clone code
sudo -u auctorum git clone -b main \
  https://github.com/cocopsn/auctorum-systems.git \
  /opt/auctorum-systems/repo

# 5. Restore secrets — copy .env.local files from your password manager
#    into apps/web/.env.local and apps/medconcierge/.env.local on the VPS.
#    Set chmod 600.

# 6. Install + build
cd /opt/auctorum-systems/repo
sudo -u auctorum corepack pnpm install --frozen-lockfile
sudo -u auctorum NODE_OPTIONS='--max-old-space-size=3072' corepack pnpm build

# 7. Nginx — copy /etc/nginx/sites-available/auctorum from the backup
#    or restore from a previous deploy snapshot.
ln -sf /etc/nginx/sites-available/auctorum /etc/nginx/sites-enabled/
certbot --nginx -d auctorum.com.mx -d "*.auctorum.com.mx" -d med.auctorum.com.mx -d portal.auctorum.com.mx
nginx -t && systemctl reload nginx

# 8. PM2 boot
cd /opt/auctorum-systems/repo
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
# Run the command pm2 prints

# 9. Cutover DNS in Cloudflare
#    auctorum.com.mx A         → <new IP>
#    *.auctorum.com.mx A       → <new IP>
#    med.auctorum.com.mx CNAME → auctorum.com.mx (or A → <new IP>)
#    portal.auctorum.com.mx CNAME → auctorum.com.mx
#    TTL: 60s during cutover, 300s afterwards.

# 10. Smoke test
curl -s -o /dev/null -w "%{http_code}\n" https://auctorum.com.mx/
curl -s -o /dev/null -w "%{http_code}\n" https://med.auctorum.com.mx/
curl -s -o /dev/null -w "%{http_code}\n" https://portal.auctorum.com.mx/login
curl -s -o /dev/null -w "%{http_code}\n" https://dra-martinez.auctorum.com.mx/
```

Data is in Supabase, so no DB restore needed for this scenario.

## Scenario 2 — Database corruption / accidental destructive query

**Symptom:** integrity cron flags zero-count tables; reports return
empty; users report "all my patients disappeared."

```bash
# 1. STOP THE BLEEDING — put both apps in maintenance mode immediately
ssh -p 2222 root@68.183.137.44
pm2 stop auctorum-web-1 auctorum-web-2 auctorum-med-1 auctorum-med-2

# 2. Identify the timestamp BEFORE the corruption.
#    - Check audit_log for the offending action
#    - Check Sentry for the first error spike
#    - Roughly: when did integrity start failing?

# 3. Supabase Dashboard → Database → Backups → PITR
#    Choose a timestamp ~5 minutes before the incident.
#    Confirm; Supabase performs the restore in-place. Takes 5-20min
#    depending on DB size.

# 4. ALTERNATIVELY restore from a manual pg_dump
psql "$DATABASE_URL" < /tmp/auctorum-backup-YYYYMMDD.sql

# 5. Re-apply any migrations created after the backup timestamp
cd /opt/auctorum-systems/repo
sudo -u auctorum corepack pnpm db:migrate

# 6. Run the integrity check
sudo -u auctorum npx tsx scripts/check-data-integrity.ts
# All COUNT-must-be-zero invariants should pass.

# 7. Start apps back up
pm2 start auctorum-web-1 auctorum-web-2 auctorum-med-1 auctorum-med-2
pm2 save

# 8. Communicate to affected tenants — be specific about what window
#    of changes was lost (between backup ts and incident ts).
```

## Scenario 3 — Secrets compromised

**Symptom:** unusual API usage on OpenAI/Stripe/Meta dashboards;
unexpected charges; alerts from Supabase about anonymous access; a
collaborator's laptop was stolen.

**Rotate immediately, in this order** (most damaging first):

```bash
# A. SUPABASE_SERVICE_ROLE_KEY — bypasses RLS, full admin
#    Supabase Dashboard → Project Settings → API → Reset service_role
#    Update apps/{web,medconcierge}/.env.local on VPS.

# B. STRIPE_SECRET_KEY — can charge cards
#    Stripe Dashboard → Developers → API keys → Roll
#    Update .env.local. Restart workers immediately.

# C. ENCRYPTION_KEY — protects OAuth tokens at rest
#    openssl rand -hex 32 > new_key
#    Re-encrypt all rows in `integrations.config` using the script:
#      sudo -u auctorum npx tsx scripts/rotate-encryption-key.ts \
#        --old "$OLD_ENCRYPTION_KEY" --new "$NEW_ENCRYPTION_KEY"
#    Update .env.local LAST so workers don't trip during rewrite.

# D. OPENAI_API_KEY — most expensive to leak
#    OpenAI Dashboard → API Keys → Revoke + create new.

# E. META_APP_SECRET — WhatsApp/Instagram webhook HMAC
#    Meta Developer Console → App Settings → Basic → Show.
#    Note: rotating this will invalidate all in-flight webhook
#    signatures until Meta sees the new value. Coordinate.

# F. MercadoPago access token
# G. DATABASE_URL password (Supabase → Database → Reset)
# H. REDIS_PASSWORD (/etc/redis/redis.conf → requirepass + restart redis)
# I. Cron tokens stored in integrations.config (Google Ads webhookToken
#    is the main one). Rotate via /settings/ads in the dashboard for
#    each affected tenant.

# After rotation:
pm2 reload ecosystem.config.js --update-env
pm2 save

# Verify nothing broke
curl -s -o /dev/null -w "%{http_code}\n" https://med.auctorum.com.mx/
pm2 logs --err --lines 50 --nostream | tail -30
```

**Do NOT** delete the compromised keys immediately — keep them
revoked-but-named in the password manager for 30 days so you can
forensically attribute log entries to "before rotation."

## Scenario 4 — Bad deploy in production

**Symptom:** Sentry error spike right after `git push origin main` →
`pm2 reload`. Test users report 500s, /dashboard blank, etc.

```bash
ssh -p 2222 root@68.183.137.44
cd /opt/auctorum-systems/repo

# 1. Identify the last good commit
git log --oneline -10

# 2. Revert (PREFERRED — keeps history clean)
sudo -u auctorum git revert HEAD --no-edit
sudo -u auctorum git push origin main

# 3. Rebuild
sudo -u auctorum NODE_OPTIONS='--max-old-space-size=3072' \
  corepack pnpm build

# 4. Reload
pm2 reload ecosystem.config.js --update-env

# 5. Verify
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/login
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/

# If `git revert` would create a merge conflict (the bad commit had
# follow-up commits that depend on it), fall back to a hard reset.
# This rewrites history — only safe if no one else has pulled:
# sudo -u auctorum git reset --hard <last-good-commit>
# sudo -u auctorum git push -f origin main
```

## Contacts

- **Armando (CEO/Dev)**: +52 844 538 7404
- **Supabase Support**: support@supabase.io (Pro tier — ~24h SLA)
- **DigitalOcean Support**: panel ticket
- **Cloudflare Support**: panel ticket
- **Stripe Support**: panel chat
- **OpenAI Support**: help.openai.com → contact
- **Meta Business Help Center**: business.facebook.com/help

## Post-incident checklist

After resolving:

- [ ] Write a brief postmortem to `docs/postmortems/YYYY-MM-DD-<slug>.md`
- [ ] Identify root cause + corrective action
- [ ] Add a test that would have caught this
- [ ] Update this runbook with any new playbook step you discovered
- [ ] Communicate to affected customers (email if downtime > 30min)
- [ ] Schedule a 30-min review with the team within 7 days
