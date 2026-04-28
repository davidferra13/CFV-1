# Build Task: Workflow coverage gap
**Source Persona:** joel-salatin
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build
Implement a content creation workflow within the Content Pipeline Page, allowing chefs to draft, review, and schedule posts for publishing. Enhance the user experience by adding features like inline editing, version tracking, and a streamlined approval process.

## Files to Modify
- `app/(chef)/content/page.tsx` -- Update existing components to include new content creation workflow features. Refactor code to separate concerns and improve maintainability.

## Files to Create (if any)
- `app/(chef)/content/drafts/DraftList.tsx` -- Display a list of drafts created by the chef, with options to edit or delete each draft.
- `app/(chef)/content/review/ReviewQueue.tsx` -- Show pending posts awaiting approval from the review team. Include buttons for approving or rejecting each post.

## Implementation Notes
- Utilize Next.js API routes to handle backend logic for creating, updating, and deleting drafts and scheduled posts.
- Implement optimistic UI patterns to provide a smooth user experience while waiting for server responses.
- Ensure proper error handling and feedback to the user in case of failures or conflicts.

## Acceptance Criteria
1. Chefs can create new content drafts within the Content Pipeline Page, with inline editing capabilities.
2. Drafts are saved automatically and can be revisited later from the DraftList component.
3. ReviewQueue component displays pending posts for approval, with buttons to approve or reject each post.
4. Approved posts are scheduled for publishing at a specified time, while rejected posts are moved to a trash bin for recovery.
5. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the implemented changes.

## DO NOT
- Modify existing functionality outside of the content creation workflow scope.
- Introduce new npm dependencies not directly related to the content creation workflow.
- Alter the database schema or make changes that affect other parts of the application unrelated to this task.