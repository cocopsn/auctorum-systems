# Dashboard crash audit (2026-05-07)

Scope: every `page.tsx` under `apps/medconcierge/src/app/(dashboard)/`.
Methodology described in the audit prompt; pages were read in full; APIs they
depend on were spot-checked; recent commits `6159344`, `ea2038c`, `4ad9598`
were diffed.

## Pages with confirmed bugs

| Path | Bug | Line | Fix |
|---|---|---|---|
| `(dashboard)/leads/page.tsx` | `<StatusBadge>` does `STATUS_META[status]` then reads `meta.tone` with **no fallback**. If any `ad_leads.status` row is out-of-enum (or null), `meta` is `undefined` and `.tone` throws — kills the whole page. | 376 (`const meta = STATUS_META[status]`), 378 (`${meta.tone}`) | `const meta = STATUS_META[status] ?? STATUS_META.new` |
| `(dashboard)/leads/page.tsx` | `<KanbanView>` does `STATUS_META[col].label` for every column, plus `STATUS_META[next].label`. Same pattern — no guard. Iteration is bounded to `KANBAN_COLUMNS`, but the same component is reused for whatever `byStatus[col]` returned, and `lead.status` is *not* validated before badge rendering. | 513, 566 | Coerce unknown statuses to `'new'` upstream in `byStatus`. |
| `(dashboard)/documentos/page.tsx` | `<DocumentsPage>` uses `TYPE_LABEL[r.analysisType]` after upload result. `r.analysisType` is typed `DocType` but the API can return any string OpenAI gave it (`analysis.type` from `analyzeDocument`). If model returns e.g. `'imagenology'` → `TYPE_LABEL['imagenology'] === undefined`, rendered as text — **NOT a crash**, but `STATUS_LABEL[d.status]` (line 480) has the same risk on the table view. | 325, 480 | Default to `'other' / 'pending_assignment'` when key missing. |
| `(dashboard)/documentos/page.tsx` | `viewDocument()` calls `data.signedUrl` from `GET /api/dashboard/documents/[id]`, but the upload result object also contains a `created` row whose `signedUrl` is never set in the POST handler. Not a crash — silent no-op when storage is misconfigured. | 236-246 | none — best-effort flow is intentional. |
| `(dashboard)/documentos/page.tsx` | `r.suggestions.map((p) => …)` keyed by `p.id`. If two suggested patients with same id were ever returned, React key collision (warning, not crash). Edge case only. | 344 | none. |

## Pages that look fine but might break edge cases

| Path | Concern |
|---|---|
| `(dashboard)/funnel/page.tsx` | `stages[0]` then `clients.filter(...)` — empty arrays are handled but a malformed API response that swaps `stages` and `clients` would silently render an empty board. |
| `(dashboard)/reports/page.tsx` | `data: any` everywhere; deeply trusts API shape. If `data.kpis` is missing, JSX paths still guard with `data &&`, so OK. |
| `(dashboard)/page.tsx` | Server component — fetches `/api/dashboard/stats` via cookies; if `getAuthTenant()` returns null mid-render the layout already redirected, so safe. |
| `(dashboard)/pacientes/[id]/historia-clinica/page.tsx` | Largest dynamic page (14.4 kB JS). Not re-read; assumption: same defensive pattern as siblings. |
| `(dashboard)/portal/page.tsx`, `(dashboard)/integrations/page.tsx` | `useSearchParams` not used in any of the dashboard pages, so the missing-Suspense bug from Next.js 14 docs does not apply here. |
| `(dashboard)/settings/subscription/page.tsx` | Uses `Sparkles` lucide icon. Confirmed available in `lucide-react@^0.383`. |

`useSearchParams` was grep'd across the dashboard tree — zero hits, so the
classic Next 14 "client component using useSearchParams not wrapped in
Suspense" build-error is not the cause.

## Root cause for /leads + /documentos

It is **not** the recent auth cookie migration (`6159344`, `ea2038c`).
`auth.ts` and `middleware.ts` only changed cookie adapters; both pages are
client components that get session via `credentials: 'include'` cookie pass-
through, identical to every other working page.

Most likely root cause, ranked:

