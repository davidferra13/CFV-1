# System Integrity Interrogation

> **Purpose:** High-leverage Q&A exposing every failure point across the event lifecycle, financial pipeline, client surfaces, and data integrity boundaries.
> **Status:** P0 complete, P1 in queue
> **Round 2:** `docs/specs/system-integrity-interrogation-r2.md` (auth, inquiry, pricing)
> **Created:** 2026-04-15
> **Scope:** event FSM, ledger, Stripe integration, hub/notifications, cascade safety, soft-delete consistency

Each question tagged with failure type, current behavior, gap, and build path.

---

## A. Event Lifecycle & FSM

### A1. Race-lost transitions return success:true with zero side effects

**Failure type:** silent financial discrepancy
**Current behavior:** `transitionEvent()` calls `transition_event_atomic()` RPC with CAS guard. If concurrent request wins, the loser re-fetches event, sees status already changed, logs a warning, and returns `{ success: true }`. Zero side effects fire: no emails, no notifications, no cache bust, no activity log.
**File:** `lib/events/transitions.ts:266-278`
**Impact:** Stripe webhook triggers `paid` transition. If a concurrent request wins the race, client never gets payment confirmation email. Chef never gets notified. Dashboard shows stale status until cache expires.
**Build path:** On race loss, re-evaluate whether side effects are still needed (they may have been run by the winner). If winner's side effects also failed, schedule a retry. At minimum, fire cache invalidation on race loss.
**Priority:** P0

### A2. No cache invalidation in transitionEvent()

**Failure type:** stale financial UI
**Current behavior:** `transitionEvent()` runs 15+ side effects but never calls `revalidatePath()` or `revalidateTag()`. The Stripe webhook handler has 7 revalidation calls. The main FSM has zero.
**File:** `lib/events/transitions.ts` (missing entirely)
**Impact:** After any non-Stripe transition (chef confirms, chef marks in_progress, chef completes), dashboard/event pages serve stale data for up to 60 seconds.
**Build path:** Add `revalidatePath('/events')`, `revalidatePath('/events/${eventId}')`, `revalidatePath('/dashboard')` after successful transition.
**Priority:** P0

### A3. financial_reconciled gate is always pending (soft gate)

**Failure type:** incomplete event completion
**Current behavior:** Readiness gate `financial_reconciled` for `in_progress -> completed` always returns `status: 'pending'` with `isHardBlock: false`. Chef must manually override. No automated check that outstanding balance is zero.
**File:** `lib/events/readiness.ts:256-265`
**Impact:** Events complete with outstanding balance. Financial reports show completed events with money still owed.
**Build path:** Query `event_financial_summary.outstanding_balance_cents` for the event. If > 0, set `isHardBlock: false` but change status to `'action_needed'` with description showing the balance. If = 0, auto-resolve to `'passed'`.
**Priority:** P1

### A4. Owner check only on draft -> proposed

**Failure type:** authorization gap
**Current behavior:** `transitionEvent()` checks `event.created_by !== user.id` only when `fromStatus === 'draft'`. All other transitions trust tenant isolation alone.
**File:** `lib/events/transitions.ts:179`
**Impact:** In multi-user tenant scenarios (staff), any staff member with chef role can transition any event. Currently single-user tenants, so low risk. Becomes high risk if staff features expand.
**Build path:** Document as intentional for V1 single-chef model. Add TODO for multi-staff authorization.
**Priority:** P3

---

## B. Financial Pipeline & Ledger

### B1. Overpayment information lost in event_financial_summary view

**Failure type:** silent data loss
**Current behavior:** `outstanding_balance_cents = GREATEST(quoted_price - total_paid, 0)`. If client overpays, balance clamps to 0 instead of going negative. Chef cannot see overage.
**File:** `database/migrations/20260410000001_fix_event_financial_summary_view.sql`
**Impact:** Client pays $1,200 on a $1,000 quote. Chef sees $0 balance. Overage invisible. No refund prompt.
**Build path:** Remove `GREATEST(0, ...)` wrapper. Allow negative `outstanding_balance_cents`. Add UI indicator: negative balance = "Overpaid by $X". Add `overpayment_cents` computed column.
**Priority:** P0

### B2. 50K ledger entry limit silently truncates tenant financials

