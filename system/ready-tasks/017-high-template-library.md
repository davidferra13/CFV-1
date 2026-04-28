---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/mindy-weiss/task-2.md'
source_persona: 'mindy-weiss'
exported_at: '2026-04-28T00:16:46.992Z'
---

# Build Task: Template Library:

**Source Persona:** mindy-weiss
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement a template library feature that allows users to create, view, and manage reusable menu templates. This will enhance the ChefFlow application's functionality by providing a centralized place for chefs to store and utilize their favorite menus.

## Files to Modify

- `app/(chef)/clients/[id]/page.tsx` -- Add navigation links to access template library.
- `app/(chef)/culinary/menus/index.tsx` -- Integrate the template library feature into the existing menus component.

## Files to Create (if any)

- `app/(chef)/culinary/templates/index.tsx` -- New file for handling template library functionality.
- `app/(chef)/culinary/templates/[id].tsx` -- New file for viewing individual menu templates.

## Implementation Notes

- Use React hooks and state management to handle template creation, editing, and deletion.
- Implement optimistic UI techniques to provide a smooth user experience during form submissions.
- Ensure proper error handling and user feedback for failed operations.

## Acceptance Criteria

1. Users can navigate to the template library from the client detail page.
2. Chefs can create new menu templates by filling out a form, with options to save or cancel changes.
3. Existing templates are displayed in a list format, allowing users to view details and edit them.
4. Deleting a template prompts a confirmation modal before proceeding.
5. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the implemented features.

## DO NOT

- Modify files not listed above or their contents.
- Add new npm dependencies for this feature.
- Change database schema specifically for this task.
- Delete existing functionality unrelated to the template library.
