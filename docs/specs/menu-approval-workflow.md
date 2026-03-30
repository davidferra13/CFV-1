# Spec: Menu Approval Workflow

> **Status:** deferred
> **Priority:** P3 (backlog) - Developer feedback: approval gates are unnecessary for this use case. Chefs are trusted professionals; clients don't need to sign off on meals. The meal board + feedback loop is the communication system.
> **Depends on:** weekly-meal-board.md
> **Estimated complexity:** small (3-4 files)
> **Created:** 2026-03-29
> **Built by:** not started

---

## What This Does (Plain English)

When the chef posts a new week of meals to the Meal Board, the circle gets a lightweight approval flow. The board shows a banner: "Week of Apr 7 - Apr 13: Pending Review." Any circle member with the appropriate role (owner, admin, or a designated "approver") can tap "Approve" or "Request Changes." If they request changes, they write a short note ("Can we swap Thursday dinner? We have guests"). The chef sees the request, makes changes, and re-submits. Once approved, the status flips to "Approved" and the chef knows they can shop and prep.

---

## Why It Matters

For a high-profile family, the chef shouldn't just post menus and start cooking. There's an implicit approval step: "here's what I'm planning, does this work?" Without it, the chef might shop for $500 of ingredients only to find out the family is traveling that week. A simple approve/request-changes flow adds professionalism and prevents waste.

---

## Files to Create

| File                                                            | Purpose                                      |
| --------------------------------------------------------------- | -------------------------------------------- |
| `components/hub/meal-week-approval.tsx`                         | Approval banner + approve/request changes UI |
| `database/migrations/20260401000126_hub_meal_week_approval.sql` | New table for weekly approval status         |

---

## Files to Modify

| File                                   | What to Change                                       |
| -------------------------------------- | ---------------------------------------------------- |
| `components/hub/weekly-meal-board.tsx` | Render `MealWeekApproval` banner above the week grid |
| `lib/hub/meal-board-actions.ts`        | Add approval-related server actions                  |
| `lib/hub/types.ts`                     | Add `MealWeekApproval` type                          |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_meal_week_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Which week
  week_start DATE NOT NULL,               -- Monday of the week (ISO)

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'changes_requested')),

  -- Who acted
  submitted_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  submitted_at TIMESTAMPTZ,
  reviewed_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,                        -- note from reviewer when requesting changes

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One status per group per week
  UNIQUE(group_id, week_start)
);

CREATE INDEX idx_hub_meal_week_status_group ON hub_meal_week_status(group_id, week_start);
```

### Migration Notes

- Timestamp `20260401000126` follows `20260401000125`
- Additive only

---

## Data Model

**MealWeekStatus** tracks the approval state of one week's menu for one circle. States:

- `draft` - Chef is still editing, not yet submitted for review
- `pending_review` - Chef clicked "Submit for Review," family can now approve or request changes
- `approved` - Family approved, chef can shop and prep
- `changes_requested` - Family wants modifications, includes a review note explaining what to change

Unique per (group_id, week_start). The week_start is always a Monday (ISO week).

---

## Server Actions

Add to `lib/hub/meal-board-actions.ts`:

| Action                       | Auth                             | Input                                        | Output                     | Side Effects                                                 |
| ---------------------------- | -------------------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `getWeekStatus(input)`       | None (public)                    | `{ groupId, weekStart }`                     | `MealWeekApproval \| null` | None                                                         |
| `submitWeekForReview(input)` | Profile token + chef role        | `{ groupId, profileToken, weekStart }`       | `{ success, error? }`      | Posts system message: "Weekly menu submitted for review"     |
| `approveWeek(input)`         | Profile token + owner/admin role | `{ groupId, profileToken, weekStart }`       | `{ success, error? }`      | Posts system message: "Menu approved for [week]"             |
| `requestWeekChanges(input)`  | Profile token + owner/admin role | `{ groupId, profileToken, weekStart, note }` | `{ success, error? }`      | Posts system message: "Changes requested for [week]: [note]" |

---

## UI / Component Spec

### Approval Banner

Rendered at the top of the Weekly Meal Board, above the day grid:

**Draft state (chef view):**

- Gray banner: "This week's menu is in draft. [Submit for Review]" button

**Pending review (family view):**

- Amber banner: "Menu for Apr 7-13 is ready for review. [Approve] [Request Changes]"
- "Request Changes" opens a small text input for the note

**Approved:**

- Green banner with checkmark: "Menu approved by [name] on [date]"

**Changes requested:**

- Red/amber banner: "Changes requested by [name]: '[note]'. [Resubmit]"
- Chef sees the note and can edit meals, then resubmit

### States

- **No status record:** Treat as "draft" (chef hasn't submitted yet)
- **Loading:** Subtle skeleton bar
- **Error:** "Could not load approval status" (non-blocking, meal board still shows)

### Interactions

- **Submit for Review (chef):** Button click -> optimistic status change -> server upsert -> system message posted
- **Approve (family):** Button click -> optimistic green banner -> server update
- **Request Changes (family):** Button click -> note input appears -> submit -> optimistic amber banner with note -> server update
- **Resubmit (chef):** After changes requested, chef edits meals, clicks "Resubmit" -> status back to pending_review

---

## Edge Cases and Error Handling

| Scenario                       | Correct Behavior                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| No meals posted for the week   | "Submit for Review" button disabled with tooltip "Add meals first"                             |
| Chef submits, then edits meals | Status stays at pending_review (edits don't auto-reset status). Chef can resubmit if they want |
| Multiple people try to approve | First approval wins. Second person sees "Already approved"                                     |
| Server fails on approve        | Revert banner to pending_review, toast error                                                   |

---

## Verification Steps

1. As chef, post meals for a week on the Meal Board
2. Verify "Submit for Review" button appears
3. Click Submit - verify banner changes to "pending review"
4. Open circle as family member - verify amber "ready for review" banner
5. Click "Request Changes" with note "Swap Thursday dinner" - verify banner updates
6. As chef, verify you see the change request note
7. Edit meals, click "Resubmit" - verify status back to pending
8. As family, click "Approve" - verify green approved banner
9. Screenshot all four states

---

## Out of Scope

- Multi-person approval (only one approval needed, not consensus)
- Automated reminders if family hasn't reviewed by a deadline
- Version history of menu changes

---

## Notes for Builder Agent

- The banner component should be lightweight (no heavy state management)
- System messages use the existing `postSystemMessage` pattern from other hub features
- Week start is always Monday. Use `startOfISOWeek()` from date-fns
- The approval is per-week, not per-meal. One approval covers all 21 meal slots
