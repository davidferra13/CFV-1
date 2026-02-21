# Communication Gap Closure

**Branch:** `feature/scheduling-improvements`
**Grade before:** B+ | **Grade after:** A

## What Changed

Closed 6 gaps in the client/chef/partner communication system where users received no notification at critical lifecycle moments. All changes follow the existing non-blocking side-effect pattern (try/catch, fire-and-forget, logged failures never block the main operation).

---

## Gaps Closed

### Gap 1 — Gmail Inquiry Acknowledgment

**File:** `lib/gmail/sync.ts`

Gmail-sourced inquiries now send an acknowledgment email back to the inquiry sender. Previously only the chef was notified. The fix reuses the existing `sendInquiryReceivedEmail()` function and the inquiry-received template that already existed for web form inquiries. Added inside the chef email block to reuse the already-fetched `chefProfile`.

### Gap 2 — Quote Rejected → Chef Notified

**Files:**

- `lib/quotes/client-actions.ts` — added `notifyChefOfQuoteRejected()` handler
- `lib/email/notifications.ts` — added `sendQuoteRejectedChefEmail()`
- `lib/email/templates/quote-rejected-chef.tsx` — new template

When a client declines a quote, the chef now receives both an in-app notification (`quote_rejected`) and a direct email. The rejection reason (if provided) is included. Pattern mirrors the existing `notifyChefOfQuoteAccepted` flow exactly.

### Gap 3 — Quote Expires → Both Parties Notified

**Files:**

- `app/api/scheduled/lifecycle/route.ts` — expanded section 2 to notify after expiry
- `lib/email/notifications.ts` — added `sendQuoteExpiredChefEmail()` and `sendQuoteExpiredClientEmail()`
- `lib/email/templates/quote-expired-chef.tsx` — new template
- `lib/email/templates/quote-expired-client.tsx` — new template

When the lifecycle cron expires a stale quote, both chef and client now receive notifications. Chef gets an in-app notification + email. Client gets an email if `automated_emails_enabled` is not false for their record. Respects the existing `quote_auto_expiry_enabled` tenant setting.

### Gap 4 — Event In-Progress → "Chef Is On the Way"

**Files:**

- `lib/events/transitions.ts` — added `in_progress` email case
- `lib/email/notifications.ts` — added `sendEventStartingEmail()`
- `lib/email/templates/event-starting.tsx` — new template

When the chef marks an event as in_progress (confirmed → in_progress transition), the client receives a warm "chef is on the way" email including arrival time, serve time, and location. Sits inside the existing non-blocking email try/catch in `transitionEvent()`.

### Gap 5 — Instant Booking → Client Confirmation Email

**Files:**

- `app/api/webhooks/stripe/route.ts` — added `sendInstantBookingClientEmail()` alongside chef email
- `lib/email/notifications.ts` — added `sendInstantBookingClientEmail()`
- `lib/email/templates/instant-booking-client.tsx` — new template

When a client completes an instant booking via Stripe, they now receive a confirmation email from ChefFlow (previously only the chef was notified). Includes booking summary, deposit paid, total, and a link to their event in the client portal.

### Gap 6 — Review Submitted → Chef Notified

**Files:**

- `lib/reviews/actions.ts` — added `notifyChefOfReview()` handler to `submitClientReview()`
- `lib/email/notifications.ts` — added `sendReviewSubmittedChefEmail()`
- `lib/email/templates/review-submitted-chef.tsx` — new template

When a client submits a post-event review, the chef now receives both an in-app notification (`review_submitted`) and an email with the star rating and an excerpt of the review text. The `submitClientReview` function now also uses `.select('id').single()` on the insert to return the review ID for the notification URL.

---

## New Files

| File                                             | Purpose                        |
| ------------------------------------------------ | ------------------------------ |
| `lib/email/templates/quote-rejected-chef.tsx`    | Chef told a quote was declined |
| `lib/email/templates/quote-expired-chef.tsx`     | Chef told a quote expired      |
| `lib/email/templates/quote-expired-client.tsx`   | Client told a quote expired    |
| `lib/email/templates/event-starting.tsx`         | "Chef is on the way" to client |
| `lib/email/templates/instant-booking-client.tsx` | Booking confirmation to client |
| `lib/email/templates/review-submitted-chef.tsx`  | Chef notified of new review    |

---

## Bonus Fix

**`app/auth/partner-signup/page.tsx`** — wrapped the inner `useSearchParams()` component in a `<Suspense>` boundary to fix a pre-existing Next.js prerender error that was blocking clean builds.

---

## Architecture Notes

All new notifications follow the established patterns:

- Non-blocking: wrapped in `.catch()` or try/catch, never throw
- Two-channel: in-app notification (`createNotification`) + direct email
- Dynamic imports: `await import('@/lib/email/notifications')` to avoid circular deps
- Tenant-scoped: all DB queries scoped to `tenant_id`
- Opt-out respected: `automated_emails_enabled` client flag checked where applicable

## Verification

- `npx tsc --noEmit --skipLibCheck` → EXIT:0
- `npx next build --no-lint` → compiled successfully