**Failure type:** silent data loss at scale
**Current behavior:** `getTenantFinancialSummary()` queries with `.limit(50_000)`. If tenant exceeds this (unlikely now, possible in 2+ years), totals are silently understated.
**File:** `lib/ledger/compute.ts:57-91`
**Impact:** Revenue and expense totals understated with no warning. Tax reporting could be wrong.
**Build path:** Use `COUNT(*)` check first. If > 50K, use DB-side aggregation (SUM in SQL) instead of JS loop. Or raise limit with pagination.
**Priority:** P1

### B3. Stripe webhook payment handler: silent skip on financial summary fetch failure

**Failure type:** stuck event state
**Current behavior:** After appending ledger entry, handler fetches `event_financial_summary`. If fetch fails, handler returns silently. Event stays in 'accepted' forever. Payment IS in ledger but event never transitions to 'paid'.
**File:** `app/api/webhooks/stripe/route.ts:481`
**Impact:** Client paid but sees no confirmation. Chef sees no payment notification. Event stuck in limbo.
**Build path:** Retry financial summary fetch 3x with backoff. If still failing, log critical alert and attempt transition anyway (payment recorded in ledger is the source of truth).
**Priority:** P0

### B4. Stripe intent not cancelled when event cancelled

**Failure type:** orphaned payment intent
**Current behavior:** When event transitions to 'cancelled', no code cancels any pending Stripe payment intent. Intent can be captured hours later.
**File:** `lib/events/transitions.ts` (missing), `lib/stripe/checkout.ts`
**Impact:** Chef cancels event, client's payment is captured anyway. Requires manual Stripe dashboard intervention.
**Build path:** In transition side effects for `-> cancelled`, check if pending payment intent exists. If so, call `stripe.paymentIntents.cancel()`. Non-blocking but logged.
**Priority:** P1

### B5. Quote revision doesn't update linked event

**Failure type:** financial lineage broken
**Current behavior:** `reviseQuote()` creates new quote with `supersedes_quote_id` pointing to original. Linked event still references original quote ID. Event's `quoted_price_cents` may be from an old revision.
**File:** `lib/quotes/actions.ts:1019-1088`
**Impact:** Invoice shows wrong quote amount if quote was revised after event creation.
**Build path:** When quote is revised, if linked event exists, update `events.quoted_price_cents` to match new quote total. Log the change.
**Priority:** P1

---

## C. Client Hub & Surfaces

### C1. updateMemberNotificationPreferences() missing membership check

**Failure type:** authorization gap
**Current behavior:** Accepts `profileToken` + `groupId`. Validates profile token exists. Does NOT verify profile is a member of the group.
**File:** `lib/hub/group-actions.ts:417-457`
**Impact:** Any valid profile token can update notification prefs for ANY group they know the ID of. Scope: notification preferences only (mute/email/push/quiet hours), not data access.
**Build path:** Add membership check after profile token validation (line 424). Query `hub_group_members` to verify profile belongs to group before update.
**Priority:** P0

### C2. Voicemail transcript permanently lost on DB failure

**Failure type:** silent data loss
**Current behavior:** Twilio posts voicemail transcription. Handler updates `ai_calls` with transcript. If DB update fails, returns 200 OK (to prevent Twilio retry loop). Transcript never stored.
**File:** `app/api/calling/voicemail/route.ts:42-52`
**Impact:** Business-critical voicemail from vendor (pricing, availability) lost silently. Chef never sees it.
**Build path:** On DB failure, write transcript to a dead letter queue (DLQ) or file system fallback. Log as critical. Don't return 200 until transcript is persisted somewhere.
**Priority:** P0

### C3. Meal feedback has no notification trigger

**Failure type:** missing feature
**Current behavior:** `submitMealFeedback()` writes feedback to DB but sends no notification to chef or other circle members.
**File:** `lib/hub/meal-feedback-actions.ts`
**Impact:** Chef gets no signal when guests rate meals. Valuable feedback invisible until chef opens dashboard.
**Build path:** After feedback insert, call `notifyCircleMembers()` with system message. Non-blocking.
**Priority:** P1

### C4. Grouped notifications use in-memory Map (lost on restart)

**Failure type:** notification loss on deploy
**Current behavior:** `circle-notification-actions.ts` groups notifications in a 2-minute window using in-memory `Map`. On app restart/deploy, pending grouped notifications are lost.
**File:** `lib/hub/circle-notification-actions.ts`
**Impact:** Notifications queued during deploy window never sent.
**Build path:** Acceptable for single-region deployment. Document as known limitation. If reliability needed, move to Redis or DB-backed queue.
**Priority:** P2

