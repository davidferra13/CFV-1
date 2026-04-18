# System Integrity Question Set: Client Portal

> 40 questions across 10 domains. Covers every client-facing surface, action, and cross-system connection.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                                                      | Answer                                                                                                                                                                                    | Status |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Does every `app/(client)/**` page call `requireClient()` or delegate to a function that does? | Yes. All 36 client pages verified. Each calls `requireClient()` directly. Exception: `onboarding/[token]` uses token-based access (correct, pre-auth flow).                               | BUILT  |
| 2   | Does the client layout redirect to signin on auth failure?                                    | Yes. `app/(client)/layout.tsx` wraps `requireClient()` in try/catch and redirects to `/auth/signin?portal=client` on failure.                                                             | BUILT  |
| 3   | Can a chef-role user access client portal pages?                                              | No. `requireClient()` checks `user.role === 'client'` and throws if not. Chef users get redirected to signin by the layout catch.                                                         | BUILT  |
| 4   | Does the onboarding token page correctly bypass auth (token-based access)?                    | Yes. `onboarding/[token]/page.tsx` uses `getOnboardingData(token)` (no `requireClient()`). Token validated against DB. Shows "Link Expired" for invalid tokens, "All Set!" for completed. | BUILT  |

## Domain 2: IDOR Prevention (Client Data Isolation)

| #   | Question                                                                        | Answer                                                                                                                                                                                                              | Status |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Do all `[id]`-parameterized event pages filter by `client_id` from session?     | Yes. All 12 event sub-pages use `getClientEventById()` which filters `.eq('client_id', user.entityId)`. Verified: pay, proposal, contract, invoice, countdown, approve-menu, choose-menu, pre-event-checklist, etc. | BUILT  |
| 6   | Does the invoice PDF API route scope to the requesting client's data?           | Yes. `/api/documents/invoice-pdf/[eventId]/route.ts` checks role, delegates to `getInvoiceDataForClient()` for clients (which filters by `client_id`).                                                              | BUILT  |
| 7   | Does the contract signing page verify `client_id` ownership?                    | Yes. `getClientEventContract()` filters `.eq('client_id', user.entityId)`. Returns null if not owned.                                                                                                               | BUILT  |
| 8   | Does the chat system verify conversation participation before showing messages? | Yes. `getConversation()` double-checks: RLS + explicit participation query `.eq('auth_user_id', user.id)` on `conversation_participants`.                                                                           | BUILT  |
| 9   | Can a client see another client's quotes via `/my-quotes/[id]`?                 | No. `getClientQuoteById()` filters `.eq('client_id', user.entityId)`. Returns null for non-owned quotes.                                                                                                            | BUILT  |
| 10  | Does the payment plan page filter by `client_id`?                               | Yes. Fixed earlier this session. `payment-plan/page.tsx` now uses `const user = await requireClient()` and filters `.eq('client_id', user.entityId)`.                                                               | BUILT  |

## Domain 3: Event Lifecycle from Client Perspective

| #   | Question                                                                             | Answer                                                                                                                                                                                                     | Status |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 11  | Are draft events hidden from the client portal?                                      | Yes. `getClientEvents()` filters `.not('status', 'eq', 'draft')`. `getClientEventById()` also excludes drafts. Client never sees chef WIP.                                                                 | BUILT  |
| 12  | Can the client accept a proposal and does it transition the event correctly?         | Yes. `proposal/page.tsx` shows contract + accept/decline. Acceptance calls the proposal acceptance flow which transitions event `proposed -> accepted`.                                                    | BUILT  |
| 13  | Does the contract signing flow record view, capture signature, and transition state? | Yes. `contract/page.tsx` calls `recordClientView()` on load (for `sent` status). Signing calls `signContract()` which transitions `viewed -> signed` and creates audit trail.                              | BUILT  |
| 14  | Does the payment page handle deposit vs. full balance correctly?                     | Yes. `pay/page.tsx` checks `hasDeposit && totalPaidCents === 0` to show deposit amount, otherwise shows full outstanding balance. Guard: redirects if `paymentAmount <= 0` or event not in payable status. | BUILT  |
| 15  | Does the pre-event checklist only show for appropriate event statuses?               | Yes. `pre-event-checklist/page.tsx` checks `['confirmed', 'paid', 'in_progress'].includes(event.status)` and redirects otherwise.                                                                          | BUILT  |

