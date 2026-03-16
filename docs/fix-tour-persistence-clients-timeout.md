# Fix: Tour Modal Persistence + Clients Page Timeout

**Date:** 2026-03-16
**Branch:** feature/openclaw-adoption

## What Changed

### 1. Tour Welcome Modal Race Condition (tour-provider.tsx)

**Problem:** The "Welcome to ChefFlow" modal reappeared on every full-page navigation. The dismiss action (`markWelcomeSeen`) writes to the database via `startTransition`, but if the user navigates before the write commits, the server re-renders the tour wrapper, reads `welcome_seen_at: null` from the DB, and shows the modal again.

**Fix:** Added localStorage as an immediate client-side fallback:

- On dismiss: `localStorage.setItem('cf-welcome-seen', '1')` fires instantly (no async)
- On init: `useState` checks localStorage if the DB value is missing
- Cleanup: once the server confirms the write (`initialProgress.welcomeSeenAt` is set), localStorage key is removed so `resetTourProgress()` still works

**Edge cases:** SSR guarded with `typeof window`, new devices fall back to DB, tour reset works correctly because the cleanup effect removes localStorage before the reset clears the DB row.

### 2. Clients Page Timeout (clients/page.tsx)

**Problem:** `/clients` took 20+ seconds to load. `ClientsListContent` ran `getClientHealthScores()` (3 DB queries) and `getChurnPreventionTriggers()` (4 DB queries + O(N\*M) in-memory processing) on every page load. The results were passed as `healthMap` and `churnMap` props to `ClientsTable`, but `ClientsTable`'s interface is `{ clients: ClientWithStats[] }`. The props were silently discarded. Seven queries for nothing.

**Fix:** Removed the dead queries and unused imports. Page now only runs `getClientsWithStats()`.

**Note:** `getClientHealthScores` and `getChurnPreventionTriggers` remain in their files for future use. When client intelligence UI is built, bring them back in separate `<Suspense>` boundaries.

## Files Modified

| File                                      | Change                                        |
| ----------------------------------------- | --------------------------------------------- |
| `components/onboarding/tour-provider.tsx` | localStorage fallback for welcome modal state |
| `app/(chef)/clients/page.tsx`             | Removed 7 dead DB queries and unused imports  |
