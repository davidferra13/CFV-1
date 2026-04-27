# Build Task: Workflow coverage gap

**Source Persona:** gail-simmons
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a content creation workflow within the Content Pipeline Page, including draft management, review queue handling, and scheduled post publishing.

## Files to Modify

- `app/(chef)/content/page.tsx` -- Add components for managing drafts, review queue, and scheduling posts. Update existing ContentPipelinePanel component to display this new functionality.

## Files to Create (if any)

- `app/(chef)/content/drafts-panel.tsx` -- Component for displaying and interacting with draft content.
- `app/(chef)/content/review-queue-panel.tsx` -- Component for managing the review queue of content.
- `app/(chef)/content/scheduled-posts-panel.tsx` -- Component for scheduling and publishing content at specific times.

## Implementation Notes

- Integrate with existing ContentPipelinePanel component to ensure a cohesive user experience.
- Use React hooks and state management to handle data flow between components.
- Ensure proper error handling and user feedback for all interactions.

## Acceptance Criteria

1. Drafts can be created, edited, and saved within the Content Pipeline Page.
2. A review queue displays pending content for approval, with options to approve or reject each item.
3. Scheduled posts allow users to set a specific date and time for content to be published.
4. The overall layout and design of the Content Pipeline Page remains consistent with the rest of the application.
5. `npx tsc --noEmit --skipLibCheck` passes without any new type errors or warnings.

## DO NOT

- Modify files not listed in "Files to Modify" section.
- Add new npm dependencies unrelated to the content creation workflow.
- Change database schema for this feature.
- Delete existing functionality related to displaying events within the Content Pipeline Page.
- Use em dashes anywhere in the code.
