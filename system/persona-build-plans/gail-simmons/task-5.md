# Build Task: Operational reset follow through gap

**Source Persona:** gail-simmons
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Implement a way for chefs to mark the operational reset complete on the event record after finishing the reset checklist and PDF.

## Files to Modify

- `app/(chef)/events/[id]/reset/page.tsx` -- Add logic to mark reset as complete when the chef finishes the reset checklist and clicks a button

## Files to Create (if any)

- None needed for this task

## Implementation Notes

- Use an event status flag to determine if marking reset complete is allowed
- Have the chef click a "Mark Reset Complete" button to update the event record with reset_complete = true
- Update the UI to show confirmation of completion or let them proceed to other tasks

## Acceptance Criteria

1. Chefs can see their current progress on the reset checklist PDF
2. After finishing all items, they can click a "Mark Reset Complete" button which marks the event's reset_complete flag as true
3. The UI updates to show confirmation of completion or let them proceed to other tasks
4. `npx tsc --noEmit --skipLibCheck` passes without errors

## DO NOT

- Modify any files outside the specified path
- Add new npm packages or dependencies
- Change the database schema or data
- Remove existing functionality related to marking reset complete
- Use em dashes anywhere in your code
