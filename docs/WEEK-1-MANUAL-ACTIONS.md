# Week-1 P0 — Manual Actions Required

## 0. Activate the CI workflow (this token can't push it)

The GitHub OAuth token used during the audit lacks `workflow` scope, so
the CI file sits at `docs/templates/github-actions-ci.yml`. Activate by
copying it into `.github/workflows/` from a local clone with a PAT that
has `workflow` scope:

```bash
mkdir -p .github/workflows
cp docs/templates/github-actions-ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions"
git push origin main
```

Or paste the file via the GitHub web UI: Add file → Create new file →
path `.github/workflows/ci.yml`. Either way, build+test runs on next push.

---


These items from the 2026-05-11 P0 audit cannot be automated from code
because they require account creation, billing decisions, or out-of-band
provider settings. Owner: Armando.

---

## 1. Supabase Pro upgrade ($25/mo) — P0-14

**Why:** Free tier gives 7-day daily backups with opaque restore. Pro
gives Point-In-Time Recovery (PITR) up to 7 days + daily backups for 14
days + DPA you can reference in your Aviso de Privacidad.

**Steps:**
1. <https://supabase.com/dashboard/project/tewvtgvvxcvkijqeeoky/settings/billing>
2. Click "Upgrade subscription" → "Pro plan" ($25/mo).
3. Under Database → Backups: enable "Point in Time Recovery".
4. Under Database → Connection pooling: bump pool size to 60+ (default
   is 30 on Pro). Our app uses `max=4` per process × 14 procs = 56.

**Verify:** Backups tab shows "PITR enabled" + a green checkmark.

---

## 2. Sentry account + DSN — P0-12

**Why:** Zero error tracking today. Cron crashed silently for 6 days
before this audit caught it. Real alerts are non-negotiable for medical
SaaS.

**Steps:**
1. <https://sentry.io/signup/> → Free Developer tier (5K events/mo).
2. Create org `auctorum`.
3. Create project `medconcierge` (platform: Next.js).
4. Copy the DSN (looks like `https://abc...@o123...ingest.us.sentry.io/456`).
5. SSH to VPS and add the DSN to env:
   ```bash
   ssh -p 2222 root@68.183.137.44
   echo 'NEXT_PUBLIC_SENTRY_DSN=<your-dsn>' >> /opt/auctorum-systems/repo/apps/medconcierge/.env.local
   echo 'SENTRY_DSN=<your-dsn>' >> /opt/auctorum-systems/repo/apps/medconcierge/.env.local
   ```
6. Locally:
   ```bash
   corepack pnpm add @sentry/nextjs --filter medconcierge
   ```
7. Uncomment the bodies in:
   - `apps/medconcierge/sentry.client.config.ts`
   - `apps/medconcierge/sentry.server.config.ts`
   - `apps/medconcierge/sentry.edge.config.ts`
8. Add `withSentryConfig(nextConfig, ...)` wrapper in `next.config.js`
   (Sentry wizard generates the boilerplate — `npx @sentry/wizard@latest -i nextjs`).
9. Commit + deploy. Trigger a test error via `/api/admin/health` with a
   bad payload — confirm event in Sentry within ~30s.

---

## 3. BetterStack / UptimeRobot — P0-13

**Why:** PM2 has restarted medconcierge 121× in 5h without ever alerting
anyone. If Nginx dies you find out when a doctor calls.

**Steps (BetterStack Free):**
1. <https://betterstack.com/uptime> → Free tier (10 monitors, 3-min interval).
2. Create monitors:
   - `https://med.auctorum.com.mx/api/health` — every 3 min
   - `https://auctorum.com.mx` — every 5 min
   - `https://portal.auctorum.com.mx` — every 5 min
   - `https://dra-martinez.auctorum.com.mx` — every 5 min
3. Configure alert channels: email + (optional) Slack/WhatsApp/SMS.
4. Status page (optional): generate a public status page for clients.

**Alternative:** UptimeRobot Free (50 monitors, 5-min) if you prefer
that flow.

---

## 4. Supabase Auth — enable email confirmation — P0-5

**Why:** Code fix (P0-5) sets `email_confirm: true` in the admin
createUser call. The Supabase project setting must also be enabled so
the verification email actually goes out.

**Steps:**
1. <https://supabase.com/dashboard/project/tewvtgvvxcvkijqeeoky/auth/providers>
2. Email Provider → "Confirm email" → ENABLED
3. (Optional) "Double confirm email changes" → ENABLED
4. Customize the confirmation email template at
   Authentication → Email Templates → "Confirm signup".

---

## 5. OpenAI Enterprise / DPA — P0-7 follow-up

**Why:** `store: false` is now set on every chat.completions call. To
go fully clean under LFPDPPP Art. 36 you also want a signed DPA with
OpenAI.

**Steps:**
1. <https://openai.com/contact-sales> — request Enterprise tier or at
   least the Business tier with a DPA.
2. Reference the use case: medical SaaS in Mexico, PHI in prompts
   (patient names + phones + clinical questions), need contractual
   safeguards for cross-border data transfer.
3. Update the Aviso de Privacidad to name OpenAI as a sub-processor
   under the DPA.

This is a 2-4 week back-and-forth with OpenAI legal; start now.

---

## 6. DigitalOcean snapshot schedule — P0 (cheap insurance)

**Steps:**
1. <https://cloud.digitalocean.com/droplets> → select `auctorum-nyc1`.
2. Snapshots tab → Enable weekly snapshots ($1.20/mo for our droplet
   size).
3. Retention: 4 snapshots (last month rolling).

---

## 7. Sub-processor DPAs (legal review)

For LFPDPPP compliance you need data-processing agreements with each
sub-processor that touches PHI:

| Provider | DPA link | Status |
|---|---|---|
| Supabase | <https://supabase.com/legal/dpa> — click-accept | Required |
| Stripe | <https://stripe.com/legal/dpa> — click-accept | Required |
| MercadoPago | Contact account manager | TODO |
| Resend | <https://resend.com/legal/dpa> — click-accept | Required |
| Cloudflare | <https://www.cloudflare.com/cloudflare-customer-dpa/> | Required |
| DigitalOcean | <https://www.digitalocean.com/legal/data-processing-agreement> | Required |
| OpenAI | Enterprise tier (see #5) | TODO |
| Meta (WABA) | <https://www.facebook.com/legal/terms/dataprocessing> | Required |
| Google (Calendar OAuth) | Google Workspace DPA | TODO |

Update `Aviso de Privacidad` (`/privacy` page) with the sub-processor
list once signed.

---

## 8. Rotate DATABASE_URL password (P2-5 from prior audit)

The Supabase DB password is in plaintext on the VPS at
`/opt/auctorum-systems/repo/apps/medconcierge/.env.local`. During this
audit it was visible in agent transcripts — consider exposed.

**Steps:**
1. <https://supabase.com/dashboard/project/tewvtgvvxcvkijqeeoky/settings/database>
2. "Reset database password" → generate strong password.
3. Update `DATABASE_URL` in both `.env.local` files on the VPS.
4. `pm2 restart all --update-env`.
5. Verify dashboard + workers still work.

---

## Cost summary (recurring monthly)

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Sentry Free | $0 (5K events/mo — bumps to $26/mo at scale) |
| BetterStack Free | $0 |
| DO weekly snapshots | $1.20 |
| DPAs / legal | $0 (click-accept) |
| **Total recurring** | **~$26/mo** |

Plus one-off:
- OpenAI Enterprise DPA: variable, talk to sales
- Legal review of privacy policy + sub-processor schedule: pay a Mexican
  privacy lawyer for ~$500 USD one-shot.
