# Session Digest: April 16 Dinner Service Stress Test

**Date:** 2026-04-15
**Agent:** Builder (Opus)
**Task:** Stress-test every path a real chef uses during a dinner service; fix all failure points
**Status:** completed
**Build state:** green (tsc 0 errors, 84/84 FSM tests pass, 35/35 ledger tests pass)

## What Changed

### 1. Financial View Cartesian Product Fix

- **File:** `database/migrations/20260415000015_fix_financial_view_cartesian_product.sql`
- **Bug:** LEFT JOIN ledger_entries x LEFT JOIN expenses produced N\*M rows, inflating `total_paid_cents` by 2x on events with both ledger entries and expenses
- **Proof:** Events f3be (3 ledger x 2 expenses = 2x inflation) and b419 (2 ledger x 2 expenses = 2x inflation)
- **Fix:** Scalar correlated subqueries in SELECT (only pattern PostgreSQL won't flatten back into joins)
- **Verified:** All 7 test rows match ground truth after fix

### 2. FSM Offline Workflow Permissions

- **Files:** `lib/events/fsm.ts`, `lib/events/transitions.ts`
- **Problem:** Chef couldn't accept on behalf of client (verbal confirmation) or mark events paid offline (cash/Venmo/Zelle)
- **Fix:** Added chef to actor permissions for proposed->accepted, accepted->paid, draft->paid
- **New functions:** `acceptOnBehalf()`, `markEventPaid()` in transitions.ts
- **UI:** Added "Accept on Behalf" and "Mark Paid (Offline)" buttons in `components/events/event-transitions.tsx`

### 3. createEvent Cache Invalidation

- **File:** `lib/events/actions.ts` (line 216-218)
- **Bug:** Dashboard and client portal didn't refresh after event creation (only `/events` was revalidated)
- **Fix:** Added `revalidatePath('/dashboard')` and `revalidatePath('/my-events')`

### 4. Self-Hosted Cron Ticker (HIGHEST LEVERAGE)

- **New file:** `lib/cron/ticker.ts`
- **Modified:** `instrumentation.ts`
- **Problem:** 40 scheduled cron jobs were defined in `lib/cron/definitions.ts` with endpoints in `app/api/scheduled/` and `app/api/cron/`, but NOTHING was calling them. Event reminders, inquiry expiry, morning briefings, daily reports, and 30+ other automations were completely dormant.
- **Fix:** Built a self-hosted cron ticker that runs inside the Next.js process. Checks every 60s which jobs are due, fires them with CRON_SECRET auth, staggers daily jobs on startup.

## What Was Verified (No Fix Needed)

| Area                    | Result                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| Menu-less events        | UI shows graceful empty states, no crashes                           |
| DOP mobile view         | Handles missing schedule/serve time gracefully                       |
| Pre-service checklist   | Deterministic generation, safety items first, handles all-empty case |
| Shopping list           | Clear error message when no menu/recipes linked                      |
| ICS calendar generation | Pure function, defaults 6-10PM, proper timezone handling             |
| Close-out wizard        | Reads rebuilt financial view correctly, all types match              |
| Client portal           | Full lifecycle (accept, pay, cancel, countdown, feedback)            |
| Expense tracking        | Full CRUD + receipt upload, tenant-scoped                            |
| AAR system              | Works manually or via AI, properly handles Ollama offline            |

## Config Required for Full Email Functionality

```env
# In .env.local
NOTIFICATIONS_OUTBOUND_ENABLED=true
RESEND_API_KEY=<your key>
```

Without these, notifications route to in-app only (SSE). Transitions and core functionality still work.

## Decisions Made

1. Scalar correlated subqueries over CTEs/LATERAL/derived subqueries for the financial view (PostgreSQL flattens all other patterns)
2. Chef can accept on behalf of client and mark paid offline (real-world workflow requirement)
3. Self-hosted cron ticker over external scheduler (matches self-hosted architecture, $0 cost)
4. Daily/6h jobs fire on startup to catch up after restarts

## Files Touched

- `database/migrations/20260415000015_fix_financial_view_cartesian_product.sql` (new)
- `lib/cron/ticker.ts` (new)
- `lib/events/fsm.ts` (modified - permissions)
- `lib/events/transitions.ts` (modified - permissions, new functions, /finance revalidation)
- `lib/events/actions.ts` (modified - cache invalidation)
- `lib/ledger/append.ts` (modified - revalidatePath after ledger writes)
- `lib/dashboard/actions.ts` (modified - .gt -> .gte for today's events)
- `lib/profile/actions.ts` (modified - booking_base_price_cents in return)
- `lib/notifications/types.ts` (modified - 3 new action types + NOTIFICATION_CONFIG)
- `lib/notifications/tier-config.ts` (modified - 3 new tier entries)
- `components/events/event-transitions.tsx` (modified - new buttons + help text)
- `instrumentation.ts` (modified - cron ticker startup)
- `tests/unit/events.fsm.test.ts` (modified - new test cases)

### 5. Cron Ticker Port Fix (L4)

- **File:** `lib/cron/ticker.ts`
- **Bug:** Default port was '3000' but dev server runs on 3100
- **Fix:** Changed default to `PORT || '3100'` matching `instrumentation.ts` pattern

### 6. markEventPaid Ledger Entry Missing (L4)

- **File:** `lib/events/transitions.ts`
- **Bug:** `markEventPaid` transitioned status to 'paid' without writing a ledger entry, so financial view showed $0 paid
- **Fix:** Added `appendLedgerEntryInternal` call BEFORE status transition with deterministic idempotency key

### 7. Stale Cache After Ledger Writes (L4)

- **File:** `lib/ledger/append.ts`
- **Bug:** `appendLedgerEntryForChef` and `createAdjustment` wrote to ledger but never called `revalidatePath`, so financial data was stale until page refresh
- **Fix:** Added `revalidatePath` for `/events/{id}`, `/events`, `/dashboard`, `/finance` after both functions

### 8. Dashboard "Next Upcoming Event" Hides Today's Events (L5)

- **File:** `lib/dashboard/actions.ts` (line 411)
- **Bug:** `getNextUpcomingEvent` used `.gt('event_date', today)` (strictly greater than), hiding today's events
- **Fix:** Changed to `.gte('event_date', today)` so day-of events show in dashboard

### 9. Missing Notification Action Types (L6)

- **Files:** `lib/notifications/types.ts`, `lib/notifications/tier-config.ts`
- **Bug:** `payment_amount_mismatch`, `cancellation_pending_refund`, `full_refund_active_event` not in NotificationAction union, causing tsc errors
- **Fix:** Added all three to type union, NOTIFICATION_CONFIG, and DEFAULT_TIER_MAP

### 10. Transition Revalidation Missing /finance (L6)

- **File:** `lib/events/transitions.ts`
- **Bug:** `transitionEvent` revalidated events/dashboard/my-events but not /finance, leaving financial pages stale after status changes
- **Fix:** Added `revalidatePath('/finance')` to both success and race-lost paths

### 11. Public Chef Profile Missing booking_base_price_cents (L6)

- **File:** `lib/profile/actions.ts`
- **Bug:** Column selected from DB (line 130) but never included in return object, causing tsc error on public chef page
- **Fix:** Added `booking_base_price_cents: chef.booking_base_price_cents ?? null` to return

## What Was Verified (No Fix Needed) - L4-L7

| Area                                     | Result                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Event progression cron safety            | CAS guard, systemTransition, error per-event not batch                     |
| CAS guard race protection                | transition_event_atomic checks p_from_status matches current               |
| Client notification after acceptOnBehalf | transitionEvent fires all notifications for all transitions                |
| Transition email gating                  | sendEmail checks RESEND_API_KEY, returns false if missing                  |
| Dashboard date query for tomorrow        | \_liso() server-side, self-hosted = no TZ mismatch                         |
| Event date timezone handling             | DATE column, no toISOString(), single-user self-hosted                     |
| Cron stampede protection                 | lastRun set at fire time, 90% jitter guard, independent fire-and-forget    |
| Stripe webhook payment flow              | UUID validation, ownership check, idempotent ledger, amount reconciliation |
| Client portal accept/pay flow            | ConfirmModal, try/catch, error display, redirect to pay                    |
| Shopping list date window                | Defaults today+14d, tomorrow included                                      |
| Close-out wizard                         | Dynamic import, loading state, completed-only gate                         |
| markEventPaid no-price guard             | Throws if no quoted_price and no amount provided                           |
| Financial view column consistency        | All column names match between view and actions                            |
| Receipt upload                           | Auth-gated, tenant-scoped, type/size validation                            |
| Refund actions                           | Proper error propagation, not fake success                                 |
| Circle notifications                     | Fire for confirmed, completed, accepted, paid, in_progress                 |
| Event progression confirmed->in_progress | Fires via transitionEvent, client gets notified                            |
| Event progression in_progress->completed | Handles null departure_time (falls back to next day)                       |
| Silent catch blocks in events            | All return proper error objects, not fake success                          |

## Next Agent Notes

- The cron ticker fires on both dev and prod servers. Port is derived from `process.env.PORT` (3000 prod, 3100 dev).
- If CRON_SECRET is not set, ticker silently disables (logged warning).
- The financial view fix uses DROP+CREATE (not CREATE OR REPLACE) because column sources changed.
