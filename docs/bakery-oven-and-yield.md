# Bakery: Oven Schedule & Yield Tracking

Two bakery features for managing oven capacity and measuring batch consistency.

## Feature 1: Bake Schedule / Oven Management

### What it does

- **Oven inventory**: Add and manage ovens (deck, convection, combi, rotary, proofer, other) with max temp, tray capacity, and notes
- **Bake scheduling**: Schedule bakes by oven with product name, start time, duration, temp, and tray count
- **Conflict detection**: Prevents double-booking an oven for overlapping time slots
- **Status tracking**: Each bake moves through scheduled > preheating > baking > cooling > done
- **Utilization**: Calculates % of each oven's day that was in use
- **Availability**: Computes free time slots for any oven on a given day

### Database tables

- `bakery_ovens` - Oven inventory with type, capacity, max temp
- `bake_schedule` - Scheduled bakes with planned/actual times, status tracking

### Files

| File                                                               | Purpose                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `supabase/migrations/20260331000019_bakery_ovens_and_schedule.sql` | Migration (ovens, schedule, yield tables)                              |
| `lib/bakery/oven-actions.ts`                                       | Server actions: CRUD for ovens and bakes, conflict checks, utilization |
| `components/bakery/oven-schedule.tsx`                              | Client component: timeline view, oven management, bake forms           |
| `app/(chef)/bakery/oven-schedule/page.tsx`                         | Page route                                                             |

### How it works

Each oven is a row in the timeline. Bake slots show time ranges, temp, tray count, and status. Color coding: gray (scheduled), orange (preheating), red (baking), blue (cooling), green (done). "Start Bake" records `actual_start`, "Done" records `actual_end`.

Conflict detection runs before every insert: if a new bake overlaps with an existing one on the same oven, the insert is rejected with a clear error message.

Utilization is deterministic math: sum of all `duration_minutes` for the oven on that day, divided by 1440 (minutes in a day), as a percentage.

## Feature 2: Yield Tracking Per Batch

### What it does

- **Log yields**: Record actual vs expected output for every batch
- **Variance calculation**: Deterministic `(actual - expected) / expected * 100`
- **Waste tracking**: Count wasted units and categorize by reason (burnt, misshapen, underproofed, overbaked, dropped)
- **Quality ratings**: 1-5 scale per batch
- **Consistency score**: % of all batches within 5% of their target yield
- **Recipe averages**: Avg variance and quality per product over all time
- **Waste report**: Total waste by reason over the last 7 days

### Database table

- `bakery_yield_records` - Yield data with variance, waste, quality rating

### Files

| File                                  | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `lib/bakery/yield-actions.ts`         | Server actions: record yields, history, trends, waste reports, consistency |
| `components/bakery/yield-tracker.tsx` | Client component: log form, summary cards, history table, recipe averages  |
| `app/(chef)/bakery/yield/page.tsx`    | Page route                                                                 |

### Variance color coding

- Green: within 5% of target
- Yellow: 5-15% variance
- Red: over 15% variance

### All math is deterministic

No AI involved. Variance, consistency score, averages, and waste totals are all computed with standard arithmetic. Formula > AI.

## Tenant scoping

Both features use `requireChef()` and derive `tenant_id` from `user.tenantId!`. RLS policies enforce tenant isolation at the database level. All server actions follow the existing pattern.
