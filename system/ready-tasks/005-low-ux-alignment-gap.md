---
status: ready
priority: 'low'
score: 50
ref_accuracy: 100
source_plan: 'system/persona-build-plans/mindy-weiss/task-5.md'
source_persona: 'mindy-weiss'
exported_at: '2026-04-28T00:16:46.984Z'
---

# Build Task: UX alignment gap

**Source Persona:** mindy-weiss
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Improve the user experience for confirming pre-event checklist details with clients before chefs begin day-of prep. Update the "Pre-Event Checklist - client confirms dietary prefs, kitchen access, guest count" component to include a summary view and confirmation button.

## Files to Modify

- `components/events/pre-event-checklist-client.tsx` -- Add a summary section showing key client preferences (dietary restrictions, allergies, dislikes) and a "Confirm Checklist" button to mark the checklist as confirmed by the client.

## Files to Create (if any)

No new files needed for this task.

## Implementation Notes

- Ensure the summary view accurately reflects the latest client preferences stored in `client` prop.
- The "Confirm Checklist" button should update the `event.pre_event_checklist_confirmed_at` timestamp when clicked, indicating the client has reviewed and confirmed their preferences.

## Acceptance Criteria

1. The "Pre-Event Checklist - client confirms dietary prefs, kitchen access, guest count" component now includes a summary view showing the client's dietary restrictions, allergies, and dislikes.
2. A "Confirm Checklist" button is present which, when clicked, marks the pre-event checklist as confirmed by updating `event.pre_event_checklist_confirmed_at`.
3. `npx tsc --noEmit --skipLibCheck` passes without errors in the modified file.

## DO NOT

- Modify any other files besides `components/events/pre-event-checklist-client.tsx`
- Add new npm dependencies
- Change database schema or existing functionality
- Introduce bugs that prevent the TypeScript compiler from passing
