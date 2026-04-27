# Build Task: Planner input degraded

**Source Persona:** david-chang
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Improve the WeekPlannerPage component to handle incomplete analyzer responses gracefully, providing meaningful fallback content or error messages to the user.

## Files to Modify

- `app/(chef)/calendar/week/page.tsx` -- Update the WeekPlannerPage component to include proper error handling and fallback UI for partial data loads.

## Implementation Notes

- Check if any of the Promises in Promise.all are rejected, indicating an incomplete response.
- If a promise fails, catch it and render a user-friendly error message or loading indicator.
- Ensure that the fallback UI is visually distinct from the main content area.

## Acceptance Criteria

1. When one or more promises fail to resolve completely, the WeekPlannerPage displays a clear error message to the user.
2. The error message provides context about what went wrong and suggests a course of action (e.g., try again later).
3. The error UI is visually distinct from the main content area, using different colors or layouts.
4. `npx tsc --noEmit --skipLibCheck` passes on the modified file.

## DO NOT

- Modify any other components or files besides `app/(chef)/calendar/week/page.tsx`.
- Add new npm dependencies or change existing ones.
- Alter the database schema or make changes that affect the backend.
- Remove existing functionality from the WeekPlannerPage component.