### C5. Quiet hours use UTC, not user timezone

**Failure type:** UX bug
**Current behavior:** Quiet hours stored and evaluated in UTC. A member in EST setting quiet hours to "10 PM - 7 AM" is actually setting UTC quiet hours.
**File:** `lib/hub/circle-notification-actions.ts`
**Impact:** Members get notifications during their actual quiet hours (timezone mismatch).
**Build path:** Store member timezone in `hub_group_members`. Convert quiet hours to member's local time during evaluation.
**Priority:** P2

---

## D. Data Integrity & Cascade Safety

### D1. Hub group orphaned when creator profile deleted

**Failure type:** orphaned records
**Current behavior:** `hub_groups.created_by_profile_id` references `hub_guest_profiles(id)` with NO ON DELETE clause. If creator's profile is deleted, group becomes inaccessible (no admin).
**File:** `database/migrations/20260330000004` (Line 33)
**Impact:** Dinner circle has no owner. No one can manage settings. Members can still post but group is effectively abandoned.
**Build path:** Add `ON DELETE SET NULL` and handle null creator in UI (promote next oldest member to owner).
**Priority:** P1

### D2. Soft-delete inconsistency across tables

**Failure type:** silent query leaks
**Current behavior:** Some tables use `deleted_at` timestamp, others use `is_active` boolean, others have no soft-delete at all. Not all queries filter consistently.
**File:** Multiple (events, menus, clients use `deleted_at`; remy_conversations use `is_active`)
**Impact:** Deleted records appear in queries that forget to filter. Already caused bug: soft-deleted events appeared in financial summary (fixed in 20260415000003).
**Build path:** Audit all views and common queries for soft-delete filtering. Standardize on `deleted_at` for new tables. Add regression test.
**Priority:** P1

### D3. Expense records orphan when event deleted

**Failure type:** orphaned financial records
**Current behavior:** `expenses.event_id` has `ON DELETE SET NULL`. When event is deleted (soft or hard), expenses lose their event reference.
**File:** `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:396`
**Impact:** Expenses visible in chef's total but not attributable to any event. Financial reports show unexplained costs.
**Build path:** Change to `ON DELETE RESTRICT` (match ledger_entries behavior). Events with expenses cannot be deleted without explicit expense handling.
**Priority:** P2

### D4. Stripe payment intent ID stored as unvalidated TEXT

**Failure type:** no referential integrity to Stripe
**Current behavior:** `commerce_payments.stripe_payment_intent_id` is TEXT with no FK. No DB-level tracking of whether intent was cancelled.
**File:** Various payment tables
**Impact:** No audit trail for Stripe intent lifecycle. If webhook misses, intent state is unknown.
**Build path:** Add `stripe_intent_status` column. Update on every webhook event. Cron job to reconcile stale intents against Stripe API.
**Priority:** P2

---

## Priority Execution Order

### P0 (Fix now - financial/security) - DONE

- **A1** Race-lost transitions return success with no side effects - FIXED
- **A2** Missing cache invalidation in transitionEvent() - FIXED
- **B1** Overpayment information lost (GREATEST clamp) - FIXED
- **B3** Stripe webhook silent skip on summary fetch failure - FIXED
- **C1** Hub notification prefs missing membership check - FIXED
- **C2** Voicemail transcript loss on DB failure - FIXED

### P1 (Fix next - reliability)

- **A3** financial_reconciled gate always pending - FIXED (auto-checks outstanding balance from event_financial_summary, passes when balance <= 0)
- **B2** 50K ledger entry limit
- **B4** Stripe intent not cancelled on event cancel - FIXED (webhook handler now checks event status; auto-refunds payment on cancelled event with side_effect_failures recording)
- **B5** Quote revision doesn't update event - FIXED (transitionQuote syncs quoted_price_cents and deposit_amount_cents to linked event when sending revised quote)
- **C3** Meal feedback missing notification - FIXED (chef gets in-app notification when guest submits meal feedback)
- **D1** Hub group orphaned on creator deletion
- **D2** Soft-delete inconsistency audit

### P2 (Track - data quality)

- **C4** In-memory notification grouping
- **C5** Quiet hours UTC mismatch
- **D3** Expense orphan on event deletion
- **D4** Stripe intent status tracking

### P3 (Document - future scope)

- **A4** Owner check scope (multi-staff)
