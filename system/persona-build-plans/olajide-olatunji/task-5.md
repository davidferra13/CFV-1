# Build Task: Operational reset follow through gap

**Source Persona:** olajide-olatunji
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Add a "Mark Reset Complete" toggle switch on the event page, which when toggled, marks the operational reset checklist as complete for that specific event. This allows chefs to easily mark their post-event resets as finished without having to navigate to the dedicated reset page.

## Files to Modify

- `app/(chef)/events/[id]/page.tsx` -- Add a new state variable to track whether the reset is marked complete, and update the UI to show/hide the toggle based on this state. Also modify the event record write logic to save the reset_complete flag when the toggle is toggled.

## Files to Create (if any)

- None

## Implementation Notes

- Use a boolean state variable called `resetComplete` to track if the reset is marked complete or not.
- Show/hide the "Mark Reset Complete" toggle based on the value of `resetComplete`.
- When the toggle is toggled, update the event record with the new `reset_complete: true` field.

## Acceptance Criteria

1. The "Mark Reset Complete" toggle appears on the event page next to the reset checklist link.
2. Toggling the switch updates the UI to show that the reset is marked complete and hides the toggle.
3. Navigating away from the page and back shows the reset as marked complete.
4. `npx tsc --noEmit --skipLibCheck` passes

## DO NOT

- Modify any files other than `app/(chef)/events/[id]/page.tsx`
- Add new npm packages or dependencies
- Change the database schema or add new fields
- Remove existing functionality related to marking resets complete
