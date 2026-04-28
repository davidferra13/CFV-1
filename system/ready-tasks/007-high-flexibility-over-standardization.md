---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/ari-weinzweig/task-1.md'
source_persona: 'ari-weinzweig'
exported_at: '2026-04-28T00:16:46.986Z'
---

# Build Task: Flexibility over Standardization:

**Source Persona:** ari-weinzweig
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a flexible pricing adjustment feature for consulting page, allowing users to adjust the per-person budget range and automatically updating the total price based on changes in guest count, menu complexity, or staffing.

## Files to Modify

- `app/(chef)/consulting/page.tsx` -- Add a form to input adjusted guest count, menu complexity, and staffing levels. Update the pricing calculator to reflect the changes dynamically.

## Files to Create (if any)

No new files needed for this task.

## Implementation Notes

- Use Drizzle ORM to update the database with the new pricing based on user inputs.
- Ensure that the form validation is robust to handle edge cases such as negative numbers or non-numeric input.
- Make sure that the changes made in the form persist when the page is reloaded or navigated away from and back to.

## Acceptance Criteria

1. The user can input adjusted guest count, menu complexity, and staffing levels through a form on the consulting page.
2. The pricing calculator updates dynamically based on the changes made in the form.
3. The updated pricing is stored in the database using Drizzle ORM.
4. The changes persist when the page is reloaded or navigated away from and back to.
5. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify any files other than `app/(chef)/consulting/page.tsx`.
- Add new npm dependencies.
- Change the database schema.
- Delete existing functionality.
- Use em dashes anywhere in your code or comments.
