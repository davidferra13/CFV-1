# Build Task: Workflow coverage gap
**Source Persona:** gordon-ramsay
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build
Implement a content workflow management system within the ChefFlow application. This will include creating, reviewing, scheduling, and publishing content pages. The goal is to provide Gordon Ramay with a streamlined process for managing his culinary content.

## Files to Modify
- `app/(chef)/content/page.tsx` -- Enhance the existing ContentPipelinePanel component to allow Gordon to view and manage his content workflow. This will include displaying drafts, review queue, scheduled posts, and published content.

## Files to Create (if any)
- `app/(chef)/content/drafts/DraftsPage.tsx` -- A new page for viewing and managing draft content.
- `app/(chef)/content/review/ReviewQueuePage.tsx` -- A new page for reviewing and approving content before publication.
- `app/(chef)/content/schedule/ScheduledContentPage.tsx` -- A new page for scheduling future content posts.

## Implementation Notes
- Use Next.js page components to create the new pages for managing drafts, review queue, scheduled content, and published content.
- Utilize React hooks and state management to handle data flow between the different workflow stages.
- Ensure proper authentication and authorization checks are in place using Auth.js v5 to restrict access to the content management features.

## Acceptance Criteria
1. The ContentPipelinePage displays a navigation menu with links to Drafts, Review Queue, Scheduled Content, and Published pages.
2. Navigating to each page shows the respective content stage (drafts, review queue, scheduled, published) in a readable format.
3. Gordon can create new draft content using the DraftsPage, which is then visible in the ContentPipelinePanel.
4. The ReviewQueuePage allows designated reviewers to approve or reject drafts before they are published.
5. ScheduledContentPage enables Gordon to schedule future posts, which appear in the pipeline on their scheduled date.
6. Published content is displayed in a dedicated section within the ContentPipelinePanel.
7. `npx tsc --noEmit --skipLibCheck` passes without any new build errors.

## DO NOT
- Modify the Cannabis or AvailabilityBroadcaster pages/files.
- Add new npm dependencies outside of those required for the workflow management system.
- Change the existing database schema related to content management.
- Delete any existing functionality from the ContentPipelinePage component.
- Use em dashes anywhere in the code.