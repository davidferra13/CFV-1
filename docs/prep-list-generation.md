# Prep List Generation — Implementation Notes

**Version:** 2.0
**Date:** February 19, 2026
**Source spec:** HOW I MAKE A PREP LIST (Lifecycle Stage 7, Sous Chef agent role)

---

## What Changed

The `generate-prep-sheet.ts` document generator was substantially overhauled from a rudimentary two-section list into a full implementation of the chef's canonical prep process. The email notification system was extended to auto-deliver the prep sheet to the chef at event confirmation.

---

## What Was There Before

The v1 prep sheet fetched dishes and components, split them into AT HOME (`is_make_ahead = true`) vs ON SITE (`is_make_ahead = false`), and rendered two bullet-point sections. That was it.

Missing:
- No distinction between tasks doable *before* vs *after* shopping
- No priority ordering within courses
- No recipe method notes
- No allergen/dietary flags on individual tasks
- No component counts for packing verification
- No "BEFORE LEAVING" checklist
- Bullets instead of checkboxes
- Departure time buried in footer only
- No auto-send at confirmation

---

## What Was Built

### 1. PREP NOW vs PREP AFTER SHOPPING Split

The most critical innovation from the spec. When the chef looks at a flat list and has to mentally figure out what's doable right now, the cognitive load triggers avoidance. When the list clearly separates "do these now, no excuses" from "do these after shopping," the activation barrier drops.

**Implementation:** For each AT HOME component, we check the ingredients linked through its recipe:
- If all required (non-optional) ingredients have `is_staple = true` → **PREP NOW**
- If any required ingredient has `is_staple = false` → **PREP AFTER SHOPPING**
- If no recipe is linked → **PREP AFTER SHOPPING** (safe default)

**Proxy limitation:** The spec assumes a finalized grocery list as input to the dependency split. Since no grocery list system exists yet, we use `is_staple` on ingredients as a proxy. This works correctly for pantry-based components (pasta dough, basic sauces, compound butters) which naturally use only staple ingredients. When a grocery list system is built, the `classifyDependency()` function in `generate-prep-sheet.ts` should be updated to use the actual finalized grocery list state instead.

### 2. Priority Ordering Within Courses

Within each course, tasks are sorted by component category (protein → sauce → starch → vegetable → fruit → bread → other → condiment → dessert → garnish → cheese) with a secondary sort by total cook time descending. This puts the longest, most complex tasks first — the chef starts what takes the most time while doing quick tasks later.

### 3. Recipe Method Notes

For AT HOME tasks, the brief method note from the linked recipe's `method` field is included if the first sentence is ≤120 characters. This is not a recipe instruction — it's a reminder of the approach (e.g., "Reverse-engineer pan sauce: reduce wine, reduce stock, combine"). If the recipe method is long or detailed, it's omitted (the chef knows how to cook).

### 4. Allergen/Dietary Flags

Each task inherits its parent dish's `allergen_flags`. If the dish has any allergen flags, they appear inline on the task: `[ALLERGEN: nut, gluten]`. This makes it impossible to prep without seeing the dietary context.

### 5. Component Counts Per Course

After the AT HOME section, a summary line shows the count of make-ahead components per course and the total. This bridges to the packing list: the chef knows exactly how many containers to account for.

### 6. BEFORE LEAVING Checklist

A new section between AT HOME and ON SITE with three checkboxes: pack all components (frozen last), non-negotiables check, and departure time. This is the 80% calm threshold marker — when all AT HOME tasks are checked and these three boxes are done, the chef is ready to walk out.

### 7. Checkboxes Throughout

All tasks now use `pdf.checkbox()` instead of `pdf.bullet()`. The prep list gets food on it — it needs to be a physical checklist, not a reading document.

### 8. Header Redesigned

Departure time is now the most prominent time in the header (shown as **LEAVE BY**), followed by Arrive and Serve. The original had departure time only in the footer.

---

## Auto-Send at Confirmation

When an event transitions from `paid` → `confirmed`, the system now:
1. Sends the event confirmation email to the client (existing)
2. Auto-sends the FOH menu PDF to client + chef (existing)
3. **NEW: Auto-sends the prep sheet PDF to the chef only** (chef-internal, client never sees it)

This happens in `lib/events/transitions.ts` in the same non-blocking pattern as the FOH email. If prep sheet generation fails (e.g., menu not yet attached), the error is logged but the confirmation transition still succeeds.

The prep sheet is also always available on-demand from the event page document section whenever `menu + dishes + components` exist — no confirmation required to print it.

---

## Files Modified

| File | What Changed |
|---|---|
| `lib/documents/generate-prep-sheet.ts` | Full rewrite — new types, deep query (recipes + ingredients), PREP NOW/AFTER split, priority sort, method notes, allergen flags, component counts, BEFORE LEAVING section, checkboxes |
| `lib/events/transitions.ts` | Added `sendPrepSheetReadyEmail` to import; added prep sheet auto-send block at `paid → confirmed` |
| `lib/email/notifications.ts` | Added `sendPrepSheetReadyEmail` function; added `PrepSheetReadyEmail` import |
| `lib/email/templates/prep-sheet-ready.tsx` | New — chef-facing email with prep sheet PDF attached |
| `docs/prep-list-generation.md` | This file |

---

## No Database Changes

All required data already existed in the schema:
- `ingredients.is_staple` — for the PREP NOW/AFTER split
- `components.recipe_id` — links component to recipe
- `recipes.method`, `recipes.prep_time_minutes`, `recipes.cook_time_minutes` — for method notes and priority sorting
- `recipe_ingredients.is_optional` — for filtering required vs optional ingredients
- `dishes.allergen_flags`, `dishes.dietary_tags` — for per-task dietary labeling

---

## Future Work

1. **Grocery list system**: When built, replace the `classifyDependency()` `is_staple` proxy with actual grocery list finalization state. The function signature is isolated and the replacement will be surgical.
2. **Inventory tracking**: On-hand inventory would further refine PREP NOW (items in the chef's fridge/pantry that aren't staples but are already there).
3. **Progressive prep prompts**: The spec describes surfacing prep tasks at 48h, 24h, and morning-of windows. This would be a scheduled notification system using the prep sheet data.
4. **Interactive task checking**: A digital version of the prep list where the chef checks off tasks in the app during prep day. The `prep_started_at`, `prep_completed_at` fields on the events table are already there for this.
