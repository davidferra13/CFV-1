# System Integrity Interrogation - Round 3

> **Purpose:** High-leverage Q&A targeting Stripe payment lifecycle, email delivery pipeline, automation engine, and recipe/ingredient data integrity.
> **Status:** P0 complete, P1 in queue
> **Created:** 2026-04-15
> **Scope:** webhook crash bugs, refund sign mismatch, email delivery gaps, automation loop protection, recipe data pipeline

Each question tagged with failure type, current behavior, gap, and build path.

---

## H. Stripe Payment Lifecycle

### H1. handlePaymentFailed/handlePaymentCanceled/handleDisputeCreated crash on amount_cents: 0

**Failure type:** infinite webhook retry loop
**Current behavior:** All three handlers pass `amount_cents: 0` to `appendLedgerEntryFromWebhook()`. The ledger's guard throws on `amount_cents <= 0`. Handler returns 500. Stripe retries indefinitely. Notifications, emails, and cache invalidation after the throw never execute.
**Files:** `app/api/webhooks/stripe/route.ts:909,1017,1238`, `lib/ledger/append-internal.ts:22`
**Impact:** Every failed payment, cancelled intent, and dispute triggers infinite Stripe retries. Chef never gets notified. Stripe may disable the endpoint after too many 500s.
**Build path:** Remove ledger entries from these audit-trail-only handlers. `logWebhookEvent()` already captures the event. Let notifications and emails run unblocked.
**Priority:** P0 - FIXED

### H2. handleRefund passes positive amount but DB requires negative for is_refund=true

**Failure type:** infinite webhook retry loop
**Current behavior:** `handleRefund` passes `amount_cents: refund.amount` (positive from Stripe) with `is_refund: true`. App-layer guard passes (amount > 0). DB constraint `(is_refund = true AND amount_cents < 0)` rejects it. Insert fails, handler throws 500, Stripe retries indefinitely.
**File:** `app/api/webhooks/stripe/route.ts:1112`, `lib/ledger/append-internal.ts:22`
**Impact:** No Stripe refund ever lands in the ledger. Financial summaries never reflect refunds. Events show wrong payment status after refund.
**Build path:** Negate amount: `-Math.abs(refund.amount)`. Update `appendLedgerEntryInternal` to accept negative amounts when `is_refund: true`.
**Priority:** P0 - FIXED

### H3. No checkout.session.expired handler

**Failure type:** stale event state
**Current behavior:** Checkout sessions expire after 72 hours. Stripe fires `checkout.session.expired`. The webhook handler falls through to the default case ("Unhandled event type"). No cleanup, no notification.
**File:** `app/api/webhooks/stripe/route.ts` (missing handler), `lib/stripe/checkout.ts:148`
**Impact:** Events sit in `accepted` status with dead payment links. Chef doesn't know the link expired. Revenue delayed or lost.
**Build path:** Add `checkout.session.expired` handler that notifies chef and optionally creates a new payment link.
**Priority:** P1

### H4. Offline refunds have no idempotency protection

**Failure type:** double refund
**Current behavior:** Offline refunds insert with `transaction_reference: null`. The UNIQUE index on `transaction_reference` excludes NULLs. Double-click or network retry creates duplicate refund entries.
**File:** `lib/cancellation/refund-actions.ts:197-205`
**Impact:** Ledger shows double the intended refund. Financial reports corrupted.
**Build path:** Generate deterministic `transaction_reference` for offline refunds: `offline_refund_{eventId}_{timestamp}`.
**Priority:** P0

### H5. Overpayment race: two concurrent checkout sessions for same event

**Failure type:** double payment
**Current behavior:** No guard against creating two PaymentIntents for the same event simultaneously. Both see the same outstanding balance. Both can succeed.
**File:** `lib/stripe/actions.ts:82-103`, `lib/stripe/checkout.ts:60-69`
**Impact:** Client pays twice. Overpayment hidden by `GREATEST(..., 0)` view clamp (fixed in R1 B1 migration, but the race still exists).
**Build path:** Before creating PaymentIntent, check for existing active intents on this event. Or use Stripe idempotency keys keyed to `event_id + payment_type`.
**Priority:** P1

### H6. Cancelled events still accept Stripe payments

**Failure type:** payment on cancelled event
**Current behavior:** When event transitions to `cancelled`, no code cancels active Stripe PaymentIntents or Checkout Sessions. Client can still complete payment. `handlePaymentSucceeded` writes ledger entry but transition fails (cancelled is terminal).
**File:** `lib/events/transitions.ts` (cancellation side effects), `app/api/webhooks/stripe/route.ts`
**Impact:** Chef receives payment for cancelled event. No automated refund. Manual Stripe dashboard intervention required.
**Build path:** In cancellation side effects, query for active Stripe sessions/intents and cancel them via Stripe API. Non-blocking.
**Priority:** P1

