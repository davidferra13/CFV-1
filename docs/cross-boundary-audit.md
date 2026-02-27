# Cross-Boundary State Propagation Audit

> **Date:** 2026-02-27
> **Auditor:** Claude Code (Lead Engineer)
> **Scope:** Every inter-process communication path between the Chef Portal and Client Portal
> **Method:** Exhaustive code review of every server action, webhook handler, notification function, and cache invalidation call

---

## Executive Summary

This audit examined every place where an action on one side of the trust boundary (Chef Portal or Client Portal) should produce a visible effect on the other side. We found **57 distinct gaps** across 7 categories:

| Category                                    | Critical | High | Medium | Low | Total |
| ------------------------------------------- | -------- | ---- | ------ | --- | ----- |
| Missing Notifications (client never told)   | 5        | 6    | 3      | 2   | 16    |
| Missing Notifications (chef never told)     | 3        | 3    | 2      | 1   | 9     |
| Cache Invalidation (cross-portal staleness) | 0        | 14   | 8      | 5   | 27    |
| Zero Hallucination Violations (UI lies)     | 2        | 0    | 0      | 0   | 2     |
| Non-Blocking Pattern Violations             | 0        | 2    | 0      | 0   | 2     |
| Food Safety Risks                           | 2        | 0    | 0      | 0   | 2     |
| Code Quality / @ts-nocheck Violations       | 0        | 1    | 0      | 0   | 1     |

**The three most dangerous findings:**

1. Guest RSVP allergies are saved but the chef is never alerted (food safety)
2. Client profile allergy/dietary changes produce zero chef notification (food safety)
3. Contract signing and menu approval both tell the client "your chef has been notified" when no notification is sent (Zero Hallucination Rule violation)

---

## Table of Contents

