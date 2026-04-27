# Build Task: Workflow coverage gap

**Source Persona:** mindy-weiss
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a content creation workflow within the Content Pipeline Page, connecting it with the Availability Broadcaster and Cannabis Handbook. This will allow chefs to manage their content creation process alongside their availability updates and cannabis education.

## Files to Modify

- `app/(chef)/availability/page.tsx` -- Add a link to the Content Pipeline Page in the "What's Next" section.
- `app/(chef)/cannabis/handbook/page.tsx` -- Add a link to the Content Pipeline Page at the bottom of the page.

## Files to Create (if any)

- `app/(components)/(chef)/content/content-pipeline-link.tsx` -- A reusable component linking to the Content Pipeline Page. This will be used in both modified files above.

## Implementation Notes

- Ensure that the links are styled consistently with the rest of the application using Tailwind CSS.
- Handle edge cases where a chef may not have permission to access the Content Pipeline Page, and provide appropriate feedback.

## Acceptance Criteria

1. The "What's Next" section on the Availability Broadcaster page includes a link to the Content Pipeline Page, clearly labeled and styled appropriately.
2. The Cannabis Handbook page includes a link to the Content Pipeline Page at the bottom of the page.
3. Clicking on either link navigates to the Content Pipeline Page, which is now connected with the Availability Broadcaster and Cannabis Handbook.
4. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to these changes.

## DO NOT

- Modify any other files not listed in "Files to Modify".
- Add new npm dependencies or change existing ones.
- Change database schema or add new queries.
- Delete functionality or alter the existing behavior of the Availability Broadcaster and Cannabis Handbook pages.
