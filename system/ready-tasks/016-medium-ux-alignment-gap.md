---
status: ready
priority: 'medium'
score: 41
ref_accuracy: 60
source_plan: 'system/persona-build-plans/olajide-olatunji/task-3.md'
source_persona: 'olajide-olatunji'
exported_at: '2026-04-28T00:46:33.782Z'
---

# Build Task: UX alignment gap

**Source Persona:** olajide-olatunji
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a feature that allows clients to confirm their dietary preferences, kitchen access details, and guest count before the chef begins day-of prep. This will address the #1 client complaint: preference misalignment.

## Files to Modify

- `lib/clients/client-profile-service.ts` -- Add functions to retrieve and update client dietary preferences, kitchen access details, and guest count.
- `components/events/pre-event-checklist-client.tsx` -- Update the pre-event checklist component to include fields for confirming dietary preferences, kitchen access details, and guest count. Integrate with the new functions from `client-profile-service.ts`.

## Files to Create (if any)

- `lib/clients/client-preference-updater.ts` -- A service file that handles updating client preferences in a more centralized manner.

## Implementation Notes

- Ensure seamless integration between the client profile service and the pre-event checklist component.
- Handle edge cases where client data may be missing or invalid.

## Acceptance Criteria

1. Clients can view their dietary preferences, kitchen access details, and guest count on the pre-event checklist page.
2. Clients can easily confirm or update these details before the chef begins day-of prep.
3. The confirmation status is recorded and displayed to show that the client has completed this step.
4. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to this feature.

## DO NOT

- Modify files not listed above (e.g., `lib/interface/surface-completeness.ts`)
- Add new npm dependencies
- Change database schema
- Delete existing functionality
- Use em dashes anywhere