---

## I. Email Delivery & Notifications

### I1. No retry on transactional email sends

**Failure type:** permanent email loss
**Current behavior:** `sendEmail()` makes a single attempt through circuit breaker. Failure returns `false` and logs. No retry. Email permanently lost.
**File:** `lib/email/send.ts:27-77`
**Impact:** Transient Resend API blip permanently loses payment confirmations, event confirmations, client invitations.
**Build path:** Wrap Resend call with `withRetry({ maxAttempts: 3 })` from `lib/resilience/retry.ts`. Or persist to outbound queue before sending.
**Priority:** P0 - FIXED

### I2. No email suppression list for bounced addresses

**Failure type:** reputation damage + wasted sends
**Current behavior:** Resend bounce webhook updates `campaign_recipients.bounced_at` only. Transactional emails have no tracking record, so bounces for them are silently ignored. System sends to invalid addresses indefinitely.
**File:** `app/api/webhooks/resend/route.ts:90-119`, `lib/email/send.ts`
**Impact:** Repeated sends to dead addresses. Resend API quota burned. Sender reputation degrades. Deliverability drops for all emails.
**Build path:** Create `email_suppression_list` table. Check before every send. Populate from bounce/complaint webhooks (both campaign and transactional).
**Priority:** P0 - FIXED

### I3. createNotification throws on DB failure, breaking non-blocking contract

**Failure type:** cascaded crash
**Current behavior:** `createNotification()` throws `new Error('Failed to create notification')` on DB insert failure. Callers that don't wrap in try/catch crash.
**File:** `lib/notifications/actions.ts:104-107`
**Impact:** DB hiccup during notification creation crashes the parent operation (payment webhook, event transition). The primary operation succeeded but the handler crashes before returning success.
**Build path:** Return `{ success: false, error }` instead of throwing. Or add internal try/catch with console.error.
**Priority:** P0 - FIXED

### I4. Follow-up sequence double-send (no CAS guard)

**Failure type:** duplicate emails
**Current behavior:** `processPendingSend` reads status, checks `!== 'pending'`, sends email, then updates to `'sent'`. No atomic CAS guard. Two overlapping cron runs can both claim the same send.
**File:** `lib/follow-up/sequence-engine.ts:234-306`
**Impact:** Client receives duplicate follow-up emails. Unprofessional. May trigger spam complaints.
**Build path:** Add `.eq('status', 'pending')` to the update query (CAS guard). If zero rows affected, skip.
**Priority:** P0 - FIXED

### I5. routeNotification fire-and-forget gap

**Failure type:** notification channel loss
**Current behavior:** `routeNotification()` called without await (`.catch()` swallows errors). If process crashes between notification insert and delivery completion, email/push/SMS never fires. No record of the gap.
**File:** `lib/notifications/actions.ts:156-166`
**Impact:** Notification shows in-app but email/push/SMS never sent. No detection mechanism.
**Build path:** Cron sweep that finds notifications with no `notification_delivery_log` entries (older than 5 minutes) and re-fires the channel router.
**Priority:** P1

### I6. No Resend message ID stored for transactional emails

**Failure type:** lost bounce correlation
**Current behavior:** `sendEmail()` discards the Resend response data (only checks for error). Message ID thrown away.
**File:** `lib/email/send.ts:53-62`
**Impact:** When a bounce webhook arrives for a transactional email, impossible to correlate to the original send.
**Build path:** Capture and return the Resend message ID. Store it when tracking matters (payment confirmations, invitations).
**Priority:** P1

### I7. Follow-up 'bounced' status conflates send failure with actual bounces

**Failure type:** misleading status
**Current behavior:** When `sendEmail()` returns false (circuit breaker, API error), status set to `'bounced'`. But email was never sent, not bounced.
**File:** `lib/follow-up/sequence-engine.ts:313,320`
**Impact:** Operator sees 'bounced' and assumes bad email. Follow-up never retried.
**Build path:** Use `'failed'` status for send failures. Reserve `'bounced'` for actual bounce webhooks.
**Priority:** P1

---

## J. Recipe & Ingredient Data Pipeline

### J1. Dishes/components on locked menus can be modified/deleted

