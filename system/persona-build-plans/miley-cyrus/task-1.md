# Build Task: Implement a "Critical Dependency Map":

**Source Persona:** miley-cyrus
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Create a new file `app/(chef)/dependencies/page.tsx` that displays a critical dependency map for the ChefFlow application. The map should show all external services and APIs used by the app, along with their respective importance levels (critical, high, medium, low). This will help identify potential risks and single points of failure.

## Files to Modify

- None

## Files to Create

- `app/(chef)/dependencies/page.tsx` -- A new React component that displays the critical dependency map

## Implementation Notes

- Use a table or grid layout to visually represent the dependencies
- Include columns for service name, provider, usage category (e.g., authentication, payments), and importance level
- Fetch the list of dependencies from an API endpoint (e.g., `GET /api/dependencies`) to keep the data centralized
- Handle loading and error states gracefully

## Acceptance Criteria

1. The `/chef/dependencies` page is accessible only to authenticated chefs with sufficient permissions
2. The critical dependency map loads successfully, showing all external services and their details
3. Importance levels are visually distinct (e.g., different colors or icons)
4. Clicking on a service name navigates to more detailed information about that dependency
5. `npx tsc --noEmit --skipLibCheck` passes without errors

## DO NOT

- Implement any functionality related to modifying or deleting dependencies
- Add new npm dependencies not directly related to the critical dependency map feature
- Expose sensitive information about the dependencies in the UI or logs
