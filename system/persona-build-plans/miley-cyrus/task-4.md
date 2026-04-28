# Build Task: Workflow coverage gap

**Source Persona:** miley-cyrus
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Implement a content creation workflow management system within the ChefFlow application. This system should track content from draft stage through review, scheduling, and eventual publishing. The goal is to provide chefs with a centralized tool to manage their content pipeline.

## Files to Modify

- `app/(chef)/content/page.tsx` -- Update existing ContentPipelinePanel component to display drafts, review queue, scheduled posts, and published content. Add functionality for creating new content items and moving them through the workflow stages.

## Files to Create (if any)

- `app/(chef)/content/new-content-item-modal.tsx` -- A modal dialog that allows chefs to create a new content item by entering title, body text, tags, and selecting initial workflow stage (draft, review, scheduled, published).

## Implementation Notes

- Use Drizzle ORM to interact with the PostgreSQL database for storing and retrieving content items.
- Implement React hooks for managing state related to selected content item and modal visibility.
- Utilize Tailwind CSS classes to style the new components and maintain consistency with existing design.

## Acceptance Criteria

1. Chefs can create a new content item by filling out title, body text, tags, and selecting initial workflow stage.
2. The ContentPipelinePanel displays drafts, review queue, scheduled posts, and published content in their respective sections.
3. Clicking on a content item opens it for viewing with options to edit or delete.
4. Moving a content item from draft to review triggers a peer review process, while moving from review to scheduled sets the post date.
5. Content items move through the workflow stages based on their status and can be filtered by tags in the respective sections.
6. `npx tsc --noEmit --skipLibCheck` passes without any new build errors.

## DO NOT

- Modify existing components or files not related to the content pipeline functionality.
- Add new npm dependencies that are not directly related to implementing the content creation workflow management system.
- Change database schema in a way that affects other parts of the application.
