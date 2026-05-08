# AI agent wiring audit

Audit date: 2026-05-06. Read-only.

## Chain trace (medconcierge WhatsApp bot)

- UI editor: `apps/medconcierge/src/app/(dashboard)/ai-settings/page.tsx:283-299`
  — textarea bound to `prompt` state, saves via `PUT /api/dashboard/ai/config`
  with body `{ systemPrompt }`.
- API save: `apps/medconcierge/src/app/api/dashboard/ai/config/route.ts:33-49`
  — calls `saveAiSettings(auth.tenant, parsed.data)`.
- DB writer: `packages/ai/index.ts:106-115` (`saveAiSettings`) — merges into
  `tenants.config.ai.systemPrompt` (jsonb column `tenants.config`, key `ai.systemPrompt`).
- DB column: `tenants.config` jsonb, sub-path `ai.systemPrompt`
  (schema in `packages/db/schema/tenants.ts:137-147`, type `TenantConfig.ai.systemPrompt`).
- Worker reader: `scripts/worker.ts:201` (`getAiSettings(tenant)`) →
  `packages/ai/index.ts:101-104` reads `tenant.config.ai`.
- Worker injection: `scripts/worker.ts:400-404` passes
  `customInstructions: (settings.systemPrompt ?? '') + contextInjection + multiDoctorPrompt`
  into `buildTenantSystemPrompt(...)`.
- Prompt builder: `packages/ai/prompts.ts:240-257` substitutes
  `{{customInstructions}}` (and `{{businessName}}`, `{{businessInfo}}`,
  `{{ragContext}}`) into the medical or industrial template.
- OpenAI call: `scripts/worker.ts:446-454` →
  `packages/ai/run-with-tools.ts:41-79` posts to `/chat/completions` with
  `messages[0] = { role: 'system', content: systemPrompt }`.

Match: PASS (with caveats — see Bugs).

The doctor's edited text DOES reach the OpenAI call, but it is appended
**at the very bottom** of the medical template as `{{customInstructions}}`,
after ~150 lines of hard-coded medical guardrails. The doctor cannot replace
or override the framing — only add to it.

## Specialty template flow

- UI: `apps/medconcierge/.../ai-settings/page.tsx:172-189` (select),
  confirmation modal at `:192-270`.
- API: `POST /api/dashboard/ai/apply-template` →
  `apps/medconcierge/src/app/api/dashboard/ai/apply-template/route.ts`.
- Behavior (`apply-template/route.ts:60-68`): writes
  `template.systemPrompt` into `tenants.config.ai.systemPrompt` ONLY if
  `overwrite === true` OR existing prompt is empty. Default ("Rellenar campos
  vacíos") is non-destructive. "Sobrescribir todo" overwrites blindly.
- Templates ship from `packages/ai/specialty-templates.ts` (selected via
  `getSpecialtyTemplate(specialtyId)`).
- Also writes `bot_messages`, `medical.specialty`,
  `medical.consultation_duration_min`, optionally services + schedule.
  Tracks provenance under `config.applied_specialty_template`.

Match: PASS. Behaviour is correct and the warn/merge/overwrite UX is honest.

## FAQ flow

- DB schema: `packages/db/schema/bot-faqs.ts` — table `bot_faqs` (per-tenant
  question/answer/priority/active).
- Web editor API: `apps/web/app/api/bot/faqs/route.ts` (B2B side only).
- **The medconcierge bot does NOT read `bot_faqs`.**
  `Grep botFaqs|bot_faqs` against `scripts/worker.ts` and `packages/ai/`
  returns zero matches. The only read of FAQ-shaped data is via the legacy
  `tenants.bot_config.faqs` UI in
  `apps/medconcierge/src/app/(dashboard)/settings/bot/page.tsx`, but
  `bot_config` is also never read by the worker or AI package (only
  `prompts.ts:212` peeks at `bot_config.schedule` for business-info
  formatting — FAQs are ignored).
- The worker's "knowledge" path is RAG via `searchKnowledgeBase` against the
  `knowledge_base` (pgvector) table — that is the ONLY way curated answers
  reach the prompt. FAQs typed in the dashboard never become tools, never
  become prompt context, never become RAG entries.

## Test coverage

- Existing prompt tests: `tests/ai/hallucination-guard.test.ts` (static
  regex over `SPECIALTY_TEMPLATES`) and `tests/unit/specialty-templates.test.ts`.
- Both are static — they validate the **shipped** template strings, not the
  write-then-read cycle.
- No integration test exercises: UI save → DB row → `getAiSettings` →
  `buildTenantSystemPrompt` → first system message of `runWhatsAppReplyWithTools`.
- No test verifies `apply-template` actually mutates `tenants.config.ai.systemPrompt`.
- No test verifies that an edited prompt actually appears in the
  OpenAI request body.

Recommended: one DB-backed integration test that calls `saveAiSettings`
with a sentinel string, then re-fetches the tenant, calls
`buildTenantSystemPrompt`, and asserts the sentinel appears in the output.

## Bugs found

1. **FAQ editor is dead UI in medconcierge.** The doctor can edit FAQs
   in `(dashboard)/settings/bot` (writes `tenants.bot_config.faqs` via
   `apps/medconcierge/.../api/dashboard/settings/bot/route.ts:40-42`), but
   the worker never reads `bot_config.faqs`. Doctor expects the bot to
   answer "¿cuánto cuesta?" from FAQ — bot only sees RAG + system prompt.
   Fix: either delete the FAQ section, or surface FAQs into the prompt or
   as a `lookup_faq` tool.
2. **Two parallel AI-settings APIs exist.** `/api/dashboard/ai/config`
   (the one the new UI uses) and `/api/ai/settings` (older, looser
   validation, defaults `gpt-5-mini`). Both write the same DB field, but
   the older route lacks the zod allowlist and CSRF check. Risk: stale
   client code or external scripts hitting the older route.
3. **Doctor's prompt is appended, not authoritative.** `customInstructions`
   lands at the tail of the medical template
   (`packages/ai/prompts.ts:165`). The 150-line clinical/anti-hallucination
   framing always wins. This is by design but should be documented in the
   UI — currently the textarea is labelled "System Prompt" which implies
   full control.
4. **`getAiSettings` reads from a stale `tenant` object.** The worker
   loads the tenant once at `:185`/`:192-198` and keeps it for the whole
   message handling. If the doctor saves a new prompt mid-conversation,
   the next message picks it up only because each webhook event re-fetches
   the tenant. Confirmed safe — no caching layer between API write and
   worker read. Worth a one-line comment.

## Recommendations

- Add the integration test described above.
- Either wire `bot_faqs` into the prompt builder (top-N active FAQs as a
  `===== FAQ =====` block before `{{customInstructions}}`) or remove the
  FAQ UI from medconcierge.
- Deprecate `apps/medconcierge/src/app/api/ai/settings/route.ts` and route
  any remaining callers to `/api/dashboard/ai/config`.
- Relabel the textarea to "Instrucciones adicionales" and show the
  built-in medical framing read-only above it, so doctors understand they
  are appending, not replacing.
- Consolidate the duplicated `getAiSettings`/`saveAiSettings` between
  `packages/ai/index.ts` and `packages/ai/src/settings.ts` (already flagged
  in the L-7 NOTE at top of `index.ts`).
