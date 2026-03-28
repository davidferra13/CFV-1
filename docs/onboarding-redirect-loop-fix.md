# Onboarding Redirect Loop Fix

**Date:** 2026-03-28
**Scope:** 7 files, 0 migrations

## What Changed

The onboarding wizard was trapping users in a redirect loop. Every time a chef navigated to any page, the layout gate silently redirected them back to `/onboarding` with zero explanation. This happened because `finishWizard()` was fire-and-forget: it showed "You're all set!" but never verified the DB write succeeded. If it failed, `onboarding_completed_at` stayed NULL and the redirect triggered again on the next page load.

## Root Causes Fixed

1. **`finishWizard()` was fire-and-forget.** Now awaits the DB write with a retry (2 attempts). Only shows the completion screen after persistence succeeds.

2. **`handleSkipAll()` didn't verify writes.** Now tries both `dismissOnboardingBanner()` and `completeOnboardingWizard()` in parallel, falls back to individual calls if parallel fails. Always navigates to dashboard regardless.

3. **`getOnboardingStatus()` returned `false` on null data.** If the chef row was missing or the query returned null, it trapped the user. Now fails open (returns `true`).

4. **Silent redirect with zero context.** Changed `redirect('/onboarding')` to `redirect('/onboarding?reason=setup_required')`. The wizard shows a blue info banner: "Complete your profile setup (or skip it) to access ChefFlow."

5. **No escape from the gate.** Added `/settings` exemption to the onboarding gate (matching the archetype gate pattern already in the layout).

## Blind Spots Also Fixed

6. **Two `getOnboardingStatus()` functions with different signatures.** The version in `onboarding-actions.ts` (returns an object) was renamed to `getOnboardingProgressSummary()` to avoid import confusion with the boolean version in `profile-actions.ts`.

7. **`/onboarding` page only checked `onboarding_completed_at`.** A user who dismissed the banner (skipped setup) could see the wizard again if they manually visited `/onboarding`. Now checks both `onboarding_completed_at` and `onboarding_banner_dismissed_at`.

## Files Modified

| File                                                  | Change                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/chef/profile-actions.ts`                         | `getOnboardingStatus()`: fail open on null data                            |
| `app/(chef)/layout.tsx`                               | `/settings` exemption + `?reason=setup_required` redirect                  |
| `components/onboarding/onboarding-wizard.tsx`         | Await + verify `finishWizard()`, harden `handleSkipAll()`, reason banner   |
| `lib/onboarding/onboarding-actions.ts`                | Renamed `getOnboardingStatus()` to `getOnboardingProgressSummary()`        |
| `app/(chef)/onboarding/page.tsx`                      | Check `onboarding_banner_dismissed_at` alongside `onboarding_completed_at` |
| `components/onboarding/onboarding-banner.tsx`         | Updated import for renamed function                                        |
| `components/dashboard/onboarding-reminder-banner.tsx` | Updated import for renamed function                                        |

## Verification

- `entityId` vs `tenantId`: Verified identical for chef users (line 97 of `get-user.ts`)
- Cache staleness: `getOnboardingStatus()` is NOT cached. `revalidatePath` calls in mutations bust the route cache.
- `.single()` behavior: Returns `{ data: null }` on no rows. Fail-open handles this.
- All prerequisites (tables, columns, migrations) verified in place.
