# Chef Goals System

## What Was Built and Why

ChefFlow previously had a basic revenue goal tracker — a single monthly/annual target stored as flat columns in `chef_preferences`, computed on demand, with no history and no actionable client-level recommendations.

This implementation upgrades that into a full multi-goal system that:

1. **Tracks multiple goal types** beyond revenue: booking count, new clients, recipe library size, profit margin, and expense ratio targets
2. **Computes exactly what the chef needs to do** to close any gap: dinners needed, pricing scenarios showing how price changes affect the number of events required
3. **Recommends specific clients to reach out to** — dormant or repeat-ready clients ranked by lifetime value with human-readable reasons ("Dormant 45 days — avg $1,200 booking")
4. **Persists monthly snapshot history** so chefs can see their progress trend over time
5. **Provides a 4-step setup wizard** so any chef can create meaningful goals in under 2 minutes

---

## Architecture

### New Database Tables (migration `20260226000019_chef_goals_system.sql`)

All additive — no existing tables or columns were changed.

| Table                     | Purpose                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `chef_goals`              | One row per goal definition. A chef can have multiple active goals.                                           |
| `goal_snapshots`          | Append-only history. One row per (goal, date). `UNIQUE(goal_id, snapshot_date)` ensures idempotent cron runs. |
| `goal_client_suggestions` | Tracks which dormant/repeat-ready clients were surfaced for outreach and whether the chef acted on them.      |

**`chef_goals.target_value` semantics by goal type:**

- `revenue_*` → cents (1000000 = $10,000)
- `booking_count | new_clients | recipe_library` → whole count
- `profit_margin | expense_ratio` → basis points (6500 = 65.00%)

### Library Layer (`lib/goals/`)

| File                      | Role                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                | All TypeScript types. No imports from Supabase or server modules.                                                                                                                                          |
| `engine.ts`               | Pure computation functions: `computeGoalProgress`, `buildPricingScenarios`, `formatGoalValue`. Imports and re-exports `computeDinnersNeeded` and `applyPipelineWeight` from `lib/revenue-goals/engine.ts`. |
| `signal-fetchers.ts`      | DB reads for non-revenue goal current values: booking count, new clients, recipe count, profit margin, expense ratio.                                                                                      |
| `client-suggestions.ts`   | Queries `client_financial_summary` for dormant/repeat-ready clients, ranks by lifetime value, returns human-readable `ClientSuggestion[]`.                                                                 |
| `notification-builder.ts` | Pure functions building rich notification text naming specific clients.                                                                                                                                    |
| `actions.ts`              | `'use server'` surface: CRUD for goals, `getGoalsDashboard()`, `getGoalHistory()`, `writeGoalSnapshot()`, `updateSuggestionStatus()`.                                                                      |

### What Was NOT Changed

- `lib/revenue-goals/` — all files left untouched. The new `lib/goals/actions.ts` delegates revenue computation to `getRevenueGoalSnapshotForTenantAdmin()` rather than duplicating the logic.
- `chef_preferences` revenue goal columns — left intact. The cron still reads `revenue_goal_program_enabled` for backward compatibility with chefs who haven't used the new wizard.
- The dashboard revenue goal card and financials page revenue section — untouched.

---

## Goal Flow

### Creating a Goal

1. Chef navigates to `/goals/setup`
2. 4-step wizard: goal type → target + period → reminders → review
3. `createGoal()` server action inserts a row into `chef_goals`
4. Redirect to `/goals`

### Dashboard Computation (`getGoalsDashboard()`)

For each active `chef_goals` row:

- Revenue goals → delegates to `getRevenueGoalSnapshotForTenantAdmin()` for realized/projected/pipeline
- Non-revenue goals → calls the appropriate signal fetcher
- `computeGoalProgress()` computes gap and percent for all
- Revenue goals additionally get: `buildPricingScenarios()` (5 price-delta scenarios) and `buildClientSuggestions()` (up to 5 dormant clients with outreach status)

### Client Suggestions Flow

1. `buildClientSuggestions()` queries `client_financial_summary` filtered to `is_dormant = true`
2. Joins `clients` table for full name and status (repeat_ready sorts first)
3. Merges existing `goal_client_suggestions` rows to show current status (pending/contacted/booked/dismissed)
4. Chef clicks "Contact" → `updateSuggestionStatus()` marks as `contacted`
5. Chef clicks dismiss → status becomes `dismissed`, card hidden from view

### Snapshot History (Cron)

The cron at `app/api/scheduled/revenue-goals/route.ts` (runs on Vercel schedule):

1. Collects all tenant IDs with either `revenue_goal_program_enabled = true` OR active `chef_goals` rows
2. For each active goal, inserts a `goal_snapshots` row — idempotent via `ON CONFLICT DO NOTHING`
3. Legacy revenue-goal notification flow preserved

---

## Pages

| Path                  | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `/goals`              | Multi-goal dashboard. Empty state with wizard CTA if no active goals. |
| `/goals/setup`        | 4-step wizard for creating any goal type.                             |
| `/goals/[id]/history` | 12-month snapshot table + sparkline for a single goal.                |

---

## Components (`components/goals/`)

| Component               | Purpose                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GoalCard`              | Full card for one goal: progress bar, events needed, pricing table, client suggestions, history link. Collapsible. Has archive button. |
| `GoalProgressBar`       | Reusable progress bar, green when ≥100%.                                                                                               |
| `GoalTypeBadge`         | Colored pill by goal type.                                                                                                             |
| `PricingScenariosTable` | 5-row table: "If you charge $X more, you need Y events."                                                                               |
| `ClientSuggestionCard`  | One client with Contact / Dismiss buttons. Status-aware.                                                                               |
| `ClientSuggestionsList` | Wrapper listing pending + already-contacted suggestions.                                                                               |
| `GoalHistorySparkline`  | CSS-only bar chart of 12 monthly progress snapshots.                                                                                   |
| `GoalsEmptyState`       | Full-card CTA to `/goals/setup`.                                                                                                       |
| `GoalWizardSteps`       | 4-step client-side wizard. All state in local `useState`.                                                                              |

---

## Adding a New Goal Type in the Future

1. Add the new type string to the `chef_goal_type` enum in a new migration
2. Add the type to the `GoalType` union in `lib/goals/types.ts`
3. Add metadata to `GOAL_TYPE_META` in `lib/goals/types.ts` (label, description, unit, icon)
4. Add a signal fetcher in `lib/goals/signal-fetchers.ts`
5. Add a `case` in `computeNonRevenueGoalView()` in `lib/goals/actions.ts`
6. Add a branch in `writeGoalSnapshotsForTenant()` in the cron route
7. That's it — the wizard, dashboard, and history page all handle it generically

---

## Backward Compatibility

- Old goals page (`app/(chef)/goals/page.tsx`) is replaced — it showed a simple snapshot from `lib/revenue-goals/`. The new page calls `getGoalsDashboard()` and shows an empty state with wizard CTA if no `chef_goals` rows exist.
- Chefs who had `revenue_goal_program_enabled = true` in `chef_preferences` will still receive the legacy revenue-goal cron notification as before.
- The `/financials` page revenue goal card and `/dashboard` revenue widget are not affected.