## Domain 4: Financial Accuracy for Clients

| #   | Question                                                                           | Answer                                                                                                                                                                   | Status |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 16  | Does the client spending summary derive from ledger entries (not stored balances)? | Yes. `getClientSpendingSummary()` in `spending-actions.ts` reads from `event_financial_summary` view (computed from `ledger_entries`). No stored balance columns.        | BUILT  |
| 17  | Does the invoice show the same total as the event financial summary?               | Yes. `getInvoiceDataForClient()` reads `quoted_price_cents` from event and `total_paid_cents` from financial summary view. Same source as event detail page.             | BUILT  |
| 18  | Does the payment page show correct outstanding balance after partial payments?     | Yes. Uses `financial.outstandingBalanceCents` from `event_financial_summary` view. Re-fetched on page load. Shows "Already Paid" line when `totalPaidCents > 0`.         | BUILT  |
| 19  | Are offline payments (recorded by chef) visible to the client?                     | Yes. Offline payments go to `ledger_entries`. Client sees them via `event_financial_summary` view. Receipt email is sent (fixed this session to also bust `/dashboard`). | BUILT  |

## Domain 5: Notifications & Communication

| #   | Question                                                                      | Answer                                                                                                                                                                                                               | Status |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 20  | Does the client receive notifications for all relevant lifecycle transitions? | Yes. Email templates cover: proposal sent, event confirmed, payment confirmation/reminder/failed, 2d/14d/30d reminders, event starting/completed/cancelled, quote sent, plus `awaiting_client` (fixed this session). | BUILT  |
| 21  | Do notification action URLs point to pages that exist and load for clients?   | Yes. Action URLs use `/my-inquiries/${id}`, `/my-events/${id}`, `/my-quotes/${id}` patterns. All verified to exist and load with `requireClient()` + IDOR protection.                                                | BUILT  |
| 22  | Does the client get notified when a new quote is sent?                        | Yes. Quote transition to `sent` status triggers email via `sendQuoteReadyEmail()`. In-app notification also created with action URL to `/my-quotes/${quoteId}`.                                                      | BUILT  |
| 23  | Does the client hub (Dinner Circle) show unread counts accurately?            | Yes. `getHubTotalUnreadCount()` counts unread messages across all groups. Shown on dashboard hub widget and sidebar badge. SSE updates for real-time.                                                                | BUILT  |

## Domain 6: Error Handling & Edge Cases

| #   | Question                                                        | Answer                                                                                                                                                                                              | Status |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 24  | Do client error boundaries hide raw error messages?             | Yes. Fixed earlier this session. `app/(client)/error.tsx` shows only `error.digest` (opaque ID). `my-events/[id]/error.tsx` shows static message. No stack traces or SQL leaked.                    | BUILT  |
| 25  | Does every `[id]` page handle `null` results with `notFound()`? | Yes. All 12 `[id]` pages check for null/missing data and call `notFound()` or `redirect()`. No raw error renders for missing resources.                                                             | BUILT  |
| 26  | Does the client portal handle expired quotes gracefully?        | Yes. `acceptQuote()` checks `valid_until` date and throws "This quote has expired" if past. Client sees clear error, not silent failure.                                                            | BUILT  |
| 27  | Does the delete-account flow use soft-delete with grace period? | Yes. `requestAccountDeletion()` sets `deletion_requested_at` + 30-day `deletion_scheduled_at`. Reversible within grace period via `cancelAccountDeletion()`. Hard-delete only after scheduled date. | BUILT  |

## Domain 7: Client Profile & Preferences

