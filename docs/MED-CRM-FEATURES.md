# Medical CRM Features

Five medical-CRM features adapted from the insurance CRM playbook. Each one
is functional, not decorative — they directly cover the operational gaps the
doctor felt while running the clinic on Auctorum.

```
1. Help bot          — in-product assistant, lives bottom-right of the dashboard
2. Weekly report     — Monday 8am WhatsApp KPI digest per tenant
3. Instagram inbox   — DMs from IG land in the same Conversaciones inbox as WA  [Auctorum+]
4. Smart documents   — drag-drop PDF/image uploads, AI extracts type + patient  [Auctorum+]
5. Comms timeline    — every email/WA/call/note per patient on a single feed
```

Features marcadas `[Auctorum+]` están gated server-side por plan tier — los
tenants en plan `basico` reciben 402 + `code:'PLAN_LIMIT'` cuando intentan
usarlas y el frontend dispara `<UpgradePrompt>` con copy en español. Ver
`apps/medconcierge/src/lib/plan-gating.ts` para la matriz completa y
`docs/ARCHITECTURE.md` sección "Plan gating y roles" para el contrato.

---

## 1. Help bot

**Files**
- `apps/medconcierge/src/components/help-bot.tsx` — floating button + chat
- `apps/medconcierge/src/lib/help-bot-prompt.ts` — system prompt (editable copy)
- `apps/medconcierge/src/app/api/dashboard/help-bot/route.ts` — POST endpoint

**How it works**
- Mounted in `DashboardShell`, visible on every dashboard page (hidden in
  print mode via `print:hidden`).
- Stateless on the server — the client sends the last 6 messages of history
  per request. Closing the panel wipes the thread; reload = fresh chat.
- Uses `gpt-4o-mini` directly via REST (same fetch pattern as
  `packages/ai/index.ts`). No new dependency.
- Rate-limited: 30 messages per tenant per 5 minutes (Redis INCR/EXPIRE).
- Fail-soft: if `OPENAI_API_KEY` is missing or OpenAI is down, replies with
  a maintenance message; never throws.

**Customizing the prompt**
Edit `help-bot-prompt.ts`. The prompt is product-scoped (no clinical
advice). Include any new feature in the "ESTRUCTURA DEL PRODUCTO" or
"CÓMO HACER LO MÁS PEDIDO" sections so the bot knows about it.

**Verification**
```bash
curl -i https://med.auctorum.com.mx/api/dashboard/help-bot
# 401 (correct — auth required)
```

---

## 2. Weekly KPI report (WhatsApp)

**Files**
- `scripts/cron-weekly-report.ts` — the cron job
- `ecosystem.config.js` — PM2 entry, schedule `0 8 * * 1` America/Monterrey

**Per-tenant gating** (skip rules in order):
1. `provisioning_status != 'active'` or `is_active = false` or `deleted_at IS NOT NULL` → skip
2. `tenant.config.notifications.weekly_report_enabled === false` → opted out
3. No phone in `tenant.config.contact.{whatsapp,phone}` → skip silently
4. Zero activity (citas + new patients + revenue all 0) → skip (no spammy "0/0/0")

**Message shape**
```
📊 Reporte semanal — <tenant name>
Semana 28 abr – 04 may

📅 Citas: 18 (✓ 14 completadas · ✕ 3 canceladas · ⚠ 1 no-show)
👥 Pacientes nuevos: 4
💵 Ingresos cobrados: $32,500
📈 Tasa de asistencia: 78%

Detalle: https://med.auctorum.com.mx/reportes

— Auctorum Med
```

**Manual run for testing**
```bash
ssh -p 2222 auctorum@<vps-ip>
cd /opt/auctorum-systems/repo
npx tsx scripts/cron-weekly-report.ts
```
Output is structured JSON written to stdout (and PM2 captures it to
`/var/log/auctorum/cron-weekly-report-out.log`).

---

## 3. Instagram DM inbox

