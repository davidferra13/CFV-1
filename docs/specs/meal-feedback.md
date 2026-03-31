# Spec: Meal-Specific Feedback

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** weekly-meal-board.md
> **Estimated complexity:** medium (5-6 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

Family members can give quick, frictionless feedback on any specific meal on the Weekly Meal Board. Each meal slot shows thumbs up/down buttons and an optional one-line note. One tap to say "loved it" or "not for me." The chef sees aggregated feedback per dish across all circle members, and the system automatically tracks which dishes a family loves, which they don't, and surfaces those patterns. No forms, no surveys, no friction. Tap and done.

---

## Why It Matters

A chef cooking daily for a family needs to know what's landing and what isn't. Asking verbally is awkward (especially when you can't talk directly to the client). The family tapping a thumbs up after dinner is the lowest-friction feedback loop possible. Over 3 months, this data becomes a goldmine of preference intelligence.

---

## Files to Create

| File                                                       | Purpose                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `components/hub/meal-feedback.tsx`                         | Inline feedback UI (thumbs up/down + note) per meal slot |
| `lib/hub/meal-feedback-actions.ts`                         | Server actions: submit/update/get feedback               |
| `database/migrations/20260401000124_hub_meal_feedback.sql` | New table for per-meal feedback                          |

---

## Files to Modify

| File                                   | What to Change                                                             |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `components/hub/weekly-meal-board.tsx` | Import and render `MealFeedback` component inside each populated meal slot |
| `lib/hub/types.ts`                     | Add `MealFeedback` type definition                                         |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_meal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id UUID NOT NULL REFERENCES hub_meal_board(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- Core feedback
  reaction TEXT NOT NULL CHECK (reaction IN ('loved', 'liked', 'neutral', 'disliked')),
  note TEXT,                              -- optional one-liner: "kids couldn't stop eating this"

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One feedback per person per meal
  UNIQUE(meal_entry_id, profile_id)
);

CREATE INDEX idx_hub_meal_feedback_entry ON hub_meal_feedback(meal_entry_id);
CREATE INDEX idx_hub_meal_feedback_profile ON hub_meal_feedback(profile_id);
```

### Migration Notes

- Timestamp `20260401000124` follows `20260401000123` (meal board table)
- References `hub_meal_board(id)` which must exist first
- Additive only

---

## Data Model

**MealFeedback** represents one person's reaction to one meal. Key design:

- Unique per (meal_entry_id, profile_id): each person can react once per meal (upsert model)
- Four reaction levels: `loved` (strong positive), `liked` (positive), `neutral` (meh), `disliked` (negative)
- Optional `note` for context ("the kids went crazy for this", "too spicy for me")
- Cascade delete: if the meal entry is removed, feedback goes with it

**Aggregation:** The chef sees summary counts per meal (3 loved, 1 liked, 0 disliked) and can read individual notes. Over time, the chef can query "most loved dishes" and "most disliked dishes" across all meals in a circle.

---

## Server Actions

| Action                             | Auth                            | Input                                              | Output                                                                   | Side Effects                   |
| ---------------------------------- | ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| `submitMealFeedback(input)`        | Profile token (any member)      | `{ mealEntryId, profileToken, reaction, note? }`   | `{ success, feedback?, error? }`                                         | None (silent, no chat message) |
| `getMealFeedback(input)`           | None (public)                   | `{ mealEntryId }`                                  | `MealFeedbackSummary` (counts + individual entries)                      | None                           |
| `getMealBoardWithFeedback(input)`  | None (public)                   | `{ groupId, startDate?, endDate?, profileToken? }` | `MealBoardEntry[]` each with `feedbackSummary` and `myFeedback`          | None                           |
| `getCircleFeedbackInsights(input)` | Profile token + chef/admin role | `{ groupId }`                                      | `{ mostLoved: string[], mostDisliked: string[], totalFeedback: number }` | None                           |

**Auth model:** Any circle member can submit feedback (not just viewers). Chef/admin can see aggregated insights. Anonymous viewers (no profile token) see feedback counts but cannot submit.

---

## UI / Component Spec

### Inline Feedback (per meal slot)

Rendered below each populated meal entry on the Weekly Meal Board:

```
┌─────────────────────────────────┐
│ 🍽️ Pan-Seared Salmon            │
│ with lemon butter risotto       │
│ [GF] [DF]                       │
│                                 │
│ 👍 3  👎 0   💬 "Amazing!"      │
│ [👍] [👎] [Add note...]         │
└─────────────────────────────────┘
```

**Components:**

1. **Feedback summary row** (always visible): Shows aggregated reaction counts. Loved count with heart/thumbs-up icon. Disliked count with thumbs-down icon. Latest note preview (truncated).
2. **Action buttons** (visible to authenticated members): Two buttons: thumbs up (maps to "loved") and thumbs down (maps to "disliked"). Active state: filled icon with accent color. Tapping toggles (tap again to un-react, tap opposite to switch).
3. **Note input** (expandable): "Add note..." text appears on tap. Expands to a single-line input with save button. Max 200 characters.

### States

- **No feedback yet:** Just the two action buttons, no summary row. "Be the first to react" subtle hint
- **Has feedback:** Summary row above buttons. Counts shown inline
- **User already reacted:** Their button is filled/highlighted. Tapping it again removes their reaction
- **Error on submit:** Toast "Couldn't save your feedback, try again". No optimistic update lost (buttons revert)

### Interactions

- **Thumbs up:** Tap -> optimistic highlight -> server upsert with reaction "loved" -> done. If already "loved", tap removes feedback (delete). If was "disliked", switches to "loved" (upsert)
- **Thumbs down:** Same logic with reaction "disliked"
- **Add note:** Tap "Add note..." -> input appears -> type note -> tap save or press Enter -> note saved alongside current reaction. If no reaction yet, adding a note defaults to "neutral" reaction
- **View all feedback (chef):** Chef sees a small expandable section showing each member's name + reaction + note. Others just see counts

---

## Edge Cases and Error Handling

| Scenario                                      | Correct Behavior                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Server action fails                           | Revert button state, show toast error                                                 |
| User has no profile token                     | Hide feedback buttons, show counts only (read-only)                                   |
| User is a viewer role                         | Can still submit feedback (feedback is not "posting")                                 |
| Meal entry gets deleted while user is viewing | Feedback buttons disappear gracefully (parent component handles)                      |
| Very long note                                | Truncate at 200 chars client-side, enforce server-side                                |
| Same user submits twice rapidly               | UNIQUE constraint + upsert prevents duplicates                                        |
| Meal is in the future (not yet served)        | Still allow feedback on planned meals (e.g., "can't wait!" or "I'm allergic to this") |

---

## Verification Steps

1. Open a dinner circle with meals posted on the Weekly Meal Board
2. As a family member (non-chef), tap thumbs up on a meal - verify it highlights and count increments
3. Tap thumbs up again - verify it un-reacts and count decrements
4. Tap thumbs down - verify it highlights with down state
5. Add a note to a meal - verify it saves and displays
6. Switch to chef view - verify chef can see individual member reactions and notes
7. Check that anonymous viewers (no profile token) see counts but no buttons
8. Verify mobile layout: buttons and notes fit within the meal slot without overflow
9. Screenshot the feedback UI in both reacted and un-reacted states

---

## Out of Scope

- Automatic preference profile updates from feedback (future: aggregate "loved" dishes into client's favorite_dishes[])
- Feedback analytics dashboard for the chef (future spec)
- Email/notification when family member leaves feedback (unnecessary friction)
- Star ratings or detailed scoring (too much friction for this use case: thumbs is enough)

---

## Notes for Builder Agent

- This component renders INSIDE each meal slot on the Weekly Meal Board. It's not a standalone page
- Follow the reaction pattern from `hub-message-reactions` (message-actions.ts lines 225-313) for the upsert/toggle logic
- Use optimistic updates with rollback (same pattern as hub-notes-board.tsx)
- The thumbs up/down icons should be simple SVG, not emoji (consistent with hub's icon style)
- Feedback is silent: no system message posted to chat when someone reacts. This is intentional (reduces noise for the "minimal interaction" use case)
- The `getMealBoardWithFeedback` action should be the primary data loader, joining meal entries with feedback in a single query to avoid N+1
- For the chef's expanded view of individual feedback, use a disclosure/accordion pattern (click to expand, not always visible)
