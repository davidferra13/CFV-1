# Build 3: Pipeline Kanban View

**Branch:** `fix/grade-improvements`
**Status:** Complete
**Date:** 2026-02-20

---

## What Changed

### Problem Being Solved

The inquiry pipeline's kanban board existed but lacked key visibility features:
1. **No "stuck" indicator** — no way to tell which leads haven't moved in days
2. **No budget amounts on cards** — couldn't see deal value at a glance
3. **No revenue totals per column** — couldn't see total pipeline value by stage
4. **No pipeline revenue forecast** — no expected vs. best-case revenue from open pipeline

Grade before: **B → A-**

---

## Enhanced Files

### `components/inquiries/kanban-card.tsx`

Added to `KanbanCardInquiry` interface:
- `budget_cents?: number` — from `confirmed_budget_cents`
- `updated_at?: string` — from inquiry row's `updated_at`

Visual additions per card:
- **Budget display** (bottom right): shows confirmed budget in dollars with green DollarSign icon
- **Stuck badge** (top right): days since last update
  - 4–6 days: amber badge + amber card background
  - 7+ days: red badge + red card background
  - 14+ days: "Stuck — no movement in X days" inline label
- **Neutral state**: no badge when activity is recent (no visual noise)

### `components/inquiries/kanban-board.tsx`

Added to `KanbanBoardInquiry` interface:
- `budget_cents?: number`
- `updated_at?: string`

Added to `KanbanColumn`:
- `formatColumnRevenue()` helper — formats cents to `$1.2k` or `$4,500`
- Revenue total displayed in column header next to the count badge (green, only when non-zero)
- New fields passed through to `KanbanCard`

### `app/(chef)/inquiries/page.tsx`

Updated `kanbanInquiries` mapping to include:
- `budget_cents: inquiry.confirmed_budget_cents ?? undefined`
- `updated_at: inquiry.updated_at`

---

## New Files

### `lib/pipeline/forecast.ts`
Server action computing pipeline revenue forecast from open inquiries + active events.

**Probability multipliers by stage:**

| Stage | Probability |
|---|---|
| New inquiry | 15% |
| Awaiting response / chef | 20% |
| Awaiting client | 30% |
| Quote sent | 45% |
| Inquiry confirmed | 90% |
| Draft event | 30% |
| Proposed event | 60% |
| Accepted event | 80% |
| Deposit paid | 95% |
| Confirmed event | 99% |
| In progress | 100% |

**Returns:** `{ expectedCents, bestCaseCents, stages[], computedAt }`
- `expectedCents` = sum of (stage total × probability) across all stages
- `bestCaseCents` = sum of all quoted amounts in pipeline (assumes all close)

### `components/pipeline/revenue-forecast.tsx`
Dashboard widget displaying pipeline revenue forecast.

- **Expected** tile (green): probability-weighted pipeline total
- **Best Case** tile (stone): raw pipeline total assuming 100% close rate
- Stage breakdown: per-stage label, expected amount, probability %, visual bar
- Empty state: graceful when no open inquiries/events
- Link to `/inquiries` pipeline view

---

## Dashboard Integration

`app/(chef)/dashboard/page.tsx` updated:
- Import: `getPipelineRevenueForecast`, `PipelineRevenueForecast` type, `PipelineForecastWidget` component
- Empty default: `emptyPipelineForecast` with zeros
- Added to `Promise.all()`: `safe('pipelineForecast', getPipelineRevenueForecast, emptyPipelineForecast)`
- Widget inserted in Business Snapshot grid between Inquiries card and Clients card

---

## Architecture Notes

- **No N+1**: `getPipelineRevenueForecast()` runs two parallel queries (inquiries + events), each returning the full set
- **Graceful degradation**: wrapped in `safe()` on dashboard — forecast shows empty state if query fails
- **Chef-only**: `requireChef()` called at the top of the server action
- **Tenant-scoped**: both queries filter by `tenant_id`

---

## What to Test

1. Go to `/inquiries` → switch to Kanban view
2. Find cards with budgets — green dollar amount should appear bottom right
3. Find any inquiry not updated in 4+ days — amber badge should appear
4. Find any inquiry not updated in 7+ days — red badge + red background
5. Column headers should show revenue total in green (e.g. "$4.5k") for columns with budgets
6. Go to `/dashboard` → Business Snapshot section → Pipeline Forecast widget
7. Widget should show Expected Revenue + Best Case totals
8. Stage breakdown bars should be proportional to expected amounts
