# Build Task: UX alignment gap

**Source Persona:** olajide-olatunji
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a feature that allows clients to easily confirm their dietary preferences, kitchen access details, and guest count before the chef begins day-of prep. This will help address the #1 client complaint: preference misalignment.

## Files to Modify

- `components/events/pre-event-checklist-client.tsx` -- Update the component to include a confirmation button and handle the confirmation logic.

## Files to Create (if any)

No new files needed for this task.

## Implementation Notes

- Use React's `useState` and `useTransition` hooks to manage the confirmed state and handle asynchronous confirmation action.
- Call the `confirmPreEventChecklist` function from `lib/events/pre-event-checklist-actions` when the confirmation button is clicked.
- Update the component's JSX to display a confirmation message and a navigation link back to the event page once the checklist has been confirmed.

## Acceptance Criteria

1. The client can see their confirmed dietary preferences, kitchen access details, and guest count on the pre-event checklist client page.
2. Clicking the "Confirm Checklist" button triggers an asynchronous action that updates the `pre_event_checklist_confirmed_at` timestamp for the event in the database.
3. After successful confirmation, the user is redirected back to the event page.
4. Running `npx tsc --noEmit --skipLibCheck` against the modified file does not produce any type-related errors.

## DO NOT

- Modify any files other than `components/events/pre-event-checklist-client.tsx`.
- Add new npm dependencies.
- Change the database schema related to events or client profiles.
- Remove existing functionality from the pre-event checklist client page.
