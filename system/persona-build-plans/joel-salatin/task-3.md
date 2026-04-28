# Build Task: Add "Yield Forecasting Notes":
**Source Persona:** joel-salatin
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build
Implement a feature for chefs to add yield forecasting notes when filing event reviews. These notes will help track and improve the estimated yields over time.

## Files to Modify
- `app/(chef)/aar/page.tsx` -- Add a new input field for yield forecasting notes below the existing review fields.
- `app/(admin)/admin/flags/page.tsx` -- Update the admin flags page to include a toggleable flag for "Yield Forecasting Notes" feature.

## Files to Create (if any)
No new files needed for this task.

## Implementation Notes
- Use Drizzle ORM to add a new field called `yield_forecast_notes` to the `event_reviews` table.
- Ensure that the new input field is validated and sanitized before being saved to the database.
- Implement client-side validation to prevent submitting the form without entering yield forecasting notes when the "Yield Forecasting Notes" feature flag is enabled.

## Acceptance Criteria
1. Chefs can file event reviews with a new field for yield forecasting notes.
2. The "Yield Forecasting Notes" feature flag appears on the admin flags page and can be toggled on/off.
3. Yield forecasting notes are stored in the database alongside event reviews when the feature is enabled.
4. Client-side validation prevents submitting event reviews without yield forecasting notes when the feature flag is set.

## DO NOT
- Modify any other files besides `app/(chef)/aar/page.tsx` and `app/(admin)/admin/flags/page.tsx`.
- Add new npm dependencies or change existing ones.
- Alter the database schema in any way not directly related to adding the `yield_forecast_notes` field.
- Remove or modify existing functionality unrelated to this task.