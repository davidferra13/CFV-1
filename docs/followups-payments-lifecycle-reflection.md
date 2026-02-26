# Auto Follow-ups, Payment Links, Lifecycle Auto-Advancement — Reflection

**Date:** 2026-02-17
**Scope:** Three automation features that close remaining gaps from the dinner walkthrough

---

## What Changed

### 1. Auto Follow-up Scheduling — 48-Hour Inquiry Timer

**Problem:** When the chef sends an email to a client, there was no automated reminder if the client doesn't respond. Follow-ups relied entirely on the chef remembering to check.

**What was built:**

#### `lib/gmail/actions.ts` — Follow-up timer on email send

- `approveAndSendMessage()` now sets `follow_up_due_at` to 48 hours from the moment the email is sent
- This activates the existing priority queue (which already surfaces overdue follow-ups within a 48-hour window)
- Timer resets every time the chef sends a new message to the client

#### `app/api/scheduled/follow-ups/route.ts` — Cron endpoint for overdue follow-ups

- Secured with `CRON_SECRET` bearer token (same pattern as Gmail sync)
- Queries: `inquiries WHERE follow_up_due_at <= NOW() AND status = 'awaiting_client'`
- For each overdue inquiry: creates a `follow_up_due` notification for the chef
- Sets the next follow-up timer to 48 hours from now (repeating until resolved)
- Chef is notified via the bell icon — they decide whether to act

#### `lib/notifications/types.ts` — New `follow_up_due` action

- Added to `NotificationAction` union type
- Config: category `inquiry`, icon `Bell`, `toastByDefault: true`

#### `vercel.json` — Cron schedules configured

- Gmail sync: every 5 minutes (`*/5 * * * *`)
- Follow-up checks: every 6 hours (`0 */6 * * *`)
- Lifecycle maintenance: daily at 3 AM (`0 3 * * *`)

### 2. Payment Link Integration — Stripe Checkout in Booking Emails

**Problem:** The agent-brain rules said to include `[PAYMENT LINK]` in booking emails, but there was no code to generate or resolve that placeholder into an actual payment URL.

**What was built:**

#### `lib/stripe/checkout.ts` — Stripe Checkout Session helper

- `createPaymentCheckoutUrl(eventId, tenantId)` — Creates a hosted Stripe Checkout Session
- Determines amount: deposit (if unpaid) or remaining balance
- Sets `payment_intent_data.metadata` with `event_id`, `tenant_id`, `client_id`, `payment_type` — so the existing webhook handler processes it identically to direct PaymentIntents
- Session expires after 72 hours
- Success/cancel URLs redirect to `/my-events/{id}?payment=success|cancelled`
- Returns `null` if event is not in `accepted` status (not ready for payment)

#### `lib/gmail/actions.ts` — Placeholder resolution on send

- Before sending via Gmail, `approveAndSendMessage()` checks for `[PAYMENT_LINK]` in the body
- If found: looks up the inquiry's `converted_to_event_id`, creates a Checkout Session, replaces the placeholder with the actual URL
- If generation fails: replaces with `(payment link will be sent separately)` — never sends a raw placeholder
- The resolved body is persisted to the `messages` table so the record has the actual link

#### `lib/ai/correspondence.ts` — Payment context for AI drafts

- At booking stage, if the inquiry has been converted to an event in `accepted` status:
  - Appends context telling the AI to use `[PAYMENT_LINK]` placeholder
  - The AI includes it naturally in the draft per the booking rules in `06-BOOKING_PAYMENT.md`
- If not at booking stage or no event exists: no payment context added

#### How it integrates with existing Stripe webhook

- The Checkout Session creates a PaymentIntent with metadata
- Existing `payment_intent.succeeded` webhook handler processes it identically
- Ledger entry → event transition to `paid` → chef notification all fire automatically

### 3. Lifecycle Auto-Advancement — Inquiry Status Progresses Automatically

**Problem:** Inquiry status required manual transitions. When the chef sent an email, the inquiry stayed in `new`. When the client replied, it stayed in `awaiting_client`. The chef had to manually advance the status.

**What was built:**

#### `lib/gmail/actions.ts` — Auto-advance on chef email send

- `approveAndSendMessage()` now auto-transitions:
  - `new` → `awaiting_client` (chef responded to new inquiry)
  - `awaiting_chef` → `awaiting_client` (chef responded to client reply)
- DB trigger auto-logs to `inquiry_state_transitions` (immutable audit trail)

