# ECS Gap: Partner Form Submission Feedback

> Source: ECS Scorecard 2026-04-27 | User Type: Partner (86/100) | Dimension: Polish (16/20)

## Problem
No toasts, no success states, no loading spinners on partner portal form submissions (profile save, location change requests).

## Spec
1. Add loading state to profile save button (disabled + spinner while submitting)
2. Add toast.success on profile save completion
3. Add toast.success on location change request submission
4. Add toast.error on any failure
5. Add loading state to change request submit button

## Files
- `app/(partner)/partner/profile/page.tsx`
- `app/(partner)/partner/locations/[id]/page.tsx`

## Pattern
Use `sonner` toast (already used elsewhere). Add `isPending` state via `useTransition`.

## Acceptance
- All form submissions show loading state
- Success toast on completion
- Error toast on failure
- No silent submissions
