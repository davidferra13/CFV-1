# T3.5 & T2.5 — Menu Templates + Revenue Goals Dashboard

**Date:** 2026-02-20
**Scope:** Two parallel features: (A) menu clone/template actions and (B) revenue goals finance sub-page.

---

## Part A: Menu Templates (T3.5)

### What Changed

Three new exported functions added to the **end** of `lib/menus/actions.ts`:

| Function | Purpose |
|---|---|
| `cloneMenu(menuId)` | Deep-copies a menu (via the existing `duplicateMenu` helper), then ensures `is_template = false` and `event_id = null` on the clone. Returns the new menu row. |
| `saveMenuAsTemplate(menuId)` | Sets `is_template = true` on an existing menu. Revalidates `/menus` and `/settings/templates`. |
| `listMenuTemplates()` | Queries `menus` where `is_template = true` for the chef's tenant. Wrapped in try/catch — returns `[]` on any error so pages don't crash. |

**Key design decisions:**
- `cloneMenu` delegates to `duplicateMenu` (which already copies menu → dishes → components with full tenant scoping and audit trail). This avoids duplicating ~60 lines of tested code.
- The `is_template` column already exists on the `menus` table (it's in the Zod schemas and insert payloads in the existing code).
- No migration needed — the column was already present.

### New Component

**`components/menus/clone-menu-button.tsx`** (`'use client'`)

- Renders a `variant="secondary"` button.
- Calls `cloneMenu(menuId)` and calls `router.refresh()` on success.
- Shows inline error text if the server action throws.
- Accepts a single `menuId: string` prop — drop it anywhere a menu card or detail page is rendered.

---

## Part B: Revenue Goals Dashboard (T2.5)

### What Changed

#### New Page: `app/(chef)/finance/goals/page.tsx`

A Server Component (no `'use client'`) that:

1. Calls `getRevenueGoalSnapshot()` from `lib/revenue-goals/actions` — rich snapshot including monthly/annual progress, avg booking value, open dates, and recommendations from the engine.
2. Calls `computeDashboardKPIs(yearRange())` from `lib/analytics/revenue-engine` — YTD KPI roll-up (revenue, booked value, conversion rate, etc.).
3. Calls `solveRevenueClosure(annualTargetCents, annualBookedCents, remainingDays)` — pure function that returns 4 strategy cards.

**Sections rendered:**
- Breadcrumb back to `/finance`
- "Manage Goals" link to `/goals` (the dedicated goals hub)
- **Goal Setter** — embeds the client component for updating the target in place
- **Annual Progress** — large number + `ProgressBar` + gap & remaining days
- **This Month** — monthly progress from the snapshot
- **Year-to-Date KPIs** — 6-cell grid
- **Close the Gap** — strategy cards from `solveRevenueClosure`, green-highlighted if feasible
- **Recommendations** — top 5 from the revenue-goals engine
- Timestamp footer

The `ProgressBar` colors: green ≥ 100%, brand-blue ≥ 70%, yellow ≥ 40%, red < 40%.

#### New Component: `components/finance/goal-setter.tsx` (`'use client'`)

- Dollar input (prefixed `$`) + "Set Goal" button.
- Converts input dollars → cents and calls `updateChefPreferences({ target_annual_revenue_cents: cents, revenue_goal_program_enabled: true })` from `lib/chef/actions`.
- Shows "Goal saved successfully." for 3 seconds on success.
- Shows inline error text on failure.
- Accepts `currentTargetCents: number` as initial display value.

#### Updated: `app/(chef)/finance/page.tsx`

Added a "Revenue Goals" entry to the `SECTIONS` array:

```ts
{
  href: '/finance/goals',
  label: 'Revenue Goals',
  description: 'Annual target, YTD progress, and gap-closing strategies',
  icon: '🎯',
}
```

This makes the new page reachable from the Finance hub alongside Overview, Invoices, etc.

---

## Data Flow

```
app/(chef)/finance/goals/page.tsx (Server Component)
  ├── getRevenueGoalSnapshot()        → lib/revenue-goals/actions.ts
  │     └── reads chef_preferences (target_annual_revenue_cents, target_monthly_revenue_cents)
  │     └── reads events, event_financial_summary, quotes, inquiries
  ├── computeDashboardKPIs(yearRange()) → lib/analytics/revenue-engine.ts
  │     └── reads events, ledger_entries, inquiries
  └── solveRevenueClosure(...)         → pure function in revenue-engine.ts

components/finance/goal-setter.tsx (Client Component)
  └── updateChefPreferences(...)       → lib/chef/actions.ts
        └── upserts chef_preferences.target_annual_revenue_cents

components/menus/clone-menu-button.tsx (Client Component)
  └── cloneMenu(menuId)               → lib/menus/actions.ts
        └── duplicateMenu()           → clones menu + dishes + components
        └── update is_template=false  → ensures clone is not a template
```

---

## No Database Changes

All features use existing columns (`is_template` on `menus`, `target_annual_revenue_cents` on `chef_preferences`). No migration required.

---

## Files Modified / Created

| File | Status |
|---|---|
| `lib/menus/actions.ts` | Modified — 3 new exported functions appended |
| `components/menus/clone-menu-button.tsx` | Created |
| `app/(chef)/finance/goals/page.tsx` | Created |
| `components/finance/goal-setter.tsx` | Created |
| `app/(chef)/finance/page.tsx` | Modified — Revenue Goals added to SECTIONS |
