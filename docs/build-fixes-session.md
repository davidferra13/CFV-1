# Build Fixes Session

**Branch:** fix/grade-improvements
**Status:** Build passing — 341 pages generated, BUILD_EXIT: 0

---

## What Was Fixed

This session resolved a cascade of TypeScript and build errors that emerged after the grade-improvements feature branch accumulated significant new code across multiple builds. The root causes were: missing pages manifest entry, type annotation gaps, incorrect import names, and a large server action file that Next.js couldn't reliably resolve.

---

## Errors Fixed

### 1. `pages/500.tsx` Missing — Root Cause of `pages-manifest.json` ENOENT

Next.js 14 hybrid builds (App Router + Pages Router) require `pages/500.tsx` to exist even when the app primarily uses the App Router. Without it, the "Collecting page data" step crashes and the build fails. Restored from git commit `95fa718` which originally added it.

### 2. Implicit `any` Types in Tax Estimate Actions

**File:** `lib/finance/tax-estimate-actions.ts`
Five `reduce()` callbacks had no type annotations on their accumulator/item parameters. Added explicit `(s: number, q: QuarterlyEstimate)` annotations to all five.

### 3. `z.record()` Required 2 Arguments

**File:** `lib/proposals/template-actions.ts`
`z.record(z.unknown())` only works in older Zod versions. Newer Zod requires the key type as first arg: `z.record(z.string(), z.unknown())`.

### 4. Duplicate `ProposalTemplate` Type

**File:** `components/proposals/visual-builder.tsx`
Had both an import of `ProposalTemplate` from `@/lib/proposals/template-actions` AND a local `export type ProposalTemplate = { ... }` definition. Removed the redundant local definition.

### 5. Analytics Components Not Found (4 files)

**Files created:**
- `components/analytics/benchmark-dashboard.tsx` — recharts ComposedChart showing KPI vs. industry benchmarks; props: `{ current: KPISnapshot, history: HistoryPoint[] }`
- `components/analytics/client-ltv-chart.tsx` — recharts Bar chart of top 15 clients by lifetime value; props: `{ clients: ClientLTV[] }`
- `components/analytics/demand-heatmap.tsx` — seasonal demand heatmap grid; props: `{ data: SeasonalHeatmap }`
- `components/analytics/pipeline-forecast.tsx` — horizontal bar chart of pipeline stages; props: `{ pipeline: PipelineStage[] }`

**Page-level wiring:**
- `app/(chef)/analytics/benchmarks/page.tsx` — splits `getBenchmarkHistory()` result into `current` (last item) and `history` (all with `date` mapped from `snapshotDate`)
- `app/(chef)/analytics/demand/page.tsx` — passes `SeasonalHeatmap` directly to `DemandHeatmap` (no mapping needed)
- `app/(chef)/analytics/pipeline/page.tsx` — maps `PipelineRevenueForecast.stages` to `{ status, count, totalCents, weightedCents }[]`

### 6. Wrong Import Names in Course Fire Button

**File:** `components/operations/course-fire-button.tsx`
Was importing `markServed` and `markPlated` — actual exports are `markCourseServed` and `markCoursePlated`. Updated ACTION_MAP accordingly.

### 7. Wrong Import Names in Portfolio Highlight Editor

**File:** `components/portfolio/highlight-editor.tsx`
Was importing `addHighlight` → actual export is `createHighlight`; `removeHighlight` → `deleteHighlight`. Also removed unused `reorderHighlights` import. Updated all usages.

### 8. `stripe_transfers` Not in Generated Types

**File:** `app/api/webhooks/stripe/route.ts`
The `stripe_transfers` table was added via migration but `types/database.ts` was not regenerated. Bypass: assigned `const db = supabase as any` then called `db.from('stripe_transfers')` to skip type checking for this table.

### 9. `bulkUpdateIngredientPrices` Not Resolvable from Large Server Action File

**Issue:** `lib/recipes/actions.ts` is 1,100+ lines. Next.js sometimes fails to tree-shake specific exports from large `'use server'` files when imported by client components.
**Fix:** Extracted `bulkUpdateIngredientPrices` into a small dedicated file: `lib/recipes/bulk-price-actions.ts`. Updated the import in `components/events/grocery-quote-panel.tsx`.

### 10. `.next` Cache Corruption on Windows

Stale `.next` directory caused recurring ENOENT errors even after fixing source files. On Windows, `rm -rf .next` fails due to file locking (EPERM). Fixed with PowerShell: `Remove-Item -Path '.next' -Recurse -Force`, which fully clears the locked directory.

---

## Files Created

| File | Purpose |
|---|---|
| `components/analytics/benchmark-dashboard.tsx` | KPI benchmark comparison chart |
| `components/analytics/client-ltv-chart.tsx` | Client lifetime value bar chart |
| `components/analytics/demand-heatmap.tsx` | Seasonal demand grid chart |
| `components/analytics/pipeline-forecast.tsx` | Pipeline stage revenue chart |
| `lib/recipes/bulk-price-actions.ts` | Extracted server action for bulk ingredient price updates |

---

## Key Lessons

1. **Next.js hybrid builds need `pages/500.tsx`** — even App Router projects must have this file or the build crashes at page data collection.
2. **Large `'use server'` files can cause import resolution failures** — extract frequently-imported functions to small dedicated files.
3. **Windows `.next` cleanup requires PowerShell** — `rm -rf` is unreliable with locked Next.js build artifacts; use `Remove-Item -Recurse -Force`.
4. **Check actual export names against source** — `markCourseServed` vs `markServed`, `createHighlight` vs `addHighlight` — always verify before importing.
