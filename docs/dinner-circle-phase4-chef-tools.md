# Dinner Circle Phase 4: Chef Tools and Daily UX

## What changed

### 1. Today's Meals Hero Card

A prominent card at the top of the Meals tab (current week only, view mode) showing:

- All non-cancelled meals for today, sorted by meal time
- Full details: title, description, head count, prep notes, dietary/allergen tags
- Status badge (planned/confirmed/served) with progression controls
- Chef can advance status (planned -> confirmed -> served) or cancel meals
- Gradient border using the hub's primary accent color

### 2. Meal Status Progression

The existing `status` column (planned/confirmed/served/cancelled) now has full UI:

- **Server action**: `updateMealStatus` in `meal-board-actions.ts`
- **Today's card**: "Mark Confirmed" / "Mark Served" / "Cancel" buttons
- **Week grid**: compact status badges next to the meal type label (only shown when not "planned")
- Optimistic updates with rollback on failure

### 3. Dietary Dashboard (Chef-Only)

Aggregates ALL dietary information across every household member in the circle:

- **Allergies**: color-coded by severity (red for peanuts/tree nuts/shellfish, orange for dairy/eggs, amber for soy/wheat/gluten)
- **Dietary restrictions**: emerald badges
- **Per-person breakdown**: each household member with their age group, relationship, allergies, restrictions, dislikes, and favorites
- Collapsible: shows summary counts when collapsed, full detail when expanded
- Uses the existing `getCircleHouseholdSummary` action

### 4. Weekly Prep Brief (Chef-Only)

A collapsible, copyable summary for the chef's prep workflow:

- Total meals + average head count
- Watch list: all allergens and dietary restrictions flagged across the week's meals
- Day-by-day breakdown: every meal with title, head count, and confirmation status
- Prep notes section: all chef prep notes extracted and organized
- "Copy to clipboard" button for pasting into notes, texts, or shopping lists

## Design decisions

- **Today's card is contextual**: only shows on current week, only in view mode. Doesn't clutter past/future weeks or edit mode.
- **Status progression is linear**: planned -> confirmed -> served. Cancel available at any non-served state. No backwards movement (you can re-plan by editing).
- **Dietary dashboard is collapsible**: critical safety data is one click away, but doesn't overwhelm the default view with info the chef already knows.
- **Prep brief is text-first**: designed to be copied and pasted. The chef sends this to their assistant, prints it for the kitchen, or references it on their phone during prep.

## Files changed

- `lib/hub/meal-board-actions.ts` - added `updateMealStatus`
- `components/hub/todays-meals-card.tsx` - new component
- `components/hub/dietary-dashboard.tsx` - new component
- `components/hub/weekly-prep-summary.tsx` - new component
- `components/hub/weekly-meal-board.tsx` - integrated all 3 + status handler + grid badges
