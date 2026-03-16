# OpenClaw Adoption Report - 2026-03-16

Branch: `feature/openclaw-adoption`
Stash: `stash@{0}` (67 files preserved for future reference)

## Summary

| Category                          | Files  | Action                               |
| --------------------------------- | ------ | ------------------------------------ |
| Already applied (prev session)    | 8      | React fixes preserved in `c58a327e8` |
| SAFE (adopted)                    | 19     | Committed in `b9c25228e`             |
| RISKY (adopted with verification) | 10     | Committed in `238ea0ba7`             |
| DANGEROUS (rejected)              | 13     | Remain in stash only                 |
| RISKY (rejected, missing deps)    | 17     | Remain in stash only                 |
| **Total**                         | **67** |                                      |

---

## Adopted: SAFE (19 files)

**Commit:** `b9c25228e` - React fixes, eslint suppressions, cosmetic

- `app/(chef)/reports/report-results-view.tsx` - ReportData<T> type alias refactor
- `app/(chef)/marketing/templates/template-actions-client.tsx` - deleted -> isDeleted naming
- `app/(partner)/partner/layout.tsx` - data-cf-portal="partner" attribute
- `app/(staff)/layout.tsx` - data-cf-portal="staff" attribute
- `components/community/directory-listing-card.tsx` - eslint no-img-element
- `components/hub/social-feed.tsx` - eslint no-img-element
- `components/quotes/proposal-live-preview.tsx` - eslint no-img-element
- `components/recipes/recipe-cover-flow.tsx` - eslint no-img-element
- `components/recipes/recipe-photo-upload.tsx` - eslint no-img-element
- `components/recipes/recipe-slideshow.tsx` - eslint no-img-element
- `components/recipes/step-photo-gallery.tsx` - eslint no-img-element
- `components/stories/event-story-preview.tsx` - eslint no-img-element
- `components/store/meal-prep-menu-manager.tsx` - useCallback wrapping
- `components/store/meal-prep-order-list.tsx` - useCallback wrapping
- `components/scheduling/recurring-schedules-list.tsx` - useCallback wrapping
- `components/marketing/social-template-library.tsx` - useCallback wrapping
- `components/vendors/vendor-list.tsx` - useCallback wrapping
- `components/vendors/vendor-price-log.tsx` - useCallback wrapping
- `lib/hooks/use-remy-send.ts` - missing deps (closeDrawer, router) added

## Adopted: RISKY with verification (10 files)

**Commit:** `238ea0ba7` - Analytics, mobile UX, copy improvements

- `components/analytics/analytics-identify.tsx` - additive optional `traits` prop
- `app/(admin)/layout.tsx` - AnalyticsIdentify + data-cf-portal="admin"
- `app/(chef)/layout.tsx` - traits pass (entity_id, tenant_id) + data-cf-portal="chef"
- `app/(client)/layout.tsx` - AnalyticsIdentify + traits + data-cf-portal="client"
- `app/(chef)/inquiries/page.tsx` - mobile-responsive tabs, cleaner labels
- `app/(chef)/recipes/recipes-client.tsx` - collapsible mobile "More" actions panel
- `components/navigation/chef-nav.tsx` - "Quick Create" -> "New", "Settings & Tools" -> "Settings"
- `components/queue/queue-item-row.tsx` - context-specific inline action labels
- `app/(public)/contact/_components/contact-form.tsx` - analytics on form submit
- `components/events/event-creation-wizard.tsx` - analytics on event creation

---

## Rejected: DANGEROUS (13 files)

These files have breaking API changes, internal contradictions, or modify core components unsafely.

### Breaking API changes

