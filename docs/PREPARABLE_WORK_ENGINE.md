# Preparable Work Engine — Reflecting Document

**Date:** 2026-02-14
**Scope:** State-driven behavioral refinement per ChefFlow Process Master Document
**Impact:** Dashboard, workflow engine (new), no schema changes

---

## What Changed

### New Files Created

| File                                    | Purpose                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `lib/workflow/types.ts`                 | Type definitions for confirmed facts, work items, stages, and engine I/O |
| `lib/workflow/confirmed-facts.ts`       | Pure function that derives boolean facts from event data                 |
| `lib/workflow/stage-definitions.ts`     | 17-stage evaluators that surface work items based on confirmed facts     |
| `lib/workflow/preparable-actions.ts`    | `GET_PREPARABLE_ACTIONS` — the core deterministic engine                 |
| `lib/workflow/actions.ts`               | Server action that fetches data and feeds it to the pure engine          |
| `components/dashboard/work-surface.tsx` | Dashboard UI that renders categorized work items                         |

### Modified Files

| File                            | What Changed                                                   |
| ------------------------------- | -------------------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx` | Replaced KPI-only dashboard with work-surface-driven dashboard |

### No Schema Changes

The engine derives all its state from existing tables: `events`, `clients`, `event_menus`, `menus`, `ledger_entries`, and `event_financial_summary`. No migrations needed.

---

## Architecture

### Separation of Concerns

```
Database (existing)
    ↓
lib/workflow/actions.ts        ← Fetches data, builds EventContext[]
    ↓
lib/workflow/preparable-actions.ts  ← Pure engine, no DB calls
    ↓ calls
lib/workflow/confirmed-facts.ts     ← Derives ConfirmedFacts from EventContext
lib/workflow/stage-definitions.ts   ← 17 evaluators produce WorkItem[]
    ↓
components/dashboard/work-surface.tsx  ← Renders categorized items
    ↓
