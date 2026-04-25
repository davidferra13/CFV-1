# P0 Client Portal Payment Intent Hardening

## Scope

Current thread scope: the public-intent hardening pass.

## Single Highest-Leverage Action Remaining

Build a shared public-intent guard and short-window idempotency layer for client-portal payment checkout creation.

In concrete terms, harden `getClientPortalPaymentCheckoutUrl()` so a valid client magic link cannot be used to fan out repeated anonymous Stripe checkout sessions for the same `token + eventId` intent inside a short window.

## Why This Is The Next Build

The current public-intent pass already established a shared backend guard for open booking and inquiry mutations, and it already patched the obvious token-flow gaps for proposal approval or decline and guest portal reads. That means the highest remaining leverage is the one tokenized public mutation that still converts a public token directly into a new Stripe checkout session.

This is still inside the same scope. It is additive. It does not require accounts. It does not change page-load gating. It only hardens a remaining intent-heavy public write.

## Evidence

- The pass explicitly added a shared guard for public intent-heavy flows and only patched token-scoped rate limits for guest portal reads plus proposal approval or decline, not client-portal payment checkout creation yet: `docs/changes/2026-04-23-public-intent-hardening.md:7-12`
- Client portal access is still token-based magic-link access with no account required: `lib/client-portal/actions.ts:1-4`
- Client portal token resolution validates the token and updates last-used metadata, but it is still only token lookup state, not an intent guard: `lib/client-portal/actions.ts:113-160`
- The public payment path calls `getClientPortalPaymentCheckoutUrl()` from a tokenized page after only an IP-level page rate limit: `app/client/[token]/pay/[eventId]/page.tsx:25-38`
- `getClientPortalPaymentCheckoutUrl()` resolves token access and then directly calls `createPaymentCheckoutUrl()` with no shared public-intent guard, no token+event dedupe, and no idempotency input: `lib/client-portal/actions.ts:446-473`
- `createPaymentCheckoutUrl()` creates a fresh Stripe Checkout Session through `stripe.checkout.sessions.create(...)`: `lib/stripe/checkout.ts:27-32`, `lib/stripe/checkout.ts:150-166`
- Other public tokenized flows in the same scope already self-defend:
  - Proposal approve or decline are rate-limited: `lib/proposals/client-proposal-actions.ts:363-367`, `lib/proposals/client-proposal-actions.ts:431-436`
  - Share RSVP submit and update are rate-limited and CAPTCHA-aware: `lib/sharing/actions.ts:2560-2566`, `lib/sharing/actions.ts:2829-2835`
  - Guest portal read and guest portal RSVP save are rate-limited: `lib/sharing/actions.ts:3030-3034`, `lib/sharing/actions.ts:3134-3139`

## Build Goal

Make client-portal payment checkout creation behave like the rest of the hardened public-intent surfaces:

1. Token remains public and magic-link based.
2. A valid portal link still redirects the client to Stripe without requiring login.
3. Repeated anonymous hits for the same payment intent do not create a burst of duplicate Stripe sessions.
4. Tenant scoping still comes from the resolved client portal access and event lookup, never from request input.
5. Response contract and page UX stay stable unless there is a clear safety bug.

## Exact Build

### 1. Reuse the shared public-intent guard in the client-portal payment action

Apply `lib/security/public-intent-guard.ts` inside `getClientPortalPaymentCheckoutUrl()` using `headers()`:

- IP throttle
- token-scoped throttle, hashed or truncated for storage keys
- optional short-window event-intent dedupe key based on `normalizedToken + eventId`
- no PII-heavy logging

Do not add honeypot or JSON-body handling here, because this path is tokenized GET-driven checkout creation, not a form POST.

### 2. Add short-window dedupe for payment-session creation

Introduce a small in-memory dedupe cache in `lib/client-portal/actions.ts` or a nearby helper using:

- key: stable hash of `normalizedToken + eventId`
- TTL: 5 to 10 minutes
- semantics:
  - if a session for the same intent was just created and is still usable, return the same checkout URL
  - if a creation is in flight, await the same promise

This should mirror the anonymous instant-book dedupe pattern already used in the current scope, but for client-portal payments.

### 3. Add Stripe idempotency support to payment checkout creation

Extend `createPaymentCheckoutUrl()` so callers can pass an idempotency key.

Then pass a deterministic key from `getClientPortalPaymentCheckoutUrl()` based on the same short-window intent key.

This keeps the dedupe boundary coherent if multiple requests race past local memory.

### 4. Preserve the public token model and current UX

Do not:

- require login
- change `/client/[token]` or `/client/[token]/pay/[eventId]` routing
- change portal copy
- change `not_found` or `unavailable` result semantics unless the current contract is unsafe

### 5. Add focused tests

Add a narrow unit test file for this exact path, for example:

- `tests/unit/client-portal-payment-intent.test.ts`

Cover at least:

- valid token + event still returns `status: 'ok'` with a checkout URL
- invalid token still returns `status: 'not_found'`
- repeated anonymous calls for the same token + event within the short window only create one Stripe session
- guard rejects rate-limited repeated attempts with the existing failure contract you choose for this action
- tenant remains derived from resolved client portal access and event lookup, never request input

## Files To Touch

- `lib/client-portal/actions.ts`
- `lib/stripe/checkout.ts`
- `tests/unit/client-portal-payment-intent.test.ts`

Optional only if needed for plumbing:

- `app/client/[token]/pay/[eventId]/page.tsx`

## Non-Goals

- No redesign of the client portal
- No account auth
- No new database tables
- No conversion of the payment page from public token access to authenticated client access
- No broad token-rotation refactor in this slice

## Acceptance Criteria

- Client magic-link payment still works for a valid token and payable event
- Repeated hits for the same token and event do not create duplicate Stripe sessions inside the dedupe window
- The action is protected by the same public-intent hardening philosophy already used for open booking and instant booking
- Targeted unit tests exist and pass

## Recommended Execution Shape

One Codex agent is enough for this build. This is a single bounded backend slice with one adjacent test file.
