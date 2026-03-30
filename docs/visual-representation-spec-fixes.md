# Visual Representation Spec Fixes

**Date:** 2026-03-29
**Spec:** `docs/specs/visual-representation-strategy.md`

## What changed

### Spec corrections (8 builder traps fixed)

1. **Phase 1B:** Changed `receipt_url` to `receipt_photo_url` (the actual column name). Added note about signed URL requirement via `getReceiptUrl()` from `lib/expenses/receipt-upload.ts`.

2. **Phase 1C:** Added exact file paths for events list (`app/(chef)/events/page.tsx` lines 105-192) and noted that `getEvents()` in `lib/events/actions.ts` needs a new LEFT JOIN to `event_photos` or subquery for dish photos. Current query has NO photo join.

3. **Phase 1D:** Fixed file path from `/culinary/menus/` (a redirect) to `app/(chef)/menus/menus-client-wrapper.tsx` (the real MenuCard component, lines 114-200). Noted that `getMenus()` (lib/menus/actions.ts:333-362) selects menu fields only with NO dish join.

4. **Phase 2D:** Fixed table name from `equipment_inventory` (doesn't exist) to `equipment_items` (the real table at types/database.ts:17104). Created fix migration `20260401000122`.

5. **Phase 3D (culinary board):** Marked DEFERRED. The `culinary_terms` table and `/culinary-board` page don't exist in production (only in agent worktrees).

6. **Phase 4B (dashboard photos):** Marked DEFERRED pending design review. The schedule widget is already compact and adding images may violate the non-invasive rule.

7. **Migration section:** Updated to reflect corrected table name and added note about the two migrations (000121 hit wrong table, 000122 fixes it).

### Infrastructure fixes

8. **New migration:** `20260401000122_equipment_items_photo_url.sql` adds `photo_url TEXT` to `equipment_items` (the correct table). Applied to database.

9. **types/database.ts regenerated:** All 5 new columns now present in TypeScript types:
   - `clients.avatar_url` (line 11453)
   - `ingredients.image_url` (line 14832)
   - `equipment_items.photo_url` (line 17122)
   - `staff_members.photo_url` (line 45436)
   - `vendors.logo_url` (line 48990)

### Full Planner Gate validation

Added complete 14-question Spec Validation section at the bottom of the spec with cited file paths and line numbers for every claim. Covers: current state inventory, assumption verification (6 wrong assumptions caught), break points, underspecified areas, dependencies, conflicts, data flows, implementation order, success criteria, constraints, and scope boundaries.