app/(chef)/dashboard/page.tsx          ← Page assembly
```

### The Engine is Pure

`getPreparableActions()` and `deriveConfirmedFacts()` are pure functions. They receive data, return results. No database calls, no side effects. This means:

- They are deterministic — same input always produces same output
- They are testable without a database
- They can be called from anywhere (server actions, API routes, tests)

### Truth > Task

The engine never tracks "tasks" as persistent entities. It evaluates confirmed facts at render time and surfaces what is preparable. If a fact changes, the work surface changes. No stale task lists.

---

## Confirmed Facts Model

Facts are derived from three sources:

1. **Event data** — title, date, location, guest count, pricing, status
2. **Menu data** — attached menus, dish lists
3. **Financial data** — collected amounts from the ledger view

Every fact is boolean. The engine never guesses. If data is missing, the fact is `false`.

### Key Facts and What They Unlock

| Fact                            | Source                    | Unlocks                                             |
| ------------------------------- | ------------------------- | --------------------------------------------------- |
| `hasDate`                       | event.event_date          | Timeline skeleton, travel buffers, temporal urgency |
| `hasLocation`                   | event.location            | Travel planning, equipment decisions                |
| `hasGuestCount`                 | event.guest_count         | Grocery quantities, equipment sizing                |
| `hasMenuAttached`               | event_menus join          | Component breakdown, grocery skeleton               |
| `hasMenuWithDishes`             | menu.dishes array         | Prep modeling, grocery detail                       |
| `menuGravityStable`             | status >= proposed        | Grocery Phase A, prep draft                         |
| `guestCountStable`              | status >= accepted        | Grocery Phase B, equipment Level 2                  |
| `depositReceived`               | ledger computation        | Calendar lock, prep eligibility                     |
| `isLegallyActionable`           | deposit OR status >= paid | Full prep unlock, grocery Phase B/C                 |
| `eventConfirmed`                | status >= confirmed       | Packing, timeline finalization, grocery Phase C     |
| `dateWithin7Days/3Days/24Hours` | temporal computation      | Urgency escalation, phase triggers                  |

---

## 17-Stage Mapping

Each stage from the Process Master Document maps to an evaluator function in `stage-definitions.ts`. The evaluators are called in order (1–17) and produce work items based on the event's confirmed facts.

### Progressive Unlock Examples

**Grocery List (Stage 6):**

- Phase A (structural) → unlocks when `menuGravityStable` (menu shape won't change much)
- Phase B (quantified) → unlocks when `guestCountStable` (client accepted, count is real)
- Phase C (finalized) → unlocks when `eventConfirmed` AND `dateWithin7Days` (shopping window)

**Equipment Planning (Stage 8):**

- Level 1 (menu tools) → unlocks when `hasMenuAttached`
- Level 2 (service equipment) → unlocks when `guestCountStable` AND `hasLocation`
- Level 3 (site confirmation) → unlocks when `eventConfirmed` AND `dateWithin7Days`

**Prep List (Stage 7):**

- Draft plan → unlocks when `menuGravityStable` (optional early)
- Early prep items → unlocks when `isLegallyActionable` (financially committed)
- Day-of prep → unlocks when `dateWithin24Hours` (urgency: fragile)

---

## Work Item Classification

Every surfaced work item receives two classifications:

### Category (what kind of work)

- **BLOCKED** — Cannot proceed. Missing a confirmed fact. Shows what's blocking.
- **PREPARABLE** — Can be safely done right now. Based on confirmed facts only.
- **OPTIONAL EARLY** — Reduces future stress. Not required yet but harmless to do.

### Urgency (how urgent)

- **FRAGILE** — Will cause stacking if delayed. Floats to top of dashboard.
- **NORMAL** — Standard preparable work. Sorted by event date.
- **LOW** — Nice to have. Sorted last.

---

## Dashboard Behavior

The dashboard now answers: **"What can I safely prepare right now?"**

### Before (old dashboard)

- 4 KPI cards (upcoming events, total clients, revenue, completed)
- Recent events list

### After (new dashboard)

- **Summary bar:** Active Events, Preparable Now, Blocked, Fragile if Delayed
- **Fragile if Delayed section** — Top priority, always visible when non-empty
- **Preparable Now section** — The main answer. Work the chef can do right now.
- **Blocked section** — What's waiting and why
- **Stress Reducers section** — Optional early work that reduces future pressure
- **Business context** — Clients count and net revenue (secondary, below work surface)

### Sort Order

Within each section, items are sorted:

1. Fragile urgency floats to top
2. By event date (soonest first)
3. By stage number (earlier stages first)

---

## Anti-Stacking Protocol

The engine prevents late realization of obvious work by:

1. **Progressive unlocking** — Grocery, prep, and equipment lists unlock in phases, not all-at-once at final confirmation
2. **Temporal urgency** — Items escalate from `normal` to `fragile` as the event date approaches (7 days → 3 days → 24 hours)
3. **Fragile section** — Dashboard always shows fragile items at the top, impossible to miss
4. **Optional early surfacing** — Stress reducers appear before they become urgent

Specific anti-stacking examples:

- Grocery Phase A surfaces when menu is proposed (not at final confirmation)
- Equipment Level 1 surfaces when menu is attached (not at packing day)
- Prep draft surfaces when menu gravity is stable (not the morning of)
- Travel modeling surfaces when location is set (not the night before)

---

## What This Does NOT Do

- Does not change the event state machine (8-state FSM unchanged)
- Does not add new database tables or migrations
- Does not create persistent "task" records
- Does not redesign the UI beyond the dashboard
- Does not add features beyond what the Process Master Document specifies
- Does not expand scope

---

## Testing

The pure engine functions can be tested with synthetic EventContext data:

```typescript
import { getPreparableActions } from '@/lib/workflow/preparable-actions'
import type { EventContext } from '@/lib/workflow/types'

const mockContext: EventContext = {
  event: {
    id: 'test-1',
    title: 'Test Dinner',
    event_date: '2026-02-20T19:00:00Z',
    guest_count: 12,
    location: '123 Main St',
    notes: null,
    total_amount_cents: 250000,
    deposit_amount_cents: 75000,
    deposit_required: true,
    status: 'confirmed',
    client: { id: 'c1', full_name: 'Jane Doe', email: 'jane@test.com' },
  },
  menus: [{ id: 'm1', name: 'Winter Menu', dishes: [{ name: 'Soup' }] }],
  financial: { collectedCents: 75000, isDepositPaid: true, isFullyPaid: false },
}

const surface = getPreparableActions([mockContext])
// surface.preparable will contain grocery Phase C, prep items, equipment Level 3, etc.
```

---

## Connection to System

This engine sits between the existing data layer and the UI. It reads from the same tables and views that already exist. It produces no side effects. It is the behavioral refinement layer described in the ChefFlow Process Master Document — making the system answer "what can be safely prepared right now?" instead of just "what happened recently?"
