# Build Task: Manual review required

**Source Persona:** david-chang
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Automate the creation and sending of beta survey invites from the SurveyResultsClient component, reducing manual effort and potential errors in the process.

## Files to Modify

- `app/(chef)/surveys/survey-results-client.tsx` -- Update the existing component to include a form for entering new invitee details and trigger the sending of an email invitation when the form is submitted. Integrate with the backend API to handle the actual creation and sending of invites.

## Files to Create (if any)

- `app/(chef)/surveys/api/beta-invite-api.ts` -- A new service file to encapsulate the logic for interacting with the backend API that handles creating and sending beta survey invitations. This will abstract away the details of making HTTP requests from the component.

## Implementation Notes

- Use React hooks and state management to handle form input and submission.
- Implement proper error handling and user feedback for successful/failed invite creation.
- Ensure security best practices are followed when implementing email functionality, such as using a secure backend API endpoint and avoiding storing sensitive data in the client.

## Acceptance Criteria

1. The existing SurveyResultsClient component now includes an "Invite New Participant" form with fields for collecting necessary information (e.g., email address).
2. Submitting the invite form triggers the creation of a new beta survey invitation via the backend API, without any manual intervention.
3. Appropriate user feedback is provided upon successful/failed invite creation and submission.
4. `npx tsc --noEmit --skipLibCheck` passes with no new build errors introduced by this change.
