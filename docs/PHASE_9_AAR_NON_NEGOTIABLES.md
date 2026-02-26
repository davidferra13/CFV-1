# Phase 9: After Action Reviews + Non-Negotiables Learning

## What Changed

Phase 9 introduces the post-event feedback loop — the mechanism by which ChefFlow learns and improves. Every completed dinner gets an After Action Review (AAR) that captures how calm the service felt, how prepared the chef was, what was forgotten, and freeform notes. Forgotten items feed a learning system: anything forgotten twice gets automatically promoted to the permanent pre-event checklist.

## Files Created

### Server Actions

- **`lib/aar/actions.ts`** — 7 AAR functions:
  - `createAAR()` — Insert review + set `aar_filed = true` on event
  - `getAARByEventId()` — Fetch AAR for a specific event (or null)
  - `getAAR()` — Fetch single AAR with event + client context
  - `updateAAR()` — Update existing review (chef fills in more later)
  - `getRecentAARs()` — List recent AARs with event context
  - `getAARStats()` — Aggregate stats: avg ratings, trends, top forgotten items
  - `getForgottenItemsFrequency()` — Count forgotten items across all AARs

- **`lib/checklist/actions.ts`** — Non-Negotiables checklist:
  - `getChefChecklist()` — Merges permanent defaults + event-specific items + learned items
  - `getPermanentChecklist()` — Returns default permanent items
  - `getLearnedChecklistItems()` — Items forgotten 2+ times

### UI Components

- **`components/aar/aar-form.tsx`** — Client component AAR entry form
  - Large tappable rating selectors (1-5 scale with labels)
  - Checkbox grid of checklist items for forgotten item tracking
  - Optional text fields for notes
  - Supports both create and edit modes

- **`components/events/event-closure-actions.tsx`** — Client component for reset/follow-up buttons

### Pages

- **`app/(chef)/events/[id]/aar/page.tsx`** — AAR entry/edit page
- **`app/(chef)/aar/page.tsx`** — AAR history with stats and trends

## Files Modified

### `lib/events/actions.ts`

Added 4 event closure functions:

- `getEventClosureStatus()` — Returns `{ aarFiled, resetComplete, followUpSent, financiallyClosed, allComplete }`
- `markResetComplete()` — Sets `reset_complete = true` + timestamp
- `markFollowUpSent()` — Sets `follow_up_sent = true` + timestamp
- `getEventsNeedingClosure()` — Queries completed events with pending closure items

### `app/(chef)/events/[id]/page.tsx`

- Added Post-Event Closure section (4-item checklist with green/red indicators)
- Added AAR Summary section (ratings, forgotten items, notes preview)
- Added "File After Action Review" call-to-action for completed events without AAR
- Action buttons for incomplete closure items (File AAR, Mark Reset Complete, Mark Follow-Up Sent)

### `app/(chef)/dashboard/page.tsx`

- Added "Events Needing Closure" section — lists completed events with pending closure items
- Added "Service Quality" card — last 5 events avg calm/prep ratings with trend indicator
- Added "Frequently Forgotten" card — items forgotten 2+ times with auto-checklist notice

## Design Decisions

### AAR Form is Low-Friction by Design

The form follows the principle that the chef just finished a dinner and might be tired:

1. **Ratings first** — Two quick taps (calm + prep), always required
2. **Forgotten items second** — Checkbox grid, one tap per item
3. **Text notes last** — All optional, can come back tomorrow

The chef can file an AAR with just the two ratings and zero text. The learning system still works because forgotten items are tracked via checkboxes.

### Non-Negotiables Uses Constants, Not a Table

The `chefs` table has no checklist configuration column. Rather than requiring a schema migration for V1, the permanent checklist items are stored as a constant array in `lib/checklist/actions.ts`. Learned items (from AARs) are computed dynamically. This is sufficient for V1 — a dedicated `chef_settings` table or JSONB column on `chefs` can be added later for per-chef customization of the permanent list.

### Closure Is Surfaced, Not Enforced

Per the task spec: "Do NOT enforce these as hard blockers on the `completed` transition." The event transitions to `completed` when the chef finishes on-site. The AAR, reset, follow-up, and financial closure happen afterward. The system surfaces what's incomplete:

- Event detail page shows a 4-item closure checklist
- Dashboard shows events with pending closure items
- Each pending item has a direct action button

### Stats Are Computed, Not Pre-Aggregated

AAR stats (averages, trends, forgotten item frequency) are computed on read from the raw AAR records. For the expected volume (a chef doing 2-5 dinners/week), this is fast enough. Pre-aggregation can be added later if needed.

## How It Connects to the System

### Learning Loop

```
Dinner completed
  → Chef files AAR (ratings + forgotten items)
    → Forgotten items are counted across all AARs
      → Items forgotten 2+ times → auto-added to checklist
        → Next dinner's checklist is smarter
```

### Calm Rating = The Real KPI

The master document says the real KPI is "did this dinner feel calm?" The calm rating (1-5) across events over time IS that KPI. The dashboard shows the trend — when the chef sees their average calm rating improving, that's proof ChefFlow is working.

### Event Closure Pipeline

```
Event completed → 4 closure items pending:
  1. AAR filed      → /events/[id]/aar
  2. Reset complete  → "Mark Reset Complete" button
  3. Follow-up sent  → "Mark Follow-Up Sent" button
  4. Financially closed → (handled by financial pipeline)
```

## Verification Checklist

- [x] `lib/aar/actions.ts` exists with 7 functions
- [x] `lib/checklist/actions.ts` exists with checklist management
- [x] AAR creation updates event `aar_filed` flag
- [x] `getEventClosureStatus()` returns all 4 closure requirements
- [x] `markResetComplete()` and `markFollowUpSent()` update event flags
- [x] AAR form has quick ratings + forgotten items checklist + optional text fields
- [x] Event detail page shows closure status for completed events
- [x] Event detail page shows AAR summary when filed
- [x] Dashboard shows events needing closure
- [x] `getForgottenItemsFrequency()` counts forgotten items across AARs
- [x] Forgotten items with count >= 2 appear in checklist
- [x] 0 type errors, clean build
