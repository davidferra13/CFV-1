# Spec: Onboarding Dismissal Fix

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (12 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code session 2026-03-28

---

## What This Does (Plain English)

Makes every onboarding element in ChefFlow dismissible. Before this fix, new chefs were trapped in an onboarding loop: the layout hard-redirected them to `/onboarding`, the welcome modal had no X button, the setup banner couldn't be dismissed without completing a step, and the reminder banner came back 3 times. After this fix, every onboarding overlay, banner, and redirect can be permanently escaped with a single action.

---

## Why It Matters

Onboarding was so aggressive it was unusable. A chef who wanted to skip setup and explore the app on their own was literally trapped. Six separate onboarding systems stacked on top of each other with inconsistent (or missing) dismissal paths.

---

## Files to Create

None.

---

## Files to Modify

| File                                                  | What Changed                                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/chef/profile-actions.ts`                         | `getOnboardingStatus()` now returns `true` if either `onboarding_completed_at` OR `onboarding_banner_dismissed_at` is set (banner dismissal = opt-out)                                                     |
| `app/(chef)/dashboard/page.tsx`                       | Removed duplicate onboarding redirect (layout gate handles it) and cleaned up unused `redirect`/`createServerClient` imports                                                                               |
| `components/onboarding/onboarding-banner.tsx`         | Dismiss X button always visible (was gated behind `status.completed > 0`)                                                                                                                                  |
| `components/onboarding/onboarding-wizard.tsx`         | Added "Skip setup" button in progress bar; added `handleSkipAll()` that calls both `dismissOnboardingBanner()` and `completeOnboardingWizard()` in parallel via `Promise.all`, then navigates to dashboard |
| `components/onboarding/welcome-modal.tsx`             | Added X close button (top-right), Escape key handler, click-outside-to-dismiss on backdrop                                                                                                                 |
| `components/onboarding/tour-spotlight.tsx`            | Added Escape key handler, click-backdrop-to-dismiss                                                                                                                                                        |
| `components/dashboard/onboarding-reminder-banner.tsx` | Changed `MAX_DISMISSALS` from 3 to 1 (one dismiss = gone forever); added `dismissing` state guard to prevent double-click race                                                                             |
| `components/onboarding/chef-tour-wrapper.tsx`         | Fail closed on DB error: returns "everything dismissed" timestamps instead of empty progress (prevents welcome modal from re-appearing)                                                                    |
| `components/onboarding/client-tour-wrapper.tsx`       | Same fail-closed pattern as chef wrapper                                                                                                                                                                   |
| `components/onboarding/staff-tour-wrapper.tsx`        | Same fail-closed pattern as chef wrapper                                                                                                                                                                   |

---

## Database Changes

None. All columns already exist:

- `chefs.onboarding_completed_at` (timestamptz)
- `chefs.onboarding_banner_dismissed_at` (timestamptz)
- `chefs.onboarding_reminders_dismissed` (int)
- `product_tour_progress.welcome_seen_at` (timestamptz)
- `product_tour_progress.checklist_dismissed_at` (timestamptz)
- `product_tour_progress.tour_dismissed_at` (timestamptz)

---

## Data Model

No changes. The fix reuses existing columns, specifically treating `onboarding_banner_dismissed_at` as an "opt-out" signal that the layout redirect gate now respects.

---

## Server Actions

No new server actions. Existing actions used:

| Action                                    | Auth            | Behavior Change                                                                |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `dismissOnboardingBanner()`               | `requireChef()` | No change; now also acts as opt-out for layout redirect                        |
| `completeOnboardingWizard()`              | `requireChef()` | No change; called alongside banner dismiss in skip-all flow                    |
| `getOnboardingStatus()` (profile-actions) | `requireChef()` | Now checks both `onboarding_completed_at` and `onboarding_banner_dismissed_at` |

---

## UI / Component Spec

### The Six Onboarding Systems (Before vs After)

| System                                        | Before                                               | After                                         |
| --------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Layout redirect** (`layout.tsx`)            | Hard redirect to `/onboarding` if wizard incomplete  | Redirect respects banner dismissal as opt-out |
| **Dashboard redirect** (`dashboard/page.tsx`) | Second redirect checking `onboarding_progress` count | Removed (layout handles it)                   |
| **Welcome Modal**                             | No X button, no Escape, no backdrop click            | X button, Escape, backdrop click all dismiss  |
| **Tour Spotlight**                            | No Escape, no backdrop click                         | Escape and backdrop click both dismiss        |
| **Onboarding Banner**                         | Dismiss button hidden until 1+ steps completed       | Always visible                                |
| **Reminder Banner**                           | Returns 3 times after dismissal                      | Gone permanently after 1 dismiss              |

### Onboarding Wizard - New "Skip setup" Button

- Location: top-right of the progress bar, next to "X% complete"
- Style: `text-xs text-muted-foreground underline` (subtle, not prominent)
- Behavior: calls `dismissOnboardingBanner()` + `completeOnboardingWizard()` in parallel, then navigates to `/dashboard`

### Tour Wrapper Fail-Closed Behavior

When `getTourProgress()` throws (DB down, auth error):

- **Before:** Returned empty progress, causing welcome modal to re-appear
- **After:** Returns timestamps for all dismissal fields, suppressing all overlays. Logs the error to console.

---

## Edge Cases and Error Handling

| Scenario                                             | Correct Behavior                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Chef clicks "Skip setup" but one server action fails | Navigate to dashboard anyway (partial state is better than being stuck) |
| DB is down when tour wrapper loads                   | Fail closed: all overlays suppressed, error logged                      |
| Double-click on reminder dismiss button              | `dismissing` guard prevents second server action call                   |
| Chef dismisses banner, returns later                 | Layout gate sees `onboarding_banner_dismissed_at`, no redirect          |
| Chef presses Escape on welcome modal                 | `markWelcomeSeen()` called, modal dismissed permanently                 |
| Chef clicks backdrop behind spotlight                | `stopTour()` called, tour dismissed permanently                         |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/dashboard` - verify no onboarding redirect, no modal, no checklist
3. Navigate to `/onboarding` - verify "Skip setup" button renders in progress bar
4. For fresh user testing: reset onboarding state in DB, then verify:
   - Welcome modal shows X button (top-right)
   - Pressing Escape closes welcome modal
   - Clicking dark backdrop closes welcome modal
   - Onboarding banner has dismiss X always visible
   - Clicking "Skip setup" on wizard navigates to dashboard
   - Returning to app after skip: no redirect to onboarding

---

## Out of Scope

- Client portal onboarding form has no skip option (separate concern, different flow)
- Remy privacy wizard re-show on revisit (separate component, not part of main onboarding)
- Overlay queue stuck-overlay garbage collection (infrastructure concern, not onboarding-specific)
- `sessionStorage` key centralization for `onboarding_gmail_step` (minor cleanup, not blocking)

---

## Notes for Builder Agent

This spec is already built and shipped (two commits on `main`). It documents what was done for future reference. Key architectural decision: treating `onboarding_banner_dismissed_at` as the canonical "user opted out of onboarding" signal, checked by the layout gate alongside `onboarding_completed_at`. This avoids adding a new column or flag.