| #   | Question                                                                | Answer                                                                                                                                                                                              | Status |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 28  | Can the client update their dietary restrictions and do they propagate? | Yes. Client profile updates go through `updateClientProfile()`. Dietary changes now propagate to active events (fixed this session in `updateClient()`). Prep sheet merges all sources.             | BUILT  |
| 29  | Does the client dashboard respect widget visibility preferences?        | Yes. `getClientDashboardPreferences()` reads from `client_preferences.dashboard_widgets`. `sanitizeClientDashboardWidgets()` validates against `CLIENT_DASHBOARD_WIDGET_IDS` enum.                  | BUILT  |
| 30  | Does the profile completion percentage calculate accurately?            | Yes. `getMyProfile()` counts completed fields from a predefined list. Returns `completedFields / totalFields * 100`. Shown on dashboard profile widget.                                             | BUILT  |
| 31  | Does the "book again" flow pre-fill from last completed event?          | Yes. `getClientLastEventPrefill()` queries most recent completed event for this client. Returns occasion, guest count, dietary restrictions, location. `RepeatClientPanel` shown on inquiry detail. | BUILT  |

## Domain 8: Menu & Menu Approval

| #   | Question                                                           | Answer                                                                                                                                                                | Status |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 32  | Can the client view menus for their events?                        | Yes. `getClientEventById()` fetches menus via `event_menus` join. Menu data included in event detail page. Separate `approve-menu` and `choose-menu` sub-pages exist. | BUILT  |
| 33  | Does menu approval update the event record and notify the chef?    | Yes. `approveMenu()` in `menu-approval-actions.ts` sets `menu_approval_status` on event, creates notification for chef, logs activity.                                | BUILT  |
| 34  | Does the "choose menu" page show only menus linked to their event? | Yes. `choose-menu/page.tsx` calls `getClientEventById()` (client-scoped) and uses the event's linked menus. Cannot access menus from other events.                    | BUILT  |

## Domain 9: Loyalty & Rewards

| #   | Question                                                           | Answer                                                                                                                                                                              | Status |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 35  | Does the loyalty dashboard show accurate point balance?            | Yes. `getMyLoyaltyStatus()` reads from `client_loyalty_accounts` table. Points computed from transaction history. Dashboard widget shows tier, points, and progress.                | BUILT  |
| 36  | Can the client redeem rewards and does it deduct points correctly? | Yes. `redeemReward()` in `redemption-actions.ts` checks balance, deducts points, creates redemption record. Atomic: fails if insufficient balance.                                  | BUILT  |
| 37  | Are loyalty points awarded on event completion?                    | Yes. `runCompletedEventPostProcessing()` calls `awardEventPoints()` or `awardLiteVisit()` depending on `program_mode`. `quote_accepted` trigger also fires during quote acceptance. | BUILT  |

## Domain 10: Cache & Data Freshness

| #   | Question                                                                   | Answer                                                                                                                                                             | Status |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 38  | When a chef updates event details, does the client portal reflect changes? | Yes. Chef event updates call `revalidatePath('/my-events/${eventId}')` (client-facing path). Client sees fresh data on next page load.                             | BUILT  |
| 39  | When a client accepts a quote, are chef-side caches busted?                | Yes. `acceptQuote()` revalidates `/quotes`, `/quotes/${id}`, `/inquiries/${id}`, `/inquiries`, `/events/${id}`, `/events`, plus `/dashboard` (fixed this session). | BUILT  |
| 40  | Does the client dashboard show real-time data or stale cache?              | Real-time. `getClientDashboardData()` fetches all data server-side on each page load. No `unstable_cache` wrapping. SSE provides real-time notification updates.   | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

None.

**Sweep score: 40/40 BUILT, 0 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 36 pages auth-gated, all 12 `[id]` pages IDOR-protected, error boundaries sanitized, financial data derived from ledger, dietary data propagated, cache invalidation comprehensive.

**Key fixes from this and prior session that contributed:**

- Q10: IDOR fix on payment-plan page (`.eq('client_id', user.entityId)`)
- Q24: Error message leakage fixed (opaque digest only)
- Q28: `awaiting_client` notification added
- Q19-21: Dietary propagation to active events + prep sheet merge
- Q14/27: Dashboard cache busting on offline payments