#### `lib/gmail/sync.ts` — Auto-advance on client reply

- `handleExistingThread()` now:
  1. Looks up the linked inquiry by `gmail_thread_id` (finds any message in the same thread that has an `inquiry_id`)
  2. Links the new reply message to the same inquiry
  3. Auto-transitions `awaiting_client` → `awaiting_chef`
  4. Clears `follow_up_due_at` (client has responded — timer is moot)
  5. Sets `next_action_required: 'Client replied — review and respond'`
- Notification now includes `actionUrl` and `inquiryId` for proper deep linking

#### `app/api/scheduled/lifecycle/route.ts` — Periodic lifecycle maintenance

- Secured with `CRON_SECRET` bearer token
- **Stale inquiry expiration:** Inquiries in `awaiting_client` with no `updated_at` for 30 days → auto-transitions to `expired`, clears follow-up timer, notifies chef
- **Quote expiration:** Quotes in `sent` status with `expires_at` in the past → auto-transitions to `expired`
- Runs daily at 3 AM

### 4. Bug Fix: Notification Type Safety

- `lib/notifications/actions.ts` — Removed stale `(as any)` casts from all Supabase queries
- Added `Json` import from `types/database` for proper metadata typing
- The `(as any)` casts were artifacts from before types were regenerated; now all queries are fully typed

---

## How These Connect

```
Chef sends email (approveAndSendMessage)
  → Auto-advance: new → awaiting_client (or awaiting_chef → awaiting_client)
  → Set follow_up_due_at = NOW + 48h
  → Resolve [PAYMENT_LINK] → Stripe Checkout URL (if booking stage)
  → Send via Gmail API
  → Message logged as 'sent'

  Client doesn't reply...
    → Cron checks every 6 hours
    → follow_up_due_at passed? → Notify chef via bell
    → Set next follow_up_due_at = NOW + 48h (repeating)
    → After 30 days → auto-expire inquiry

  Client replies...
    → Gmail sync picks up reply
    → Link message to inquiry (by gmail_thread_id)
    → Auto-advance: awaiting_client → awaiting_chef
    → Clear follow_up_due_at
    → Notify chef: "Client replied"
    → Chef opens inquiry → Generate Draft → Approve & Send → cycle repeats

  Client clicks payment link...
    → Stripe Checkout Session → PaymentIntent
    → payment_intent.succeeded webhook fires
    → Ledger entry appended (idempotent)
    → Event transitions accepted → paid
    → Chef notified of payment
```

---

## AI Policy Compliance

All three features respect the AI Policy:

- **Follow-up reminders:** Notify chef, don't auto-send. Chef decides whether to act.
- **Payment links:** AI suggests `[PAYMENT_LINK]` placeholder. Chef reviews and approves before it's resolved into an actual Stripe session.
- **Lifecycle advancement:** Status transitions are deterministic rules (email sent → awaiting_client, reply received → awaiting_chef). No AI involvement in state transitions.

Litmus test: unplug AI → follow-ups still fire, payment links still resolve, lifecycle still advances. The system works without AI.

---

## Files Modified

| File                           | Change                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `lib/gmail/actions.ts`         | Payment link resolution, follow-up timer, auto-advance inquiry |
| `lib/gmail/sync.ts`            | Thread-based inquiry linking, auto-advance on reply            |
| `lib/ai/correspondence.ts`     | Payment link context for booking stage AI drafts               |
| `lib/notifications/actions.ts` | Removed stale `(as any)` casts, added `Json` type              |
| `lib/notifications/types.ts`   | Added `follow_up_due` notification action                      |
| `vercel.json`                  | Cron schedules for all three endpoints                         |

## Files Created

| File                                    | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `lib/stripe/checkout.ts`                | Stripe Checkout Session URL generator            |
| `app/api/scheduled/follow-ups/route.ts` | Cron: overdue follow-up notifications            |
| `app/api/scheduled/lifecycle/route.ts`  | Cron: stale inquiry expiration, quote expiration |

---

## What's Next

Remaining gaps from the dinner walkthrough:

1. **Document scaffolding on payment** — Prep sheets start generating when event is paid
2. **Grocery list to menu component chain verification** — Ensure menu → grocery → shopping list pipeline is complete
3. **Post-event follow-up automation** — `draftPostEventFollowUp()` exists but isn't wired into any trigger
4. **Client-facing payment page improvements** — Success/cancel states for the Checkout redirect URLs