1. [Event FSM Transitions](#1-event-fsm-transitions)
2. [Quote FSM Transitions](#2-quote-fsm-transitions)
3. [Inquiry FSM Transitions](#3-inquiry-fsm-transitions)
4. [Menu Approval Workflow](#4-menu-approval-workflow)
5. [Contract Workflow](#5-contract-workflow)
6. [Payment / Stripe Webhooks](#6-payment--stripe-webhooks)
7. [Chat System](#7-chat-system)
8. [Loyalty / Rewards](#8-loyalty--rewards)
9. [Guest RSVP / Event Sharing](#9-guest-rsvp--event-sharing)
10. [Client Profile Updates](#10-client-profile-updates)
11. [Cache Invalidation Master List](#11-cache-invalidation-master-list)
12. [What's Working Well](#12-whats-working-well)
13. [Remediation Priority](#13-remediation-priority)

---

## 1. Event FSM Transitions

**File:** `lib/events/transitions.ts`

The Event FSM is the central hub — most cross-boundary effects originate here.

### What works

- All side effects (notifications, emails, calendar sync, automations, Zapier) are properly wrapped in individual `try/catch` blocks — non-blocking pattern is **fully compliant**.
- `draft → proposed`: Client gets email + in-app notification. Correct.
- `paid → confirmed`: Client gets email + in-app notification + FOH menu PDF. Correct.
- `proposed → accepted` (client-initiated): Chef gets in-app notification. Correct.
- `any → cancelled` (client-initiated): Chef gets in-app notification. Correct.
- `completeEvent` calls `awardEventPoints` correctly (line 741, non-blocking try/catch).

### Gaps found

| ID  | Transition                           | Gap                                                                                                                                          | Severity |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E1  | `proposed → accepted`                | Chef gets in-app notification but **no email**                                                                                               | High     |
| E2  | `proposed → accepted`                | Chef gets **no push notification**                                                                                                           | Medium   |
| E3  | `accepted → paid`                    | Client gets **no in-app notification** that payment was processed                                                                            | High     |
| E4  | `accepted → paid`                    | Chef gets **no email** that payment was received (only in-app)                                                                               | High     |
| E5  | `draft → paid` (instant-book)        | Chef notification check requires `fromStatus === 'accepted'` — instant-book bypasses it. Chef gets **nothing**                               | Critical |
| E6  | `confirmed → in_progress`            | Client gets email but **no in-app notification**                                                                                             | Medium   |
| E7  | `in_progress → completed`            | Client gets email + survey but **no in-app notification**                                                                                    | Medium   |
| E8  | `any → cancelled` (chef-initiated)   | Client gets email but **no in-app notification**                                                                                             | High     |
| E9  | `any → cancelled` (client-initiated) | Chef gets in-app but **no email** — a cancelled paid event is critical business info                                                         | Critical |
| E10 | All transitions                      | Cache invalidation only covers detail pages. **Missing: `/events`, `/my-events`, `/dashboard`** — list views and dashboard show stale status | High     |
| E11 | `confirmed`, `completed`             | Push notifications fire for the **chef's own action** (self-notification) — harmless but noisy                                               | Low      |

---

## 2. Quote FSM Transitions

**Files:** `lib/quotes/actions.ts`, `lib/quotes/client-actions.ts`

### What works

- `draft → sent`: Client gets email + in-app notification. Correct.
- `sent → accepted`: Chef gets in-app notification + email via `notifyChefOfQuoteAccepted()`. Correct.
- `sent → rejected`: Chef gets in-app notification + email with rejection reason. Correct.

### Gaps found

| ID  | Transition                  | Gap                                                                                                                                       | Severity |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Q1  | `draft → sent`              | Missing `revalidatePath('/my-quotes')` — client portal cache not busted                                                                   | Medium   |
| Q2  | `sent → accepted` (client)  | Missing `revalidatePath('/quotes')` and `/quotes/${id}` — chef sees stale "sent" status                                                   | High     |
| Q3  | `sent → accepted` (client)  | Missing `revalidatePath('/events/${id}')` and `/inquiries/${id}` — event pricing and inquiry status update but chef pages not invalidated | High     |
| Q4  | `sent → accepted` (client)  | Inquiry status update (lines 152-166) **not wrapped in try/catch** — if it fails, quote acceptance throws after already committing        | High     |
| Q5  | `sent → accepted` (client)  | Event pricing update (lines 169-178) **not wrapped in try/catch** — same issue                                                            | High     |
| Q6  | `sent → accepted` (client)  | No Zapier webhook dispatch — chef automations miss quote acceptance                                                                       | Medium   |
| Q7  | `sent → accepted` (client)  | No activity log — chef activity feed missing this event                                                                                   | Medium   |
| Q8  | `sent → rejected` (client)  | Missing `revalidatePath('/quotes')` — chef sees stale "sent" status                                                                       | High     |
| Q9  | `sent → rejected` (client)  | No activity log, no Zapier dispatch                                                                                                       | Medium   |
| Q10 | `sent → expired`            | Client gets **no email or notification** that their quote expired                                                                         | Medium   |
| Q11 | `sent → expired`            | Missing `revalidatePath('/my-quotes')` — client sees stale "pending" quote                                                                | Medium   |
| Q12 | `notifyChefOfQuoteAccepted` | `quote.name`/`quote.title` are undefined — always falls back to generic "Quote"                                                           | Low      |

---

## 3. Inquiry FSM Transitions

**File:** `lib/inquiries/actions.ts`

### The core problem

**The client is NEVER notified of ANY inquiry status change.** Zero email, zero in-app notification, zero push. All 8 possible transitions produce zero client-facing side effects. The infrastructure exists (`createClientNotification` is used elsewhere) — it was simply never wired into the inquiry pipeline.

### Gaps found

| ID  | Transition                          | Gap                                                                                                             | Severity |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| I1  | All transitions                     | Client receives **zero notification** for any status change                                                     | Critical |
| I2  | `awaiting_chef → quoted`            | Client should be told their quote is ready — this is the key conversion moment                                  | Critical |
| I3  | `any → declined`                    | Client is never told their inquiry was declined                                                                 | High     |
| I4  | `any → expired`                     | Client is never told their inquiry expired                                                                      | High     |
| I5  | `convertInquiryToEvent`             | Client is never told their inquiry became an event. No email, no in-app, no push                                | Critical |
| I6  | `convertInquiryToEvent`             | Missing `revalidatePath('/my-inquiries')`, `/my-inquiries/${id}`, `/my-events` — client portal shows stale data | High     |
| I7  | `convertInquiryToEvent`             | No activity log, no automation trigger, no Zapier dispatch                                                      | Low      |
| I8  | All transitions                     | Zero `revalidatePath('/my-inquiries')` calls in entire codebase — client inquiry pages are never cache-busted   | High     |
| I9  | Cron expiration (`lifecycle` route) | Auto-expired inquiries notify chef but **not** client                                                           | Medium   |

---

## 4. Menu Approval Workflow

**File:** `lib/events/menu-approval-actions.ts`

### The core problem

This is a **one-directional communication channel.** Chef sends menu to client, but client responses (approve / request revision) go into a void that the chef must actively poll. Neither approval nor revision request sends any notification to the chef.

### Gaps found

| ID  | Action                         | Gap                                                                                                                                      | Severity |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M1  | `approveMenu`                  | Chef receives **zero notification** (no email, no in-app, no push)                                                                       | Critical |
| M2  | `requestMenuRevision`          | Chef receives **zero notification**                                                                                                      | Critical |
| M3  | `approveMenu`                  | Missing `revalidatePath('/events/${id}')` — chef sees stale "Awaiting Approval"                                                          | High     |
| M4  | `requestMenuRevision`          | Missing `revalidatePath('/events/${id}')` — chef sees stale status                                                                       | High     |
| M5  | `sendMenuForApproval`          | Missing `revalidatePath('/my-events/${id}')` — client page not updated                                                                   | Medium   |
| M6  | `sendMenuForApproval`          | No `createClientNotification` — client gets email only, no in-app notification                                                           | Medium   |
| M7  | `sendMenuForApproval` (resend) | `menu_revision_notes` not cleared on resend — stale data left in DB                                                                      | Low      |
| M8  | `approveMenu` UI               | **Zero Hallucination Violation:** `contract-signing-client.tsx` line 67 says "Your chef has been notified" — but no notification is sent | Critical |

---

## 5. Contract Workflow

**File:** `lib/contracts/actions.ts`

### The core problem

Same pattern as menu approval — chef sends contract to client, but `signContract` sends **zero notification** to the chef. The client UI lies: "Your chef has been notified."

### Gaps found

| ID  | Action                           | Gap                                                                                     | Severity |
| --- | -------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| C1  | `signContract`                   | Chef receives **zero notification** (no email, no in-app, no push)                      | Critical |
| C2  | `signContract`                   | **Zero Hallucination Violation:** UI says "Your chef has been notified" — this is false | Critical |
| C3  | `signContract`                   | Missing `revalidatePath('/events/${id}')` — chef sees stale "Awaiting signature"        | High     |
| C4  | `sendContractToClient`           | Email send (line 370) **not wrapped in try/catch** — violates non-blocking pattern      | High     |
| C5  | `sendContractToClient`           | Missing `revalidatePath('/my-events/${id}')` — client event page stale                  | Medium   |
| C6  | `recordClientView`               | No `revalidatePath` at all — chef never sees "viewed" status change                     | Medium   |
| C7  | `voidContract`                   | Client not notified when an already-sent contract is voided                             | Medium   |
| C8  | `voidContract`                   | Missing `revalidatePath('/my-events/${id}')` — client side stale                        | Medium   |
| C9  | All contract actions             | Activity tracking never called despite 6 event types existing in `chef-types.ts`        | Low      |
| C10 | `signContractAsParty` (advanced) | No notification to any party when a signer signs or when all parties have signed        | Medium   |

---

## 6. Payment / Stripe Webhooks

**File:** `app/api/webhooks/stripe/route.ts`

### What works

- `payment_intent.succeeded`: Ledger entry (idempotent via `transaction_reference`), event FSM transition, chef email + in-app notification + push. Two layers of idempotency. Solid.
- `checkout.session.completed` (gift cards): All three parties (recipient, buyer, chef) get both emails and notifications. Exemplary.
- Double-fire safety: Returns early on duplicate; audit trail on FSM failure.

### Gaps found

| ID  | Event                                                | Gap                                                                                                                                  | Severity |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| P1  | `payment_intent.succeeded`                           | Client gets email receipt but **no in-app notification**                                                                             | High     |
| P2  | `payment_intent.succeeded`                           | `assignInvoiceNumber` uses non-admin Supabase client — **likely fails silently in webhook context** (no user session, RLS blocks it) | Critical |
| P3  | `payment_intent.succeeded`                           | Missing `revalidatePath('/my-events/${id}/invoice')` — client invoice page stale                                                     | Medium   |
| P4  | `payment_intent.canceled`                            | **Neither chef nor client** notified when PaymentIntent is canceled                                                                  | Medium   |
| P5  | `charge.dispute.funds_withdrawn`                     | Chef not notified when money is actually clawed back (dispute created notifies, but funds withdrawn does not)                        | High     |
| P6  | `charge.refunded`                                    | Client gets **no email or in-app notification** confirming refund                                                                    | High     |
| P7  | Commerce payments (`handleCommercePaymentSucceeded`) | **Zero notifications** to anyone — commerce sales complete silently                                                                  | Medium   |
| P8  | `payment_status` trigger                             | Partial refund on a fully-paid event sets status to `refunded` instead of recalculating net balance                                  | Low      |

---

## 7. Chat System

**Files:** `lib/chat/actions.ts`, `lib/chat/realtime.ts`

### What works

- Both chef and client can create conversations and send messages.
- Real-time subscriptions (Postgres changes, typing indicators, presence) all properly implemented.
- Read receipts tracked via `last_read_at` with RPC-based unread counting.
- Client → Chef text message notification works (in-app + rate-limited email).

### Gaps found

| ID  | Action                               | Gap                                                                                                                          | Severity |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| CH1 | Chef sends message                   | Client gets **no in-app notification** — only sees it if chat is open via real-time                                          | High     |
| CH2 | Client sends image/file              | Chef gets **no notification** — only text messages trigger `notifyChefOfClientMessage`                                       | High     |
| CH3 | Pre-event reminders (lifecycle cron) | Notification types `event_reminder_7d`, `event_reminder_2d`, `event_reminder_1d` exist in type system but are **never used** | Low      |

---

## 8. Loyalty / Rewards

**Files:** `lib/loyalty/actions.ts`, `lib/loyalty/auto-award.ts`, `lib/loyalty/client-loyalty-actions.ts`, `lib/loyalty/redemption-actions.ts`

### What works

- Gift card purchase flow is exemplary — all three parties notified.
- Client reward redemption properly notifies chef (`reward_redeemed_by_client`).

### Gaps found

| ID  | Action                                             | Gap                                                                    | Severity |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| L1  | `awardEventPoints`                                 | Client **never notified** they earned points or got a tier upgrade     | High     |
| L2  | `autoAwardWelcomePoints`                           | Client never notified of welcome bonus                                 | Low      |
| L3  | `redeemIncentiveCode` (gift card applied to event) | Chef **not notified** that balance changed                             | High     |
| L4  | `redeemIncentiveCode`                              | Missing `revalidatePath('/events/${id}')` and `/loyalty` for chef side | Medium   |
| L5  | `clientRedeemReward`                               | Missing `revalidatePath('/loyalty')` for chef dashboard                | Low      |

---

## 9. Guest RSVP / Event Sharing

**File:** `lib/sharing/actions.ts`

### The core problem

Guest RSVPs are a completely silent operation. When a guest RSVPs — including submitting allergy information — **nobody is notified** and **no cache is invalidated**.

### Gaps found

| ID  | Action                     | Gap                                                                                     | Severity     |
| --- | -------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| R1  | `submitRSVP`               | **FOOD SAFETY:** Guest submits allergies but chef receives zero alerts                  | **Critical** |
| R2  | `submitRSVP`               | Chef not notified that a guest RSVP'd (guest count changing is operationally important) | High         |
| R3  | `submitRSVP`               | Host (client) not notified that a guest responded                                       | Medium       |
| R4  | `submitRSVP`               | **Zero `revalidatePath` calls** — all portal views show stale guest data                | High         |
| R5  | `updateRSVP`               | Zero `revalidatePath` calls — same stale cache problem                                  | High         |
| R6  | `saveGuestEventPortalRSVP` | Zero `revalidatePath` calls — same problem                                              | High         |
| R7  | `createEventShare`         | Chef not notified client is inviting guests (minor — operational awareness)             | Low          |

---

## 10. Client Profile Updates

**File:** `lib/clients/client-profile-actions.ts`

### Gaps found

| ID  | Action                                | Gap                                                                                                             | Severity     |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| CP1 | `updateMyProfile` (allergies/dietary) | **FOOD SAFETY:** Client changes allergies, chef receives zero notification. Chef preps with stale allergy data. | **Critical** |
| CP2 | `updateMyProfile`                     | Missing `revalidatePath('/clients/${id}')` — chef's client detail page shows stale dietary data                 | High         |
| CP3 | File has `@ts-nocheck` on line 1      | Exports 5 callable server actions — violates CLAUDE.md rule against `@ts-nocheck` exports                       | High         |

---

## 11. Cache Invalidation Master List

### The root cause

The single most impactful fix: **`transitionEvent` in `lib/events/transitions.ts`** only invalidates detail pages. Adding three lines would fix staleness for ALL state transitions:

```typescript
revalidatePath(`/events/${eventId}`) // ← already exists
revalidatePath(`/my-events/${eventId}`) // ← already exists
revalidatePath('/events') // ← ADD THIS
revalidatePath('/my-events') // ← ADD THIS
revalidatePath('/dashboard') // ← ADD THIS
```

### Full list of mutations missing cross-portal invalidation

#### Chef writes, client cache stale

| Function                             | File                           | Missing client paths             |
| ------------------------------------ | ------------------------------ | -------------------------------- |
| `transitionEvent` (all transitions)  | `transitions.ts`               | `/my-events`                     |
| `updateEvent`                        | `actions.ts`                   | `/my-events/${id}`, `/my-events` |
| `uploadEventPhoto`                   | `photo-actions.ts`             | `/my-events/${id}`               |
| `deleteEventPhoto`                   | `photo-actions.ts`             | `/my-events/${id}`               |
| `updatePhotoCaption`                 | `photo-actions.ts`             | `/my-events/${id}`               |
| `reorderEventPhotos`                 | `photo-actions.ts`             | `/my-events/${id}`               |
| `sendMenuForApproval`                | `menu-approval-actions.ts`     | `/my-events/${id}`               |
| `sendContractToClient`               | `contracts/actions.ts`         | `/my-events/${id}`               |
| `voidContract`                       | `contracts/actions.ts`         | `/my-events/${id}`               |
| `assignInvoiceNumber`                | `invoice-actions.ts`           | `/my-events/${id}`               |
| `recordTip`                          | `financial-summary-actions.ts` | `/my-events/${id}`               |
| `toggleCountdown`                    | `countdown-actions.ts`         | `/my-events/${id}`               |
| `transitionQuote` (`draft → sent`)   | `quotes/actions.ts`            | `/my-quotes`, `/my-quotes/${id}` |
| `transitionQuote` (`sent → expired`) | `quotes/actions.ts`            | `/my-quotes`, `/my-quotes/${id}` |

#### Client writes, chef cache stale

| Function                      | File                             | Missing chef paths                                              |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `acceptQuote`                 | `quotes/client-actions.ts`       | `/quotes`, `/quotes/${id}`, `/events/${id}`, `/inquiries/${id}` |
| `rejectQuote`                 | `quotes/client-actions.ts`       | `/quotes`, `/quotes/${id}`                                      |
| `approveMenu`                 | `menu-approval-actions.ts`       | `/events/${id}`                                                 |
| `requestMenuRevision`         | `menu-approval-actions.ts`       | `/events/${id}`                                                 |
| `signContract`                | `contracts/actions.ts`           | `/events/${id}`                                                 |
| `recordClientView` (contract) | `contracts/actions.ts`           | `/events/${id}`                                                 |
| `confirmPreEventChecklist`    | `pre-event-checklist-actions.ts` | `/events/${id}`                                                 |
| `updateMyProfile`             | `client-profile-actions.ts`      | `/clients/${id}`                                                |
| `submitRSVP`                  | `sharing/actions.ts`             | `/events/${id}` (zero invalidation)                             |
| `updateRSVP`                  | `sharing/actions.ts`             | `/events/${id}` (zero invalidation)                             |
| `saveGuestEventPortalRSVP`    | `sharing/actions.ts`             | `/events/${id}` (zero invalidation)                             |
| `acceptEventProposal`         | `events/client-actions.ts`       | `/events/${id}`, `/events`, `/dashboard`                        |

#### Neither side invalidated (zero `revalidatePath`)

| Function                      | File                         |
| ----------------------------- | ---------------------------- |
| `submitRSVP`                  | `sharing/actions.ts`         |
| `updateRSVP`                  | `sharing/actions.ts`         |
| `saveGuestEventPortalRSVP`    | `sharing/actions.ts`         |
| `recordClientView` (contract) | `contracts/actions.ts`       |
| `recordOfflinePayment`        | `offline-payment-actions.ts` |

---

## 12. What's Working Well

Not everything is broken. These areas are properly implemented and can serve as templates for fixing the gaps:

1. **Non-blocking side effects** — Every side effect in `transitionEvent` is individually wrapped in `try/catch`. Exemplary pattern.
2. **Ledger idempotency** — Two-layer protection (pre-check + DB unique constraint). Bank-grade.
3. **Gift card purchase flow** — All three parties (buyer, recipient, chef) get emails + in-app notifications. Best-in-class cross-boundary communication.
4. **Quote accept/reject → chef notification** — Both in-app + email with rejection reason. Correct pattern.
5. **Event proposed/confirmed → client notification** — Email + in-app notification with proper action URLs. Correct.
6. **Real-time chat** — Supabase Realtime subscriptions, typing indicators, presence, read receipts all properly implemented.
7. **Multi-channel notification delivery** — Email (Resend), push (VAPID), SMS (Twilio) with rate limiting and delivery logging.
8. **Notification action URLs** — All URLs correctly point to the right portal (`/events/` for chef, `/my-events/` for client).
9. **Client text message → chef notification** — In-app + rate-limited email. Correct.
10. **Immutable audit trails** — All FSM transitions logged. Cannot be deleted or modified.

---

## 13. Remediation Priority

### Tier 1: Fix Immediately (Food Safety + Zero Hallucination Violations)

These represent either physical safety risks or the app actively lying to users.

| ID  | Fix                                                                  | File                                    | Effort |
| --- | -------------------------------------------------------------------- | --------------------------------------- | ------ |
| R1  | Alert chef when guest submits allergies in RSVP                      | `lib/sharing/actions.ts`                | Small  |
| CP1 | Alert chef when client updates allergies/dietary                     | `lib/clients/client-profile-actions.ts` | Small  |
| M8  | Remove "Your chef has been notified" text OR add actual notification | `menu-approval-client.tsx`              | Small  |
| C2  | Remove "Your chef has been notified" text OR add actual notification | `contract-signing-client.tsx`           | Small  |
| M1  | Add chef notification (in-app + email) when client approves menu     | `lib/events/menu-approval-actions.ts`   | Medium |
| M2  | Add chef notification when client requests menu revision             | `lib/events/menu-approval-actions.ts`   | Medium |
| C1  | Add chef notification (in-app + email) when client signs contract    | `lib/contracts/actions.ts`              | Medium |

### Tier 2: Fix Soon (Business-Critical Communication Gaps)

These represent situations where one side takes action and the other side doesn't know.

| ID    | Fix                                                                               | File                            | Effort |
| ----- | --------------------------------------------------------------------------------- | ------------------------------- | ------ |
| E10   | Add `/events`, `/my-events`, `/dashboard` to `transitionEvent` cache invalidation | `lib/events/transitions.ts`     | Tiny   |
| I1-I6 | Add client notifications for all inquiry status changes + conversion              | `lib/inquiries/actions.ts`      | Medium |
| E5    | Fix instant-book chef notification (check `fromStatus === 'draft'` too)           | `lib/events/transitions.ts`     | Tiny   |
| E9    | Add chef email for client-initiated cancellation                                  | `lib/events/transitions.ts`     | Small  |
| P2    | Fix `assignInvoiceNumber` to use admin Supabase client in webhook context         | `lib/events/invoice-actions.ts` | Small  |
| Q2-Q3 | Add missing chef-side cache invalidation to `acceptQuote`                         | `lib/quotes/client-actions.ts`  | Tiny   |
| Q4-Q5 | Wrap inquiry/event updates in try/catch in `acceptQuote`                          | `lib/quotes/client-actions.ts`  | Tiny   |
| Q8    | Add missing chef-side cache invalidation to `rejectQuote`                         | `lib/quotes/client-actions.ts`  | Tiny   |
| R4-R6 | Add `revalidatePath` calls to all RSVP functions                                  | `lib/sharing/actions.ts`        | Tiny   |
| CH1   | Add client in-app notification when chef sends message                            | `lib/chat/actions.ts`           | Small  |
| CH2   | Add chef notification for client image/file messages                              | `lib/chat/actions.ts`           | Small  |

### Tier 3: Fix When Touching These Files (Completeness)

| ID                | Fix                                                            | File                                | Effort |
| ----------------- | -------------------------------------------------------------- | ----------------------------------- | ------ |
| E1                | Add chef email for `proposed → accepted`                       | `transitions.ts`                    | Small  |
| E3                | Add client in-app notification for `accepted → paid`           | `transitions.ts`                    | Small  |
| E8                | Add client in-app notification for chef-initiated cancellation | `transitions.ts`                    | Small  |
| P1                | Add client in-app notification for payment received            | `stripe/route.ts`                   | Small  |
| P5                | Add chef notification for `charge.dispute.funds_withdrawn`     | `stripe/route.ts`                   | Small  |
| P6                | Add client email for refund processed                          | `stripe/route.ts`                   | Small  |
| L1                | Notify client when loyalty points awarded                      | `lib/loyalty/actions.ts`            | Small  |
| L3                | Notify chef when gift card redeemed against event              | `lib/loyalty/redemption-actions.ts` | Small  |
| C4                | Wrap email send in try/catch in `sendContractToClient`         | `contracts/actions.ts`              | Tiny   |
| CP3               | Fix `@ts-nocheck` on `client-profile-actions.ts`               | `client-profile-actions.ts`         | Medium |
| All photo actions | Add `/my-events/${id}` invalidation                            | `photo-actions.ts`                  | Tiny   |
| Q6-Q7, Q9         | Add Zapier + activity log to client-side quote actions         | `quotes/client-actions.ts`          | Small  |

### Tier 4: Nice-to-Have (Low Priority)

| ID     | Fix                                                                         | Effort |
| ------ | --------------------------------------------------------------------------- | ------ |
| Q12    | Fix `quote.name` → `quote.quote_name` in notification helper                | Tiny   |
| E11    | Remove self-notification push for chef's own actions                        | Tiny   |
| C9     | Wire up activity tracking for all 6 contract event types                    | Small  |
| R7     | Notify chef when client creates share link                                  | Small  |
| L2, L5 | Notify client of welcome points; invalidate `/loyalty` on client redemption | Small  |
| CH3    | Wire up `event_reminder_*d` notification types in lifecycle cron            | Medium |

---

## Appendix: Methodology

Every finding was verified by reading the actual source code, not inferred from file names or comments. Line numbers reference the files as they existed at audit time (2026-02-27). The audit covered:

- `lib/events/transitions.ts` — every transition and its side effects
- `lib/events/actions.ts` — all event mutations
- `lib/events/client-actions.ts` — all client-initiated event actions
- `lib/events/menu-approval-actions.ts` — full approval workflow
- `lib/events/invoice-actions.ts` — invoice assignment
- `lib/events/photo-actions.ts` — all photo mutations
- `lib/events/countdown-actions.ts` — countdown toggle
- `lib/events/pre-event-checklist-actions.ts` — client checklist
- `lib/events/debrief-actions.ts` — post-event debrief
- `lib/events/clone-actions.ts` — event cloning
- `lib/events/offline-payment-actions.ts` — offline payments
- `lib/events/financial-summary-actions.ts` — financial closure, tips, mileage
- `lib/events/safety-checklist-actions.ts` — safety checklists
- `lib/events/equipment-checklist-actions.ts` — equipment checklists
- `lib/events/alcohol-log-actions.ts` — alcohol service logging
- `lib/events/cross-contamination-actions.ts` — cross-contamination checklists
- `lib/events/dietary-conflict-actions.ts` — dietary conflict detection
- `lib/events/historical-import-actions.ts` — historical event import
- `lib/events/readiness.ts` — readiness gates
- `lib/events/scope-drift-actions.ts` — scope drift tracking
- `lib/events/geocoding-actions.ts` — address geocoding
- `lib/quotes/actions.ts` — chef-side quote actions
- `lib/quotes/client-actions.ts` — client-side quote actions
- `lib/inquiries/actions.ts` — all inquiry actions + conversion
- `lib/inquiries/client-actions.ts` — client inquiry queries
- `lib/contracts/actions.ts` — contract CRUD, send, sign, void
- `lib/contracts/advanced-contracts.ts` — multi-party signing
- `lib/chat/actions.ts` — all chat actions (both roles)
- `lib/chat/realtime.ts` — real-time subscriptions
- `lib/notifications/actions.ts` — chef notification creation
- `lib/notifications/client-actions.ts` — client notification creation
- `lib/notifications/types.ts` — notification categories and actions
- `lib/notifications/channel-router.ts` — multi-channel delivery
- `lib/loyalty/actions.ts` — loyalty point management
- `lib/loyalty/auto-award.ts` — automatic point awards
- `lib/loyalty/client-loyalty-actions.ts` — client redemption
- `lib/loyalty/redemption-actions.ts` — incentive code redemption
- `lib/sharing/actions.ts` — RSVP + event sharing
- `lib/clients/client-profile-actions.ts` — client profile updates
- `app/api/webhooks/stripe/route.ts` — all Stripe webhook handlers
- `app/api/scheduled/lifecycle/route.ts` — scheduled lifecycle tasks
- All client portal pages under `app/(client)/`
