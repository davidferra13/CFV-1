---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/julia/task-1.md'
source_persona: 'julia'
exported_at: '2026-04-28T01:23:33.883Z'
---
# Build Task: Develop "Prep Mode" UI:
**Source Persona:** julia
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement a new UI mode called "Prep Mode" for chefs. This mode will be accessible via a toggle switch on the admin feature flags page and will provide a simplified, focused interface specifically designed for preparing events. The goal is to streamline the event preparation process by hiding unnecessary details and providing quick access to essential tools.

## Files to Modify
- `app/(admin)/admin/flags/page.tsx` -- Add a new toggle switch for "Prep Mode" feature flag on the existing admin flags page. Update the UI to include a button that, when clicked, toggles into Prep Mode.

## Files to Create (if any)
- `app/(chef)/(new-file-path)/prep-mode-page.tsx` -- This file will contain the implementation of the Prep Mode interface, which includes a simplified event creation form and quick access buttons for essential tools like DOP (Day-Of Protocol), Close-Out Wizard, and Event Review.

## Implementation Notes
- Use Tailwind CSS classes to create a clean, minimalistic design for the Prep Mode interface.
- Implement a toggle switch using React hooks and state management to track whether the chef is in Prep Mode or not.
- Hide unnecessary details and buttons when in Prep Mode, while still providing access to all essential features.

## Acceptance Criteria
1. The "Prep Mode" feature flag can be toggled on and off via the admin feature flags page.
2. Toggling into Prep Mode hides unnecessary details and provides a simplified interface for event preparation.
3. Essential tools like DOP, Close-Out Wizard, and Event Review are easily accessible in Prep Mode.
4. The overall design of the Prep Mode interface is clean, minimalistic, and easy to navigate.
5. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the implementation of this feature.

## DO NOT
- Modify files not listed above or in the "Files to Modify" section.
- Add new npm dependencies for this specific feature.
- Change database schema or make changes that would affect the existing functionality outside of the Prep Mode interface.