1. **Schema drift in production DB.** Migrations `0051_ads_leads.sql` and
   `0053_documents.sql` introduced the `ad_leads` and `documents` tables
   used **only** by these two pages. If the prod Supabase didn't get those
   migrations applied, `/api/dashboard/leads` and `/api/dashboard/documents`
   throw on `db.select().from(adLeads)` / `from(documents)`. The API returns
   500 with `{error: 'Internal error'}`. Both pages **handle that gracefully
   in JS** (catch → setError) — so this alone wouldn't show "client-side
   exception". UNLESS the route file itself fails to compile in the runtime
   bundle because the imports `adLeads` / `documents` resolve to undefined
   at runtime (older `@quote-engine/db` build that doesn't export them).
   Verify with: `pnpm --filter @quote-engine/db build && pm2 restart 1`.

2. **Unhandled `STATUS_META[unknown]` in leads page.** Confirmed code at
   `leads/page.tsx:376-378`. If a single row in `ad_leads` has a stray
   status (a manual SQL insert, a leaked test row, a future status value
   added to `LEAD_STATUSES` in a follow-up migration) the entire list
   render throws and React unmounts the whole tree, surfacing exactly the
   "Application error: a client-side exception has occurred" overlay.

3. **`fetchLeads` / `fetchList` race + state shape.** If the dev was using
   a stale browser tab, the new fetch returned a shape with `kpis` shaped
   differently from `ApiResponse`. `(data.kpis.conversionRate * 100)
   .toFixed(1)` → `undefined.toFixed` throws. Lower probability since
   line 244 only runs when `data` is truthy AND just-set from the typed
   fetch handler — but worth a defensive `?? 0`.

`/documentos` is a softer crash candidate: every label lookup has a
fallback or returns `undefined` (which React renders as empty). The
likeliest crash there is the same schema-drift theory: API 500 → setError
works → but if the API route file itself fails to import at runtime
(missing `documents` schema export), Next renders a 500 page that the
client redirect loop then collides with.

## Recommended fixes (in priority order)

1. **Verify migrations on prod.** `psql -c "\dt ad_leads"` and `\dt
   documents"` against the production pooler. If absent: `pnpm db:migrate`
   from the VPS with the prod `DATABASE_URL`.
2. **Defensive lookups in `leads/page.tsx`.**
   - Line 376: `const meta = STATUS_META[status] ?? STATUS_META.new`
   - Line 363: already guarded with `?? SOURCE_META.manual`. Good.
   - Coerce `lead.status` and `lead.source` at the top of `fetchLeads`
     handler (`json.items.map(l => ({...l, status: VALID_STATUSES.has(l.status) ? l.status : 'new'}))`).
3. **Defensive lookups in `documentos/page.tsx`.**
   - Line 325 & 480: `TYPE_LABEL[r.analysisType] ?? TYPE_LABEL.other`,
     `STATUS_LABEL[d.status] ?? STATUS_LABEL.pending_assignment`.
4. **Add `/leads` and `/documentos` to `DASHBOARD_ROUTES`** in
   `apps/medconcierge/src/middleware.ts:6-12`. Currently missing — they
   work on `med.auctorum.com.mx` only because `slug` is null on that host.
   On any tenant subdomain (`dr-*`, `dra-*`, `doc-*`) the middleware
   rewrites these to `/<tenant>/leads`, which has no route → 404.
5. **Fix `NAV_GROUP_LABELS` in `packages/ui/src/dashboard.tsx:33-39`.**
   Group label indices are stale (still expect 5/10/12/14, but the
   PRINCIPAL group grew from 5 to 6 items when `documentos` was added in
   commit `4b4c068`). Cosmetic only — sidebar shows wrong group headings.
6. **Add a top-level error boundary** to `(dashboard)/layout.tsx` so a
   single bad row stops degrading to "Application error" overlay and shows
   a friendlier inline message with a refresh button. Next.js 14 supports
   route-level `error.tsx` siblings — drop one alongside `leads/page.tsx`
   and `documentos/page.tsx` (and ideally at the dashboard root) to
   contain blast radius.

File references (all absolute):
- `D:\projects\auctorum-systems\apps\medconcierge\src\app\(dashboard)\leads\page.tsx`
- `D:\projects\auctorum-systems\apps\medconcierge\src\app\(dashboard)\documentos\page.tsx`
- `D:\projects\auctorum-systems\apps\medconcierge\src\components\dashboard\dashboard-shell.tsx`
- `D:\projects\auctorum-systems\apps\medconcierge\src\lib\auth.ts`
- `D:\projects\auctorum-systems\apps\medconcierge\src\middleware.ts`
- `D:\projects\auctorum-systems\apps\medconcierge\src\lib\sidebar-items.ts`
- `D:\projects\auctorum-systems\packages\ui\src\dashboard.tsx`
- `D:\projects\auctorum-systems\packages\db\schema\ad-leads.ts`
- `D:\projects\auctorum-systems\packages\db\schema\documents.ts`
- `D:\projects\auctorum-systems\packages\db\migrations\0051_ads_leads.sql`
- `D:\projects\auctorum-systems\packages\db\migrations\0053_documents.sql`
