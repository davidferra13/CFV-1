# Spec: Weekly Template Cloning

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** weekly-meal-board.md
> **Estimated complexity:** small (2-3 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

The chef can clone an entire week's meal board to the next week (or any target week) with one click. "Last week worked great, clone it to next week, then I'll swap a few dishes." Instead of re-entering 15-21 meal entries from scratch, the chef copies the whole week and tweaks what needs changing. The chef can also save a week as a named "template" (e.g., "Summer Rotation A") and load it onto any future week.

---

## Why It Matters

A chef cooking 5-7 days/week for 3 months will develop rotation patterns. Re-entering the same meals every week is busywork. Clone + tweak is dramatically faster. Templates let the chef pre-build rotation schedules and deploy them.

---

## Files to Create

| File                                                        | Purpose                            |
| ----------------------------------------------------------- | ---------------------------------- |
| `database/migrations/20260401000127_hub_meal_templates.sql` | New table for saved meal templates |

---

## Files to Modify

| File                                   | What to Change                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `components/hub/weekly-meal-board.tsx` | Add "Clone Week" and "Save as Template" / "Load Template" buttons in chef edit mode |
| `lib/hub/meal-board-actions.ts`        | Add cloneWeek, saveTemplate, loadTemplate, getTemplates server actions              |
| `lib/hub/types.ts`                     | Add `MealTemplate` type                                                             |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  name TEXT NOT NULL,                     -- "Summer Rotation A"
  description TEXT,

  -- Template data: array of meal entries (day offset 0-6 from Monday + meal_type + title + etc.)
  entries JSONB NOT NULL DEFAULT '[]',    -- [{ dayOffset: 0, mealType: 'breakfast', title: '...', ... }]

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_meal_templates_group ON hub_meal_templates(group_id);
```

### Migration Notes

- Timestamp `20260401000127` follows `20260401000126`
- Additive only
- Template entries stored as JSONB for flexibility (no FK constraints on template data since it's a snapshot)

---

## Data Model

**MealTemplate** stores a reusable week pattern as JSONB. Each entry in the array:

```typescript
{ dayOffset: number, mealType: string, title: string, description?: string, dietaryTags?: string[], allergenFlags?: string[] }
```

`dayOffset` 0 = Monday, 6 = Sunday. When loading a template onto a target week, the system maps dayOffset to actual dates.

**Clone** is simpler: no template table involved. It reads all `hub_meal_board` entries for source week, remaps dates to target week, and bulk-upserts.

---

## Server Actions

Add to `lib/hub/meal-board-actions.ts`:

| Action                      | Auth                      | Input                                                         | Output                             | Side Effects                        |
| --------------------------- | ------------------------- | ------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| `cloneWeekMeals(input)`     | Profile token + chef role | `{ groupId, profileToken, sourceWeekStart, targetWeekStart }` | `{ success, count?, error? }`      | Bulk upsert entries for target week |
| `saveWeekAsTemplate(input)` | Profile token + chef role | `{ groupId, profileToken, weekStart, name, description? }`    | `{ success, templateId?, error? }` | None                                |
| `getTemplates(input)`       | Profile token + chef role | `{ groupId }`                                                 | `MealTemplate[]`                   | None                                |
| `loadTemplate(input)`       | Profile token + chef role | `{ groupId, profileToken, templateId, targetWeekStart }`      | `{ success, count?, error? }`      | Bulk upsert entries for target week |
| `deleteTemplate(input)`     | Profile token + chef role | `{ templateId, profileToken }`                                | `{ success, error? }`              | None                                |

---

## UI / Component Spec

### Clone Week

In chef edit mode, a "Clone to..." dropdown appears in the week navigation bar:

- Options: "Next Week", "Previous Week", "Pick a date..."
- Clicking an option shows confirmation: "Clone 15 meals from Apr 7-13 to Apr 14-20? This will overwrite any existing entries."
- Confirm -> bulk upsert -> navigate to target week

### Save as Template

In chef edit mode, a "Save as Template" button in the week navigation bar:

- Opens a small modal: name input (required), description (optional)
- Save -> creates template from current week's meals

### Load Template

In chef edit mode, a "Load Template" button:

- Shows list of saved templates (name, description, entry count)
- Selecting one shows confirmation: "Load 'Summer Rotation A' onto Apr 14-20? This will overwrite existing entries."
- Confirm -> bulk upsert -> refresh board

### States

- **No templates:** "Load Template" button shows "No templates saved yet" tooltip
- **Clone to empty week:** No overwrite warning needed
- **Clone to populated week:** Overwrite warning with confirm

---

## Edge Cases and Error Handling

| Scenario                               | Correct Behavior                                                 |
| -------------------------------------- | ---------------------------------------------------------------- |
| Clone to a week that already has meals | Upsert (overwrite matching slots, leave non-conflicting entries) |
| Source week is empty                   | "Nothing to clone" toast, no action                              |
| Template name already exists           | Allow (templates are not unique by name)                         |
| Server fails during bulk upsert        | Partial writes possible. Show error, user can retry              |

---

## Verification Steps

1. As chef, populate a full week on the Meal Board (5+ meals)
2. Click "Clone to Next Week" - verify all meals appear on next week
3. Edit one meal on the cloned week - verify only that meal changes
4. Save current week as template "Test Rotation"
5. Navigate to an empty week, click "Load Template" - select "Test Rotation"
6. Verify all meals from the template appear
7. Delete the template - verify it's removed from the list
8. Screenshot the clone confirmation dialog and template list

---

## Out of Scope

- Cross-circle template sharing (templates are per-circle)
- Automatic rotation scheduling ("alternate A and B every other week")
- Template marketplace or community sharing

---

## Notes for Builder Agent

- Clone is a read-then-bulk-write operation. Read source entries, remap dates, call `bulkUpsertMealEntries`
- Templates store data as JSONB snapshots (denormalized). Don't reference live meal_board entries
- The "Clone to" and "Save/Load Template" buttons only appear in chef edit mode (not visible to family)
- Use `startOfISOWeek` + `addDays` from date-fns for date mapping