| File                                       | Risk                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/auth/get-user.ts`                     | Removes `authUserId` and `userId` from AuthUser types. Every caller referencing these fields crashes. The stash itself references `user.authUserId` in onboarding-actions.ts (internal contradiction). |
| `lib/billing/require-pro.ts`               | Changes return from `Promise<AuthUser>` to `Promise<void>`. Any `const user = await requirePro()` gets undefined.                                                                                      |
| `lib/security/url-validation.ts`           | Renames function + changes return type. All callers break.                                                                                                                                             |
| `lib/analytics/posthog.ts`                 | Removes 6 event constants that booking-form.tsx (also in stash) references. Internal contradiction.                                                                                                    |
| `lib/scheduling/protected-time-actions.ts` | Removes `listProtectedBlocks()` export entirely. Callers crash.                                                                                                                                        |

### Core component modifications

| File                                   | Risk                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/button.tsx`             | Adds analyticsName/analyticsProps/analyticsSkipAuto depending on new `lib/analytics/auto-tracking.ts` (doesn't exist). Single point of failure for entire app. |
| `app/layout.tsx`                       | Imports `InteractionTelemetry` from non-existent file. Root layout, affects every page.                                                                        |
| `components/navigation/nav-config.tsx` | Imports from non-existent `lib/navigation/primary-shortcuts.ts`, changes mobile tab routing, rewrites resolution logic.                                        |

### Other dangerous changes

| File                                 | Risk                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `lib/analytics/revenue-engine.ts`    | Adds `'use server'` directive, could break non-serializable exports.            |
| `lib/ai/reactive/hooks.ts`           | Adds `'use server'` directive to existing server-only file.                     |
| `lib/beta/onboarding-actions.ts`     | References `user.authUserId` which get-user.ts removes. Runtime crash.          |
| `lib/payments/milestones.ts`         | Removes null safety fallback (`resolvedTemplate`). Crash if template undefined. |
| `lib/communication/auto-response.ts` | Changes email from React component to plain text. Format regression.            |

## Rejected: RISKY (missing dependencies, 17 files)

These depend on new files that don't exist on the branch, or have UI changes that need broader review.

| File                                                 | Missing Dependency / Issue                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `app/(chef)/settings/page.tsx`                       | Imports from `lib/onboarding/demo-data-actions` (doesn't exist)       |
| `components/onboarding/demo-data-manager.tsx`        | Same missing import                                                   |
| `components/analytics/tracked-link.tsx`              | Depends on `lib/analytics/auto-tracking.ts`                           |
| `components/booking/booking-form.tsx`                | References removed ANALYTICS_EVENTS constants                         |
| `components/hub/circles-inbox.tsx`                   | Depends on `components/hub/hub-controls.tsx`                          |
| `components/hub/circles-page-tabs.tsx`               | Visual redesign needing review                                        |
| `components/hub/hub-availability-grid.tsx`           | Depends on `components/hub/hub-controls.tsx`                          |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Visual redesign needing review                                        |
| `app/auth/signin/page.tsx`                           | Changes auth page React lifecycle                                     |
| `lib/archetypes/presets.ts`                          | Rewrites all archetype nav configs (13 items -> varied per archetype) |
| `lib/archetypes/ui-copy.ts`                          | Removes dependency on registry.ts                                     |
| `lib/follow-up/sequence-engine.ts`                   | Removes `as any` but may expose type errors                           |
| `lib/analytics/menu-engineering.ts`                  | REMOVES export (not adds), breaks importers                           |
| `lib/feedback/surveys.ts`                            | REMOVES export, breaks importers                                      |
| `lib/clients/onboarding.ts`                          | REMOVES export, breaks importers                                      |
| `docs/uptime-history.json`                           | Truncates 4328 lines of data                                          |
| `tsconfig.json`                                      | Adds stale .next-dev paths                                            |

---

## Critical Internal Contradictions Found

1. **posthog.ts removes events that booking-form.tsx adds references to** - compile error if both applied
2. **get-user.ts removes authUserId that onboarding-actions.ts changes TO** - runtime crash if both applied
3. **Three files REMOVE exports** (menu-engineering, surveys, onboarding) that the catalog initially miscategorized as "additive" - caught during per-file review

## Stash Recovery

All 67 files remain in `stash@{0}` for future vetted adoption:

```bash
git stash show "stash@{0}" --stat        # list files
git show "stash@{0}:<filepath>"           # extract single file
```

## Lessons Learned

1. `git diff HEAD "stash@{0}" -- <files> | git apply -` causes stash index leakage on Windows - use `git show "stash@{0}:<file>"` instead
2. CRLF conversion on Windows causes phantom file modifications when extracting from stash - always reset unintended files
3. Per-file review caught 3 export removals that bulk analysis miscategorized as "additive"
