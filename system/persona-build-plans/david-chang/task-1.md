# Build Task: Update Recipe Book Categories

**Source Persona:** chef-johnny
**Gap Number:** 1 of 5
**Severity:** MEDIUM

## What to Build

Update the recipe book category filter UI to include a "Desserts" option. Ensure this new category behaves like other filters.

## Files to Modify

- `app/(chef)/culinary/recipes/drafts/page.tsx` -- Add "Desserts" to the CATEGORY_STYLES object and update the filter UI to include it.

## Files to Create (if any)

No new files needed for this change.

## Implementation Notes

- Ensure the Desserts category follows the same styling as other categories.
- Update the filter dropdown to display "Desserts" alongside existing options.
- Handle case where no recipes match the selected filter.

## Acceptance Criteria

1. A new "Desserts" option appears in the recipe book category filter dropdown.
2. Clicking Desserts filters the list to only show dessert recipes.
3. The Desserts category header matches other category styles and spacing.
4. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify any files outside of `app/(chef)/culinary/recipes/drafts/page.tsx`.
- Add new npm packages or dependencies.
- Change the database schema or queries related to recipes.
- Remove existing functionality from the recipe book filter UI.