**Files**
- `packages/db/migrations/0052_conversations_external_id.sql` — adds
  `conversations.external_id` column + UNIQUE index `(tenant_id, channel,
  external_id)` for idempotent webhook upserts. Same migration creates the
  expression index `integrations_instagram_dm_page_idx`.
- `apps/medconcierge/src/lib/instagram.ts` — `sendInstagramMessage`,
  `fetchIgProfile`
- `apps/medconcierge/src/app/api/webhooks/instagram/route.ts` — leadgen-style
  webhook (HMAC-verified)
- `apps/medconcierge/src/app/(dashboard)/settings/instagram/page.tsx` —
  connect / disconnect UI
- `apps/medconcierge/src/app/api/dashboard/settings/instagram/route.ts` —
  GET/PUT/DELETE for the integration row
- `apps/medconcierge/src/app/(dashboard)/conversaciones/page.tsx` — adds
  channel filter (Todos / WhatsApp / Instagram) + `<ChannelBadge>` icon
- `apps/medconcierge/src/app/api/dashboard/conversations/[id]/messages/route.ts`
  — sends outbound through IG when the conversation channel is `'instagram'`

**Setup**
1. **Meta App** → Webhooks → Subscribe to `instagram` object's `messages` field:
   - Callback URL: `https://med.auctorum.com.mx/api/webhooks/instagram`
   - Verify token: same `META_LEADS_VERIFY_TOKEN` used for Lead Ads.
2. **Dashboard** → Settings → Instagram → enter:
   - Page ID (the Facebook Page that owns the IG Business account)
   - Page Name (label only)
   - Instagram Business Account ID (optional — informativo)
   - Page Access Token (long-lived, with scopes `instagram_basic`,
     `instagram_manage_messages`, `pages_messaging`, `pages_show_list`)
3. The doctor's IG account must be Business or Creator and **linked to the
   Page** in the Facebook Page settings.

**Limitations (MVP)**
- AI auto-reply is NOT wired for IG yet. The worker today only handles WA;
  widening the BullMQ payload + worker dispatch is a focused follow-up
  before we'd ever expose an "auto-reply with bot" toggle.
- Outbound DMs only work inside Meta's 24-hour messaging window (Meta
  policy — same as WhatsApp's session window).

---

## 4. Smart document processing

**Files**
- `packages/db/migrations/0053_documents.sql` — `documents` table + RLS +
  trigger
- `packages/db/schema/documents.ts` — drizzle schema
- `apps/medconcierge/src/lib/document-storage.ts` — Supabase Storage helper.
  Bootstraps the `documents` bucket idempotently on first upload using the
  service-role key. If creation fails (e.g. RLS-locked Supabase project),
  the upload returns an error message telling the doctor to create the
  bucket in Supabase Studio.
- `apps/medconcierge/src/lib/document-analyzer.ts` — pdf-parse + gpt-4o-mini
  in JSON mode. Imports `pdf-parse/lib/pdf-parse.js` to skip the index
  module's broken bootstrap fixture.
- `apps/medconcierge/src/app/api/dashboard/documents/route.ts` — GET (list)
  + POST (multipart upload + analyze + auto-assign)
- `apps/medconcierge/src/app/api/dashboard/documents/[id]/route.ts` — GET
  (signed URL) / PATCH (reassign / archive) / DELETE
- `apps/medconcierge/src/app/(dashboard)/documentos/page.tsx` — drag-drop UI

**Flow**
```
Doctor drags PDF → POST /api/dashboard/documents
   │
   ▼
┌───────────────────────────────────────────────┐
│ ensureDocumentsBucket() — idempotent          │
│ extractPdfText(buffer)                        │
│ analyzeDocument(text)  ← gpt-4o-mini, JSON    │
│  → { type, patient_name, document_date, summary }
│ supabase.storage.upload()                     │
│ patient match: explicit > AI > none           │
│ INSERT documents (status auto: assigned/pending)
└───────────────────────────────────────────────┘
   │
   ▼
UI shows results panel:
  • If assigned → green check
  • If pending → list of suggested patients (fuzzy match by name tokens)
  • Doctor clicks one to assign inline
```

