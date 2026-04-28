---
status: ready
priority: 'high'
score: 48
ref_accuracy: 50
source_plan: 'system/persona-build-plans/olajide-olatunji/task-1.md'
source_persona: 'olajide-olatunji'
exported_at: '2026-04-28T00:46:33.782Z'
---

# Build Task: Workflow coverage gap

**Source Persona:** olajide-olatunji
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build

Implement a content creation workflow within the ChefFlow application, connecting the ContentPipelinePage with the existing event and cannabis handbook pages. This will allow chefs to manage their content creation process from drafting ideas to publishing them, while also integrating review and scheduling steps.

## Files to Modify

- `app/(chef)/content/page.tsx` -- Integrate the content pipeline panel into the page, connect it with existing event management and cannabis handbook content.
- `app/(chef)/availability/page.tsx` -- Add a new section for managing drafted content availability across different platforms.
- `app/(chef)/cannabis/handbook/page.tsx` -- Include an option to publish updated versions of the cannabis handbook directly from within the content pipeline.

## Files to Create (if any)

- `lib/content/pipeline-actions.tsx` -- A new file containing functions for managing drafted content, such as creating drafts, reviewing them, scheduling posts, and publishing updates.
- `components/content/content-pipeline-panel.tsx` -- A reusable component that displays the current state of the content pipeline, including drafts, review queue, and scheduled posts.

## Implementation Notes

- Ensure a smooth transition between different stages of the content creation workflow (drafting, reviewing, scheduling, publishing).
- Implement proper error handling for each stage to maintain the integrity of the content.
- Use Drizzle ORM to interact with the database for content management operations.

## Acceptance Criteria

1. Chefs can create new drafts of content directly from the ContentPipelinePage.
2. Drafted content can be reviewed and approved by a designated team member before being published or scheduled.
3. Published content is displayed on the relevant pages (event details, cannabis handbook) with proper attribution to the chef who created it.
4. The content pipeline panel accurately reflects the current state of drafted, reviewed, scheduled, and published content.
5. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the implemented changes.

## DO NOT

- Modify existing event management or cannabis handbook functionality outside of integrating them into the content pipeline workflow.
- Add new npm dependencies not directly related to implementing the content creation workflow.
- Change the database schema for anything other than necessary fields for managing drafted, reviewed, scheduled, and published content.
