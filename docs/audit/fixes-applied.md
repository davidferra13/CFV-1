# Fixes Applied During Security Audit

> **Date:** 2026-05-14
> **Audit scope:** Routes, server actions, API routes, tenant isolation

## Status: 9 of 16 findings fixed

### Applied Fixes

| ID  | Severity    | File                                  | Fix Applied                                                                                                                                                  |
| --- | ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | CRITICAL    | `lib/themes/actions.ts`               | Added `requireChef()` + tenant ownership check to `setEventShareTheme()` and `setGroupTheme()`                                                               |
| C2  | CRITICAL    | `lib/feedback/surveys-actions.ts`     | Added `requireChef()` + event ownership check to `createPostEventSurvey()` and `sendSurveyEmail()`                                                           |
| C3  | CRITICAL    | `lib/location/account-location.ts`    | All 3 functions now call `requireAuth()` and derive userId from session. Old parameter ignored. `resolveCurrentUserLocation` rewired for anonymous fallback. |
| H1  | HIGH        | `lib/auth/route-policy.ts`            | Added `/client` to `PUBLIC_UNAUTHENTICATED_PATHS`                                                                                                            |
| H2  | HIGH        | `lib/auth/route-policy.ts`            | Added `/intake` to `PUBLIC_UNAUTHENTICATED_PATHS`                                                                                                            |
| H3  | HIGH        | `app/(client)/onboarding/[token]/`    | Moved to `app/(public)/onboarding/[token]/` + added `/onboarding` to `PUBLIC_UNAUTHENTICATED_PATHS`                                                          |
| MH1 | MEDIUM-HIGH | `lib/reviews/actions.ts`              | Added `.eq('client_id', user.entityId)` scoping to `recordGoogleReviewClick()`                                                                               |
| M5  | MEDIUM      | `lib/events/prep-timeline-actions.ts` | Added `verifyEventAccess()` + tenant scoping to `generatePrepTimeline()`                                                                                     |
| M6  | MEDIUM      | `lib/events/prep-timeline-actions.ts` | Added `verifyEventAccess()` to `addPrepTimelineItem()`, consistent with sibling functions                                                                    |

### Verification

| Check                         | Result                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `tsc --noEmit --skipLibCheck` | PASS (exit 0)                                           |
| `test:critical`               | 222/225 pass (3 pre-existing failures, not regressions) |
| `test:unit:auth`              | 55/58 pass (same 3 pre-existing failures)               |

Pre-existing failures (D2, D4, D7) are identical before and after changes. Verified via git stash comparison.

### Remaining (Unfixed)

| ID  | Severity | File                                      | Reason                                            |
| --- | -------- | ----------------------------------------- | ------------------------------------------------- |
| M1  | MEDIUM   | `lib/action-center/digest.ts`             | Needs investigation of recipientId usage patterns |
| M2  | MEDIUM   | `lib/pricing/costing-coverage-actions.ts` | Needs query-level tenant filter audit             |
| M3  | MEDIUM   | `lib/expenses/receipt-actions.ts`         | Needs query-level tenant filter audit             |
| M4  | MEDIUM   | `lib/feedback/user-feedback-actions.ts`   | Needs query-level tenant filter audit             |
| M7  | MEDIUM   | `/api/activity/track`                     | Defense-in-depth (middleware protects today)      |
| M8  | MEDIUM   | `/api/interactions`                       | Defense-in-depth (middleware protects today)      |
| M9  | MEDIUM   | `/api/pie/v1/price/batch`                 | Defense-in-depth (middleware protects today)      |
