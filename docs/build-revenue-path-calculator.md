# Revenue Path Calculator

## What Changed and Why

Chefs set monthly revenue goals but had no tool that told them _exactly_ which services to do to close the gap. The existing goals system computed "events needed" but only using a single average booking value — it had no concept of a **Couples Tasting Menu** vs. a **Family Buffet** vs. a **Per-Person Dinner**. This meant the gap estimate was generic and not actionable.

This build adds:

1. **Service type registry** — chef defines named services with exact pricing formulas
2. **Month-specific gap analysis** — cross-references already-booked events to show only what remains
3. **Interactive mix calculator** — pick service types + quantities, running total updates instantly
4. **Greedy auto-suggest** — fills the gap with the most efficient combination
5. **Per-slot client matching** — for each planned service type, suggests clients who fit

---

## Files Added

| File                                                        | Purpose                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------- | -------------- |
| `supabase/migrations/20260321000003_chef_service_types.sql` | New DB table + RLS policies                                   |
| `lib/goals/service-mix-utils.ts`                            | Pure math functions (no `'use server'`)                       |
| `lib/goals/service-mix-actions.ts`                          | Server actions: CRUD, gap calc, client matching, auto-suggest |
| `app/(chef)/goals/revenue-path/page.tsx`                    | Page at `/goals/revenue-path`                                 |
| `components/goals/revenue-path-panel.tsx`                   | Tab orchestrator (Service Types                               | Build My Path) |
| `components/goals/service-type-manager.tsx`                 | Add/edit/delete service type UI with live price preview       |
| `components/goals/service-mix-calculator.tsx`               | Interactive calculator with quantity steppers                 |
| `components/goals/service-slot-client-match.tsx`            | Lazy-loaded client chips per service slot                     |

## Files Modified

| File                             | Change                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `lib/goals/types.ts`             | Appended `ServiceType`, `ServiceMixPlan`, `ServiceSlotClientMatch`, `RevenuePathData`, etc. |
| `components/goals/goal-card.tsx` | Added "Build Your Path →" link on revenue goals where gap > 0                               |

---

## Database Schema

```sql
CREATE TABLE chef_service_types (
  id                   UUID PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  pricing_model        TEXT CHECK (pricing_model IN ('flat_rate', 'per_person', 'hybrid')),
  base_price_cents     INTEGER NOT NULL DEFAULT 0,
  per_person_cents     INTEGER NOT NULL DEFAULT 0,
  typical_guest_count  INTEGER NOT NULL DEFAULT 2,
  min_guests           INTEGER,
  max_guests           INTEGER,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ
);
```

**Why `TEXT + CHECK` instead of the existing `pricing_model` enum:** The existing enum only has `per_person`, `flat_rate`, `custom`. Adding `hybrid` would require `ALTER TYPE` which is risky on a live database. The new table uses a `TEXT + CHECK` constraint which is self-contained and safe.

---

## Pricing Formulas

```
flat_rate  → effectivePrice = base_price_cents
per_person → effectivePrice = per_person_cents × typical_guest_count
hybrid     → effectivePrice = base_price_cents + (per_person_cents × typical_guest_count)

gapCents = max(0, goal.targetValue − alreadyBookedCents)
totalPlannedCents = Σ (effectivePriceCents × quantity)
unfilledCents = max(0, gapCents − totalPlannedCents)
exceededByCents = max(0, totalPlannedCents − gapCents)
```

---

## Auto-Suggest Algorithm

The auto-suggest is a **greedy algorithm** — no AI, no LLM, no Ollama:

1. Sort service types by `effectivePriceCents` descending
2. While `remaining > 0`: pick the highest-value type that fits within `remaining`, add 1 slot, subtract from remaining
3. If nothing fits the remaining gap, add 1 of the cheapest type to give the chef a starting point

This runs server-side in `autoSuggestMix()` in `lib/goals/service-mix-actions.ts`. No client data is involved.

---

## Client Matching

`getClientMatchesForServiceType()` uses heuristic scoring only — no `parseWithOllama`, no external calls:

- Recency bonus (0–30 points): based on days since last event
- Spend proximity bonus (+10): client's avg spend is within 50% of the service's effective price
- LTV tier bonus (0/5/10): based on lifetime value vs. median LTV

Returns the top 3 clients for each service type. Loaded lazily — only when the chef sets a quantity > 0 for that type.

---

## How It Integrates With the Existing Goals System

- The existing `GoalCard` component now shows a "Build Your Path →" button on revenue goals when `gapValue > 0`
- The calculator uses the goal's `targetValue` (in cents) and `periodStart`/`periodEnd` to scope the already-booked events query
- Service types are independent of quotes and events — they're a planning layer, not an accounting layer. They never write to ledger entries.
- The `getRevenuePath()` action queries events with `status IN (accepted, paid, confirmed, in_progress, completed)` to get committed revenue for the period

---

## User Flow

1. Chef navigates to `/goals` → sees revenue goal card → clicks "Build Your Path →"
2. On `/goals/revenue-path`, the "My Service Types" tab opens first (if no types defined yet)
3. Chef adds service types: name, pricing model, price, typical guest count
4. Chef switches to "Build My Path" tab
5. Amber callout shows already-booked revenue + remaining gap
6. Chef sets quantities using + / − buttons — running total updates instantly
7. OR clicks "Auto-suggest mix" for a greedy recommendation
8. Per-service-type, client chips appear showing which clients fit that slot
9. Summary table at bottom shows full breakdown: plan total + already booked = projected total

---

## Privacy

- Service type data: not sensitive, stored normally
- Client matching: heuristic only, computed server-side, never calls Ollama or any external AI
- All financial amounts remain in cents (minor units) throughout
