# Week 3 P2 — Manual Actions

Code-side hardening is done (NOM-004 signature, cookie banner, DPAs
page, PM2 cluster, auto-sync fix, k6 script, bundle analyzer scaffold,
10 perf indexes). These items need owner / external action — they can't
be automated from inside the repo.

---

## 1. HSTS preload submission (P2-4)

The CSP headers already include `preload`. To get browsers to honour
the preload before a first-visit:

1. Confirm the header is live:
   ```bash
   curl -sI https://auctorum.com.mx | grep -i strict
   curl -sI https://med.auctorum.com.mx | grep -i strict
   # Both should print: max-age=63072000; includeSubDomains; preload
   ```
2. Submit at <https://hstspreload.org/?domain=auctorum.com.mx>.
3. Wait 8–12 weeks for Chrome/Firefox/Safari to ship it in the next
   stable release. Once submitted, removing the `preload` directive is
   non-trivial — your domain is committed to HTTPS-only forever.

---

## 2. CSP nonce-based — DEFERRED to P3 (P2-8)

The current CSP relies on `'unsafe-inline'` for `script-src` and
`style-src`. Moving to nonce-based CSP in Next.js 14 requires:

- A middleware that generates a random nonce per request and forwards
  it to the response header AND to the page via headers/props.
- Wrapping every `<Script>`, inline `<style>`, and third-party loader
  (Cloudflare Insights, Google Fonts) so they tag the nonce.
- An exhaustive sweep of the dashboard for inline event handlers
  (`onclick="..."`, `dangerouslySetInnerHTML`) — those still need
  `'unsafe-hashes'` or refactoring to React event props.

Estimated effort: 2–3 days. Pre-requirement for getting an A+ on
SecurityHeaders.com. Defer until a customer's procurement review asks
for it.

When you do tackle it, prefer the Next.js 14 nonce pattern:
<https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy>

---

## 3. DigitalOcean disk encryption — verify (P2-9)

DigitalOcean encrypts all newly-provisioned Block Storage volumes at
rest since 2020. Droplet local disks: encrypted at rest in the
underlying hardware, but DO doesn't expose a per-droplet "encrypted"
toggle.

To verify:

1. Open <https://cloud.digitalocean.com/droplets>.
2. Click your droplet → "Resources" tab.
3. If any Volumes are attached, confirm "Encryption" column shows
   "Encrypted".
4. For the root disk: DO's standard guarantee covers it. Note this
   in your Aviso de Privacidad if asked by a customer auditor.

Compensating control if a customer wants explicit confirmation: spin
up an encrypted block storage volume, attach it, and migrate
`/var/log/auctorum` (PII-laden logs) onto it. ~30 min.

---

## 4. Install k6 on the VPS for load tests (P2-10)

The smoke test lives at `tests/load/smoke.js`. To run it from the VPS:

```bash
ssh -p 2222 root@68.183.137.44
# Install k6 (Ubuntu 24.04)
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Run (against loopback to skip Cloudflare)
cd /opt/auctorum-systems/repo
k6 run --env BASE_MED=http://127.0.0.1:3001 \
       --env BASE_WEB=http://127.0.0.1:3000 \
       tests/load/smoke.js
```

Expected: p95 < 500ms, error rate < 1%. If thresholds break, k6 exits
non-zero — pipe into CI gating or run manually before deploys.

---

## 5. Install bundle analyzer (P2-5)

When you want to inspect a build:

```bash
corepack pnpm add -D @next/bundle-analyzer --filter medconcierge
ANALYZE=true pnpm build:med
# Opens browser with the bundle treemap
```

Pre-installed scaffolding lives in `apps/medconcierge/next.config.js`
(it's a no-op until you set `ANALYZE=true` and install the dep). Look
for: moment.js, lodash-full, antd, recharts (heavy), framer-motion
(heavy). Replace with date-fns, lodash-es subsets, lightweight chart
libs where reasonable.

---

## 6. Backfill OAuth tokens encryption (P1-17 follow-up from Week 2)

Still pending. Run once when convenient:

```bash
ssh -p 2222 root@68.183.137.44 "cd /opt/auctorum-systems/repo && \
  set -a && . apps/medconcierge/.env.local && set +a && \
  sudo -E -u auctorum env HOME=/home/auctorum \
    DATABASE_URL=\$DATABASE_URL ENCRYPTION_KEY=\$ENCRYPTION_KEY \
    /usr/bin/pnpm exec tsx scripts/encrypt-existing-oauth-tokens.ts"
```

Idempotent — already-encrypted rows are skipped via the
`config.googleCalendar.oauth.encrypted` flag.

---

## 7. Healthchecks wire-up (P1-30 follow-up)

The `withHealthcheck()` wrapper is in `scripts/lib/healthcheck.ts` and
`cron-appointment-reminders` already uses it. To activate alerts:

1. Create checks at <https://healthchecks.io> (Free: 20 checks):
   - "Auctorum — Appointment Reminders" (15 min schedule, 5 min grace)
   - "Auctorum — Webhook Retries" (1 min schedule, 2 min grace)
   - "Auctorum — Calendar Pending" (5 min schedule, 5 min grace)
   - "Auctorum — Calendar Sync" (5 min schedule, 5 min grace)
   - "Auctorum — Campaigns" (10 min schedule, 5 min grace)
   - "Auctorum — Weekly Report" (weekly schedule, 1 day grace)
   - "Auctorum — Data Integrity" (daily, 1 day grace)
   - "Auctorum — Data Deletion" (daily, 1 day grace)
   - "Auctorum — Follow-ups" (15 min schedule, 5 min grace)
   - "Auctorum — DLQ Monitor" (15 min schedule, 5 min grace)
2. Copy each UUID URL into VPS `.env.local`:
   ```
   HEALTHCHECK_APPOINTMENT_REMINDERS_URL=https://hc-ping.com/<uuid-1>
   HEALTHCHECK_WEBHOOK_RETRIES_URL=https://hc-ping.com/<uuid-2>
   ...
   ```
3. Wrap each remaining cron with `withHealthcheck('<NAME>', main)` —
   pattern is in `scripts/cron-appointment-reminders.ts`.
4. Add Slack/email integration in healthchecks.io for paging.

---

## 8. NOM-004 verification page UI (P2-1 follow-up)

The verify ENDPOINT exists at `/api/verify?hash=...`. Add a friendly
human-readable page at `/verificar` so the QR/URL on printed PDFs
lands somewhere nice:

```tsx
// apps/medconcierge/src/app/(legal)/verificar/page.tsx
// 'use client' component that reads ?hash= from the URL, calls
// /api/verify, and renders "Firmado por Dr. X, cédula NNN, el FECHA,
// clínica Y" or a "no encontrado" message.
```

15-min task; deferred since the public API endpoint is functional and
sufficient for machine verification.

---

## Cost / time recap

| Item | Cost | Time |
|---|---|---|
| HSTS preload submit | $0 | 5 min |
| CSP nonce refactor | $0 | 2–3 days (deferred) |
| DO encryption verify | $0 | 5 min |
| k6 install + first run | $0 | 30 min |
| Bundle analyzer first audit | $0 | 1 hour |
| OAuth token backfill | $0 | 1 command |
| Healthchecks wire-up | $0 (free tier) | 1 hour |
| Verify UI page | $0 | 15 min |
| **Total this week** | **$0** | **3-4 hours owner time** |
