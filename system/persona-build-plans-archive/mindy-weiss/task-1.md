<!-- AUTO-ARCHIVED: all 2 file refs invalid. 2026-04-27T18:28:57.615Z -->

# Build Task: "Executive Override" Workflow:

**Source Persona:** mindy-weiss
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement an "Executive Override" workflow that allows a user with executive permissions to override the default pricing and discounting logic for a specific event or booking.

## Files to Modify

- `src/lib/events/eventHelpers.ts` -- Add a new function `overrideEventPricing` that takes in the event ID, new base price, and any additional overrides. This function should update the event record with the new prices and apply the override status.

## Files to Create (if any)

- `src/components/ExecutiveOverrideModal.tsx` -- A modal component that appears when an executive user selects the "Override Pricing" option on an event details page. The modal will display input fields for base price, discounts, and a confirmation button to apply the changes.

## Implementation Notes

- Ensure that the override functionality is only accessible to users with executive permissions.
- Implement proper error handling and validation for the pricing and discount values.
- Store the overridden prices separately from the original event pricing to allow easy reverting if needed.

## Acceptance Criteria

1. Executive users can access an "Override Pricing" option on event details pages.
2. The `overrideEventPricing` function correctly updates the event record with the new prices and sets the override status.
3. The `ExecutiveOverrideModal` component displays input fields for base price, discounts, and a confirmation button to apply the changes.
4. Executives can successfully use the modal to override pricing and discounts for an event.
5. Overridden prices are stored separately from the original event pricing.
6. `npx tsc --noEmit --skipLibCheck` passes without any new type errors related to this change.

## DO NOT

- Modify other components or files not directly related to implementing the "Executive Override" workflow.
- Add new npm dependencies for this specific feature.
- Change the existing database schema to store overridden prices. Use a separate table or field if needed.
