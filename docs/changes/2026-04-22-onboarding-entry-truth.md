# Onboarding Entry Truth

## What changed

- Added `lib/onboarding/completion-state.ts` as the single owner for onboarding completion truth.
- Updated `app/(chef)/onboarding/page.tsx` so `/onboarding` only shows the post-wizard hub after `onboarding_completed_at` is set.
- Updated `lib/chef/profile-actions.ts` so "onboarding complete" no longer treats a dismissed dashboard banner as equivalent to completed setup.
- Added `tests/unit/onboarding-completion-state.test.ts` to lock the regression.

## Why

The previous behavior let a chef dismiss the dashboard setup banner and then get treated as if the onboarding wizard had been completed. That breaks activation truth: hiding a reminder is not the same thing as finishing setup.

## Verification

- `node --test --import tsx tests/unit/onboarding-completion-state.test.ts`
