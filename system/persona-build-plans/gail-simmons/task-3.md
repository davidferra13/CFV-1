# Build Task: UX alignment gap

**Source Persona:** gail-simmons
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a feature that allows clients to confirm their dietary preferences, kitchen access details, and guest count before the chef begins day-of prep. This will help address the #1 client complaint: preference misalignment.

## Files to Modify

- `lib/clients/client-profile-service.ts` -- Add methods to retrieve and update client's dietary preferences, kitchen access details, and guest count.
- `components/events/pre-event-checklist-client.tsx` -- Update the pre-event checklist component to include fields for dietary preferences, kitchen access details, and guest count. Implement a confirmation button that triggers the new methods in `client-profile-service.ts`.

## Files to Create (if any)

- `lib/clients/client-preference-utils.ts` -- Create a utility file to handle common tasks related to client preference management, such as validating input data and formatting responses.

## Implementation Notes

- Ensure proper error handling and user feedback for each step of the confirmation process.
- Use React's `useEffect` hook to update the client profile in real-time when changes are made.
- Implement a loading state while fetching or updating client preferences to improve user experience.

## Acceptance Criteria

1. Clients can view and edit their dietary preferences, kitchen access details, and guest count through the pre-event checklist component.
2. The confirmation button triggers a server-side update of the client's profile with the provided information.
3. Proper error handling is in place for scenarios such as invalid input or network issues.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors.

## DO NOT

- Modify existing methods or data structures in `client-profile-service.ts` not related to this feature.
- Add new npm dependencies specific to this task.
- Change the database schema for client profiles.
- Remove or modify existing functionality unrelated to this feature.
