# Onboarding Improvements (2026-03-09)

## What changed

17 fixes across 10 files, all in a single commit on `feature/risk-gap-closure`.

### Critical fixes

| ID   | Fix                                                                                                 | File                                                            |
| ---- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P0-1 | CSV bulk client import (flexible header matching, semicolon-delimited tags)                         | `client-import-form.tsx`                                        |
| P0-2 | 7 onboarding analytics events added to PostHog                                                      | `posthog.ts`, `onboarding-wizard.tsx`, `archetype-selector.tsx` |
| P0-3 | All chef tour steps now auto-complete on route visit (prevents deadlock when chef already has data) | `tour-config.ts`                                                |
| P0-4 | Tier threshold validation: gold must be > silver, platinum must be > gold                           | `loyalty-setup.tsx`                                             |

### High priority

| ID   | Fix                                                                                     | File                    |
| ---- | --------------------------------------------------------------------------------------- | ----------------------- |
| P1-1 | Color picker reads from `profile.portal_primary_color` instead of hardcoded `#18181b`   | `onboarding-wizard.tsx` |
| P1-2 | Slug suggestions (-chef, -kitchen, -studio, -meals) shown when slug is taken            | `onboarding-wizard.tsx` |
| P1-3 | Removed impossible client tour step (null target, null route that could never complete) | `tour-config.ts`        |
| P1-5 | Dev-mode console warnings when tour `data-tour` selectors don't match any DOM element   | `tour-provider.tsx`     |

### Medium priority

| ID   | Fix                                                                    | File                     |
| ---- | ---------------------------------------------------------------------- | ------------------------ |
| P2-1 | Unsaved changes confirmation on wizard Steps 1 and 2 skip buttons      | `onboarding-wizard.tsx`  |
| P2-2 | `totalPhases` computed dynamically from phases array (was hardcoded 5) | `progress-actions.ts`    |
| P2-3 | "All set" celebration banner when hub reaches 5/5 complete             | `onboarding-hub.tsx`     |
| P2-4 | `loyaltyDone` now requires `is_active = true`, not just row existence  | `progress-actions.ts`    |
| P2-5 | Archetype selector explains it customizes sidebar sections and modules | `archetype-selector.tsx` |

### Low priority

| ID   | Fix                                                                                 | File                     |
| ---- | ----------------------------------------------------------------------------------- | ------------------------ |
| P3-1 | Welcome points tooltip explains "one-time bonus when client creates portal account" | `loyalty-setup.tsx`      |
| P3-3 | Email validation on client import form (regex, beyond browser `type=email`)         | `client-import-form.tsx` |
| a11y | aria-labels on tag remove buttons, file input, select element                       | `client-import-form.tsx` |

## Deferred

- **P3-2: Mobile-specific tour targets** - Tour buttons (like "Create Event") may be behind the hamburger menu on mobile. Needs live testing on small viewports to identify correct selectors.

## Analytics events added

| Event                              | When fired                                                               |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `onboarding_wizard_started`        | Wizard mounts at step 1                                                  |
| `onboarding_wizard_step_completed` | Step saved successfully (with step number and name)                      |
| `onboarding_wizard_step_skipped`   | Skip button clicked (with step number and name)                          |
| `onboarding_wizard_finished`       | `markOnboardingComplete()` succeeds (with destination: hub or dashboard) |
| `onboarding_hub_phase_started`     | (Defined, not yet wired - available for future use)                      |
| `onboarding_hub_phase_completed`   | (Defined, not yet wired - available for future use)                      |
| `onboarding_archetype_selected`    | Archetype confirmed (with archetype ID)                                  |

## CSV import details

- Mode toggle: "Add Manually" (default) / "Import CSV"
- Flexible header matching via regex (name, email, phone, dietary, allergies, events, spent/value/revenue)
- Dietary restrictions and allergies use semicolons as delimiters within CSV cells
- Preview shows parsed rows before import
- Progress indicator during import
- Failed rows are skipped silently (others continue)
- Success message after completion

## How the tour deadlock was fixed

Previously, several chef tour steps had `autoComplete: false` (shortcuts, sidebar, create event, add client, add recipe, meet Remy). If a chef already had clients/recipes/events before encountering the tour, these steps could never be completed.

Fix: All chef tour steps now have `autoComplete: true` with `completionCheck: { type: 'route_visited', value: '/relevant-route' }`. Visiting `/events` completes "Create Your First Event", visiting `/clients` completes "Add a Client", etc. The tour provider's existing auto-complete effect handles this.
