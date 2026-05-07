# Incomplete features audit

Snapshot of half-finished and duplicated UI in `apps/medconcierge`. No edits made.

## Builders / Canvas editors

### Portal del Doctor builder
- **Path**: `apps/medconcierge/src/app/(dashboard)/portal/page.tsx`
- **Status**: PARTIALLY scaffolded — top-level mechanics work, but item editors for half the section types are missing.
- **What works**:
  - Drag & drop reorder (lines 102-145, persists via `PUT /api/dashboard/portal/sections/reorder`).
  - Add / delete / toggle visibility for sections (`POST/DELETE /api/dashboard/portal/sections[/:id]`).
  - Hero, About, Contact, CTA, Gallery editors are fully wired (text fields + image upload via `/api/dashboard/portal/upload`).
  - Global config tab: colors, font, SEO. `PUT /api/dashboard/portal` persists.
  - Public renderer at `apps/medconcierge/src/components/portal/portal-public-sections.tsx` consumes all section types correctly.
- **What doesn't**:
  - **Services editor** (line 349-355): only shows "Servicios: N configurados" — there is NO UI to add/edit/remove individual service items, despite `portal-public-sections.tsx` ServicesSection (line 119) rendering `data.items[]` with name/description/price/icon. New `services` sections are seeded with default items by the API but the dashboard cannot edit them.
  - **FAQ editor** (line 379-384): same — only count shown, no item add/edit.
  - **Testimonials editor** (line 385-390): only count shown.
  - **Team editor** (line 391-396): only count shown.
  - **No live preview** — the user cannot see what the public site will look like without leaving the dashboard. The dashboard is split-pane (list + form) but no iframe preview.
  - "custom" section type is in the API zod schema but no editor branch and no public renderer case.

This is the "shopify builder" the user mentioned. Skeleton is real; four of nine section types are dead from the dashboard side.

## Duplicate instruction sections

Two completely separate UIs both edit "the bot" but write to different DB columns. Worker only consumes the AI-Concierge data.

- **Section A — AI Concierge**
  - Path: `apps/medconcierge/src/app/(dashboard)/ai-settings/page.tsx`
  - Sidebar entry: `ai-settings` (group MÉDICO) in `src/lib/sidebar-items.ts:52`
  - GET/PUT: `/api/dashboard/ai/config` -> `getAiSettings/saveAiSettings` (`@quote-engine/ai`)
  - Edits: `systemPrompt`, `model`, `temperature`, `maxTokens`, `enabled`, plus a Playground tab and stats tab.
  - Specialty template applier `POST /api/dashboard/ai/apply-template` (writes into `tenant.config.bot_messages` / specialty / services / schedule).

- **Section B — Bot IA**
  - Path: `apps/medconcierge/src/app/(dashboard)/settings/bot/page.tsx`
  - Settings-tab entry: `src/app/(dashboard)/settings/layout.tsx:10`
  - GET/PATCH: `/api/dashboard/settings/bot` -> writes `tenants.bot_config` JSONB.
  - Edits: tone, bot_name, bot_personality, brand_color, weekly schedule, out_of_hours_message, FAQs.

- **Section C — Mensajes del Bot** (related — same problem)
  - Path: `apps/medconcierge/src/app/(dashboard)/settings/messages/page.tsx`
  - Settings-tab entry: `src/app/(dashboard)/settings/layout.tsx:9`
  - GET/PATCH: `/api/dashboard/settings/messages` -> writes `tenants.bot_messages` JSONB column.
  - Edits: welcome / out_of_catalog / out_of_stock / order_confirmed / appointment_confirmed / appointment_reminder / recall.

### Overlap and dead writes

- **A and B both claim to "configure the bot"** but persist to different storage:
  - A writes to `aiSettings` (consumed by `scripts/worker.ts:400-448`).
  - B writes to `tenants.bot_config`. **Nothing in `packages/ai`, `scripts/worker.ts`, or `scripts/campaign-worker.ts` reads `bot_config`**. It is a write-only sink.
- **C writes to `tenants.bot_messages` (top-level column).** `packages/ai/fallback.ts:181` only reads `tpl?.botMessages?.welcome` (the specialty template), never `tenant.botMessages`. Apply-template writes go into `tenant.config.bot_messages` — a different path. So three different storage locations exist for "bot messages" and the user-edited one is orphaned.
- **FAQs** edited in B (`bot_config.faqs`) are not consumed anywhere — `fallback.ts:155` only looks at `tpl?.faqs` (template).

