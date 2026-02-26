# Recipe Habit Engine

## The Problem

A chef with 10+ years of experience and 300+ events had zero recipes recorded. The infrastructure existed (Layer 4 schema, Smart Import AI, recipe creation UI), but the habit loop was broken:

- Recipe capture was buried on individual event detail pages
- It was entirely optional with no daily visibility
- There was no backfill path for past events
- No daily reminder that anything was missing

## What Was Built

### 1. Recipe Debt Dashboard Widget

**Files:** `components/dashboard/recipe-debt-widget.tsx`, additions to `app/(chef)/dashboard/page.tsx`

A persistent banner at the top of the dashboard showing total unrecorded dish components broken down by recency (last 7 days / last 30 days / older). When debt is zero it shows a quiet celebration state ("Recipe Bible up to date").

**Urgency signaling:** Red when there's debt from the last 7 days (memory is freshest), amber otherwise.

**Server action:** `getRecipeDebt()` in `lib/recipes/actions.ts` — queries all `components WHERE recipe_id IS NULL` joined through `dishes → menus → events`, groups by event date age.

### 2. Recipe Sprint Mode

**Files:** `app/(chef)/recipes/sprint/page.tsx`, `components/recipes/recipe-sprint-client.tsx`

A dedicated backfill page at `/recipes/sprint`. Loads all unrecorded components across all events, sorted most-recent first (freshest memory first). Works like a queue:

- One component at a time, full screen focus
- Paste description → AI parses → confirm → next
- Skip moves the item to the end of the queue
- Progress bar: "47 of 312 captured"
- "Full Editor" escape hatch for complex recipes
- "Done for today" exits to dashboard

**Server action:** `getAllUnrecordedComponents()` in `lib/recipes/actions.ts` — returns `UnrecordedComponentForSprint[]` with event context (name, date, client) so the chef can recall what they were making.

### 3. Upgraded Post-Event Recipe Capture Prompt

**File:** `components/recipes/recipe-capture-prompt.tsx`

Replaced the quiet amber card with a prominent bordered banner:

- Always expanded by default when the event has unrecorded components
- Shows component count as a badge
- "Sprint Mode" button links directly to the sprint page
- Collapsible (click header) if chef wants to dismiss it temporarily
- Quick-capture textarea still available per-component for fast in-place recording

### 4. All-Caught-Up State

Both the dashboard widget and the event capture prompt show a green "all caught up" state when there's no recipe debt. This positive reinforcement closes the habit loop.

## The Habit Loop

```
Complete event
    ↓
Event detail page: amber banner shows X dishes unrecorded
    ↓
Quick Capture (30 seconds) or Sprint Mode
    ↓
Next day: dashboard widget shows 0 (green) or remaining debt
    ↓
Sprint Mode for backfill (batch capture session)
```

## What Did NOT Change

- The database schema is unchanged — `scale_factor` on `components`, `times_cooked` on `recipes`, all Layer 4 tables were already correct.
- The existing recipe creation flow (Smart Import + Manual) is untouched.
- The grocery list generator already applied `scale_factor` — no changes needed there.
- No changes to the event FSM or ledger.

## Server Actions Added

In `lib/recipes/actions.ts`:

| Function                       | Purpose                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `getRecipeDebt()`              | Counts unrecorded components grouped by event age. Used by dashboard widget. |
| `getAllUnrecordedComponents()` | Returns full queue for Sprint Mode with event context.                       |

Both are tenant-scoped via `requireChef()`.
