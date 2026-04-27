# Build Task: Communication Hub:

**Source Persona:** ari-weinzweig
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a centralized communication hub for chefs, integrating client follow-ups, notes, and relevant client information in one place. Improve accessibility and organization of client communication.

## Files to Modify

- `app/(chef)/clients/communication/follow-ups/page.tsx` -- Update the page content and layout to include links to client notes and other relevant sections.
- `app/(chef)/clients/communication/notes/page.tsx` -- Integrate the client follow-up data into this page, ensuring consistency in presentation.

## Files to Create (if any)

- `app/(chef)/clients/communication/hub/page.tsx` -- A new centralized communication hub page that consolidates client notes, follow-ups, and other relevant information.

## Implementation Notes

- Ensure the new hub page is easily accessible from the main navigation.
- Use consistent styling and layout across all integrated pages for a cohesive user experience.
- Implement pagination or infinite scroll if the amount of data becomes too large to display at once.

## Acceptance Criteria

1. The communication hub page is accessible from the main menu and contains links to client notes and follow-ups.
2. Client notes and follow-up data are integrated into the communication hub, maintaining their respective structures and information.
3. The new hub page adheres to the existing design and styling guidelines for a seamless integration.
4. `npx tsc --noEmit --skipLibCheck` passes without any new errors or warnings.

## DO NOT

- Modify the client follow-up or notes data structure.
- Add new npm dependencies.
- Change database schema related to clients, notes, or follow-ups.
- Delete existing functionality for client notes and follow-ups pages.