**Supported MIME types** (max 25 MB):
- `application/pdf`
- `image/{png,jpeg,webp,heic}` (no OCR yet — just storage + AI sees nothing)

**Document types** (AI vocabulary):
`lab_result | radiology | prescription | referral | insurance | other`

**Storage layout**:
```
documents/<tenant_id>/<doc_id>-<safeFileName>
```
Private bucket, signed URLs only (10-min expiry by default).

---

## 5. Patient communications timeline

**Files**
- `packages/db/migrations/0054_patient_communications.sql` — `patient_communications`
  table + RLS
- `packages/db/schema/patient-communications.ts` — drizzle schema
- `apps/medconcierge/src/lib/patient-comms.ts` — `trackPatientComm` helper.
  Best-effort fire-and-forget; never throws.
- `apps/medconcierge/src/lib/email.ts` — `sendEmail` now accepts optional
  `tenantId` + `patientId` + `createdBy`. When both are provided, the send
  auto-logs an `email_sent` entry with the Resend message id.
- `apps/medconcierge/src/components/dashboard/patient-communications-tab.tsx`
  — timeline UI rendered inside `PatientDetailClient`
- `apps/medconcierge/src/app/api/dashboard/patients/[id]/communications/route.ts`
  — GET (list) + POST (manual entry — note, call log)

**Vocabulary** (`type` column):
```
email_sent | email_received | whatsapp_sent | whatsapp_received |
sms_sent | call | note
```

**Auto-tracked entries**
- `email_sent` — on every successful `sendEmail({ to, subject, html, tenantId, patientId })`.
  Existing call sites (appointment confirmations, reminders, payment receipts)
  can be opted in by passing `tenantId + patientId` — backward compatible
  (omitting the IDs simply skips the ledger write).

**Manual entries**
The "Agregar nota / llamada" button in the tab opens a modal where the
doctor can record:
- Note — free-text observation
- Call — phone call summary
- email_received / whatsapp_received — reference to inbound that came
  through a non-Auctorum channel

**No edits, no deletes** — the table is APPEND-ONLY by convention. Mistakes
get corrected by adding a new note that references the original `occurredAt`.

---

## Migrations summary

This batch ships 3 migrations (continuing from 0051_ads_leads):

| #     | File                                      | Tables / changes                                             |
|-------|-------------------------------------------|--------------------------------------------------------------|
| 0052  | `conversations_external_id.sql`           | `conversations.external_id` + UNIQUE idx + IG page expr idx  |
| 0053  | `documents.sql`                           | `documents` table + RLS + trigger                            |
| 0054  | `patient_communications.sql`              | `patient_communications` table + RLS                         |

Run order matters (each is idempotent but reads from the previous schema).

## Env requirements

No new env vars. The features reuse:
- `META_APP_SECRET` (or `WHATSAPP_APP_SECRET` fallback) for IG webhook HMAC
- `META_LEADS_VERIFY_TOKEN` for IG webhook subscribe handshake
- `OPENAI_API_KEY` for help bot + document analyzer
- `RESEND_API_KEY` for email tracking (already required)
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for storage bucket
  bootstrap + signed URLs

## Verification (post-deploy)

```bash
# Help bot
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST https://med.auctorum.com.mx/api/dashboard/help-bot \
  -H 'Content-Type: application/json' -d '{}'   # → 401 (auth required)

# Instagram webhook
curl -i 'https://med.auctorum.com.mx/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=BAD&hub.challenge=test'
# → 403 (verify token mismatch — correct)

# Documents endpoint
curl -s -o /dev/null -w '%{http_code}\n' https://med.auctorum.com.mx/api/dashboard/documents
# → 401

# Comms timeline (any patient ID)
curl -s -o /dev/null -w '%{http_code}\n' \
  https://med.auctorum.com.mx/api/dashboard/patients/00000000-0000-0000-0000-000000000000/communications
# → 401

# Weekly report — manual run (logs to stdout)
ssh -p 2222 auctorum@<vps-ip> "cd /opt/auctorum-systems/repo && npx tsx scripts/cron-weekly-report.ts"
```