### Recommendation
- Make A canonical (it's the one the worker actually reads).
- Move B's tone/bot_name/bot_personality/brand_color into A under a "Identidad" sub-tab, or merge into A's `systemPrompt` builder.
- Move B's schedule into the existing `/horarios` page (already the canonical one).
- Move B's FAQ list into A and have the worker actually inject them into the system prompt.
- Wire C to write `tenant.config.bot_messages` (the path templates already use) OR remove C and lean on apply-template.
- Drop the `/settings/bot` and `/settings/messages` tabs once the data is migrated, so there is one place to configure the bot.

## Placeholder UI

No `Próximamente` / `Coming soon` / `Disponible pronto` strings remain anywhere in `apps/medconcierge` or `apps/web`. No `TODO/FIXME/XXX/HACK` markers. Cleanup from the prior pass is intact.

| File:line | Text | Recommendation |
|-----------|------|----------------|
| `apps/medconcierge/src/app/(dashboard)/portal/page.tsx:353` | `Servicios: {N} configurados` | Add per-item editor (name/desc/price/icon) |
| `apps/medconcierge/src/app/(dashboard)/portal/page.tsx:382` | `Preguntas: {N} configuradas` | Add per-item editor (q/a) |
| `apps/medconcierge/src/app/(dashboard)/portal/page.tsx:388` | `Testimonios: {N}` | Add per-item editor (name/text/rating) |
| `apps/medconcierge/src/app/(dashboard)/portal/page.tsx:394` | `Miembros: {N}` | Add per-item editor (name/role/photo) |

## Forms-to-nowhere

None found. Every `<form onSubmit>` and primary action handler in `apps/medconcierge/src/app/**` either calls a real fetch endpoint or a known router action. No empty `try/catch`-and-discard handlers, no `console.log`-only onClick.

The closest issue is the `/settings/bot` save handler (line 75-90) — it persists fine, but the data is never read downstream. The form submits to a black hole in terms of effect, even though the HTTP call succeeds.

## AI Concierge audit

- **System prompt editor**
  - UI path: `apps/medconcierge/src/app/(dashboard)/ai-settings/page.tsx` PromptTab (line 94-302)
  - GET: `/api/dashboard/ai/config` -> reads `aiSettings.systemPrompt`
  - PUT: `/api/dashboard/ai/config` -> `saveAiSettings({ systemPrompt })`
  - Persists end-to-end: YES
  - Consumed by worker: YES (`scripts/worker.ts:400` builds the runtime prompt from `settings.systemPrompt`)

- **FAQ editor**
  - UI path: `apps/medconcierge/src/app/(dashboard)/settings/bot/page.tsx` (FAQ block, line 248-303)
  - GET/PATCH: `/api/dashboard/settings/bot` -> `tenants.bot_config.faqs`
  - Persists end-to-end: YES
  - Consumed by worker: NO. Worker fallback only reads `tpl?.faqs` (specialty template) at `packages/ai/fallback.ts:155`. User-defined FAQs are inert.

- **Specialty template selector**
  - UI path: `apps/medconcierge/src/app/(dashboard)/ai-settings/page.tsx` PromptTab template picker (line 162-189) + confirmation modal (192-270)
  - POST: `/api/dashboard/ai/apply-template` -> writes `systemPrompt`, `tenant.config.bot_messages`, specialty, suggested services, schedule. Honours `apply` flags and `overwrite` flag.
  - Applies correctly: YES end-to-end (refetches config after success and updates the textarea via `onTemplateApplied`).
  - Caveat: writes `bot_messages` to `tenant.config.bot_messages`, while the `/settings/messages` page reads `tenants.bot_messages` (different column). After applying a template, the Mensajes del Bot tab does NOT show the new template messages — this is the same column-mismatch bug as above.

- **Playground**: `/api/dashboard/ai/test` exists, sends to OpenAI with current settings, no WhatsApp side-effects. Working.
- **Stats**: `/api/dashboard/ai/stats` exists, returns 30-day totalMessages/totalTokens/cost/latency. Working.

## Summary of action items

1. **Portal builder** — add item editors for services, FAQ, testimonials, team. Add iframe preview pane. Decide whether to keep the unused `custom` section type.
2. **Bot configuration unification** — collapse `/settings/bot`, `/settings/messages` and `/ai-settings` into one canonical surface. The worker only reads `aiSettings` + specialty templates today; everything else is orphaned writes.
3. **Storage column rationalisation** — pick ONE of `tenants.bot_messages` or `tenants.config.bot_messages` and migrate. Currently apply-template uses one and the dashboard messages page uses the other.
4. **Wire user-defined FAQ into the runtime prompt** — `packages/ai/prompts.ts` `buildTenantSystemPrompt` should pull from `bot_config.faqs` if present, or move FAQ editing under AI Concierge entirely.
