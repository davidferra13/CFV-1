# Spec: Ad-Hoc Schedule Changes

> **Status:** built
> **Priority:** P2 (queued)
> **Depends on:** weekly-meal-board.md
> **Estimated complexity:** small (2-3 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

Family members can post quick schedule change requests directly from the Meal Board. A "Flag Change" button on any day lets them say "4 extra guests Friday" or "We're out of town Monday-Wednesday" or "Cancel dinner Thursday, we're eating out." The chef sees these flags as prominent alerts on the affected days. No chat scrolling, no phone calls, no middleman. One tap, type a note, done.

---

## Why It Matters

When you're cooking for a family daily, plans change constantly. Guests show up. Kids are away. The family eats out. If the chef doesn't know, they prep food that goes to waste. The family needs a dead-simple way to flag "this day is different" that the chef sees immediately on the meal board.

---

## Files to Create

| File                                                          | Purpose                                             |
| ------------------------------------------------------------- | --------------------------------------------------- |
| `components/hub/schedule-change-flag.tsx`                     | Flag button + inline form per day on the meal board |
| `database/migrations/20260401000129_hub_schedule_changes.sql` | New table for schedule change flags                 |

---

## Files to Modify

| File                                   | What to Change                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `components/hub/weekly-meal-board.tsx` | Render `ScheduleChangeFlag` on each day column. Show alert badge on flagged days |
| `lib/hub/meal-board-actions.ts`        | Add schedule change CRUD actions                                                 |
| `lib/hub/types.ts`                     | Add `ScheduleChange` type                                                        |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_schedule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  posted_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- What's changing
  change_date DATE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'extra_guests', 'fewer_guests', 'skip_day', 'skip_meal',
    'time_change', 'location_change', 'other'
  )),
  description TEXT NOT NULL,              -- "4 extra guests for dinner"
  affected_meals TEXT[] DEFAULT '{}',     -- ['dinner'] or ['breakfast', 'lunch'] or empty = all

  -- Resolution
  acknowledged_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_schedule_changes_group_date ON hub_schedule_changes(group_id, change_date);
```

### Migration Notes

- Timestamp `20260401000129` follows `20260401000128`
- Additive only

---

## Data Model

**ScheduleChange** represents a flag on a specific day posted by a family member (or the chef). Key fields:

- `change_type` categorizes common scenarios (extra/fewer guests, skip day, time change)
- `description` is free text for specifics
- `affected_meals` narrows which meals are affected (empty = whole day)
- `acknowledged_by` / `acknowledged_at` lets the chef mark "I saw this" so the family knows it was received
- `resolved` marks it as handled

---

## Server Actions

Add to `lib/hub/meal-board-actions.ts`:

| Action                             | Auth                       | Input                                                                            | Output                         | Side Effects                 |
| ---------------------------------- | -------------------------- | -------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- |
| `postScheduleChange(input)`        | Profile token (any member) | `{ groupId, profileToken, changeDate, changeType, description, affectedMeals? }` | `{ success, change?, error? }` | Posts system message to chat |
| `getScheduleChanges(input)`        | None (public)              | `{ groupId, startDate, endDate }`                                                | `ScheduleChange[]`             | None                         |
| `acknowledgeScheduleChange(input)` | Profile token + chef/admin | `{ changeId, profileToken }`                                                     | `{ success, error? }`          | None                         |
| `resolveScheduleChange(input)`     | Profile token + chef/admin | `{ changeId, profileToken }`                                                     | `{ success, error? }`          | None                         |

---

## UI / Component Spec

### Day-Level Flag Button

On each day column of the Weekly Meal Board, a small flag icon appears (visible to all members):

- No flags: subtle outline flag icon
- Has unacknowledged flags: amber pulsing badge with count
- All flags acknowledged: muted badge

### Flag Form

Tapping the flag icon on a day opens an inline form:

- **Change type** dropdown (Extra guests, Fewer guests, Skipping this day, Meal time change, Location change, Other)
- **Description** text input (required): "4 guests joining for dinner"
- **Which meals?** optional chip select (Breakfast, Lunch, Dinner, All)
- Submit button

### Chef Alert View

The chef sees flagged days with a prominent amber/yellow alert bar across the day:

- Shows the change description
- "Acknowledge" button (marks as seen, badge goes from amber to muted)
- "Resolve" button (marks as handled, removes the alert)

### States

- **No flags:** Clean day column, subtle flag icon
- **Unacknowledged flag:** Amber alert bar on the day, pulsing badge
- **Acknowledged flag:** Muted alert bar (chef saw it, but hasn't resolved)
- **Resolved:** Flag hidden from default view (accessible via "Show resolved" toggle)

---

## Edge Cases and Error Handling

| Scenario                            | Correct Behavior                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Multiple flags on same day          | Stack them vertically. Each has its own acknowledge/resolve                       |
| Flag on a day with no meals planned | Still works (flag is on the day, not the meal)                                    |
| Server action fails                 | Revert optimistic update, toast error                                             |
| Chef acknowledges their own flag    | Allowed (chef can flag schedule changes too, e.g., "I'll be 2 hours late Monday") |

---

## Verification Steps

1. As family member, open the Meal Board
2. Tap the flag icon on a day - verify the form appears
3. Submit "4 extra guests for dinner" with type "Extra guests"
4. Verify amber alert appears on that day
5. As chef, verify you see the alert
6. Click "Acknowledge" - verify badge changes from amber to muted
7. Click "Resolve" - verify alert hides
8. Verify a system message was posted to chat: "Schedule change flagged for [date]"
9. Screenshot the flagged day view from both family and chef perspectives

---

## Out of Scope

- Automatic meal board adjustments based on flags (chef handles manually)
- Push notifications for schedule changes (covered by existing hub notifications)
- Recurring schedule patterns ("we always eat out on Fridays")

---

## Notes for Builder Agent

- The flag icon should be subtle but discoverable. Use a small calendar-with-alert icon
- Amber is the alert color. Match the existing allergen warning styling
- System messages should use `system_event_type: 'schedule_change'`
- The acknowledge/resolve pattern is similar to a simple two-step status progression
- Load schedule changes alongside meal board data in the same server-side fetch