**Failure type:** menu lock bypass
**Current behavior:** `updateMenu` and `addDishToMenu` check `menu.status === 'locked'` and throw. But `updateDish`, `deleteDish`, `addComponentToDish`, `updateComponent`, `deleteComponent` have NO lock check. The lock is UI-only for these operations.
**Files:** `lib/menus/actions.ts:1098,1128,1191,1235,1264`
**Impact:** Any code path (direct API call, automated action, concurrent UI) can modify or delete dishes/components on a locked menu. The menu a client approved can silently change.
**Build path:** Add lock check to all 5 functions: fetch parent menu status, throw if locked. Add DB trigger on dishes and components for defense-in-depth.
**Priority:** P0

### J2. No UNIQUE constraint on ingredients (tenant_id, name)

**Failure type:** data fragmentation
**Current behavior:** `ingredients` table has a non-unique index on `(tenant_id, name)`. `findOrCreateIngredient` does case-insensitive lookup then creates. Two concurrent requests can both pass the lookup and both insert, creating duplicates.
**Files:** `database/migrations/20260215000004:312`, `lib/recipes/actions.ts:1379`
**Impact:** Duplicate ingredients split cost data (prices updated on one copy, not the other). Shopping list quantities not consolidated. Confusing ingredient picker.
**Build path:** Add unique index: `CREATE UNIQUE INDEX ON ingredients(tenant_id, lower(name))`. Handle conflict in `findOrCreateIngredient`.
**Priority:** P0

### J3. Cost cascade doesn't propagate through sub-recipes

**Failure type:** stale composite recipe costs
**Current behavior:** `propagatePriceChange()` finds recipes that directly use the changed ingredient via `recipe_ingredients`. Does NOT walk `recipe_sub_recipes` to find parent recipes.
**File:** `lib/pricing/cost-refresh-actions.ts:26-35`
**Impact:** "Beef Wellington" uses "Puff Pastry" sub-recipe which uses "flour". When flour price changes, Puff Pastry refreshes but Beef Wellington doesn't. Stale cost on composite recipes.
**Build path:** After identifying affected recipes, recursively query `recipe_sub_recipes` for parent recipes and refresh them too.
**Priority:** P1

### J4. AI-parsed recipe ingredients accept negative/zero quantities

**Failure type:** import failure
**Current behavior:** `ParsedIngredientSchema.quantity` is `z.number().default(1)` with no minimum. Negative or zero quantities pass Zod, then fail on DB constraint `CHECK (quantity > 0)`.
**File:** `lib/ai/parse-recipe-schema.ts:26`
**Impact:** Entire recipe import rolls back with generic error. No hint about which ingredient had invalid quantity.
**Build path:** Add `.positive()` to quantity field in Zod schema.
**Priority:** P0

### J5. compute_recipe_cost_cents recursive CTE has no depth guard

**Failure type:** defense-in-depth gap
**Current behavior:** Uses `WITH RECURSIVE ... UNION ALL` with no depth limit. Cycle prevention trigger exists but if data is corrupted (manual SQL, restored backup), CTE could hit PostgreSQL's max_recursion_depth.
**File:** `database/migrations/20260330000095_cascading_food_costs.sql:58-89`
**Impact:** Corrupt data produces wrong cost silently (truncated at recursion limit). No error raised.
**Build path:** Add `depth` counter to CTE with `WHERE depth < 20`. Or change `UNION ALL` to `UNION`.
**Priority:** P2

---

## Priority Execution Order

### P0 (Fix now - production crashes + data loss)

- **H1** Webhook crash on amount_cents: 0 - FIXED
- **H2** Refund sign mismatch - FIXED
- **H4** Offline refund no idempotency - FIXED
- **I3** createNotification throws (non-blocking violation) - FIXED
- **I4** Follow-up double-send (no CAS guard) - FIXED
- **J1** Menu lock bypass on dish/component CRUD
- **J2** Ingredient unique constraint
- **J4** AI parse recipe negative quantities
- **I1** No retry on transactional email sends
- **I2** No email suppression list

### P1 (Fix next - money + reliability)

- **H3** No checkout.session.expired handler
- **H5** Overpayment race (concurrent checkout)
- **H6** Cancelled events accept payment
- **I5** routeNotification fire-and-forget gap
- **I6** No Resend message ID stored
- **I7** Follow-up 'bounced' status conflation
- **J3** Sub-recipe cost cascade propagation

### P2 (Track)

- Stripe refund doesn't transition event status
- Payment plan installments disconnected from Stripe
- No automation recursion depth guard
- Notifications table unbounded growth
- J5 recursive CTE depth guard
- OpenClaw sync no transaction wrapping
- Cascade batch size unbounded
