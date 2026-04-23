# Public Intent Hardening Pass

Date: 2026-04-23

## What changed

- Added `lib/security/public-intent-guard.ts` as the shared backend guard for public intent-heavy flows.
- Standardized safe request metadata extraction, IP and optional email throttling, honeypot handling, bounded JSON body reads, and optional Turnstile verification hooks behind one contract.
- Rewired open booking and embed inquiry API routes to use the shared guard before parsing or mutating data.
- Rewired public chef inquiry server actions to use the same guard model for IP/email abuse controls and honeypot handling.
- Hardened instant booking before any client, inquiry, event, series, session, or Stripe checkout creation, including severe-allergy pre-write blocking and short-window anonymous checkout dedupe.
- Added token-scoped rate limits to guest portal reads and proposal approval/decline mutations where those public token flows were still light on self-defense.

## Why

The public booking and inquiry surfaces are intentionally open, but their mutation paths still need consistent backend abuse controls. This pass keeps the public product model intact while reducing bot spam, repeated anonymous checkout creation, and oversized-body abuse.

## Verification

- `node --test --import tsx tests/unit/public-intent-guard.test.ts tests/unit/public-intent-flows.test.ts tests/unit/open-booking.route.test.ts tests/unit/public-intake-body-guards.test.ts`
- `npm run typecheck`
- `npx eslint lib/security/public-intent-guard.ts app/api/book/route.ts app/api/book/parse/route.ts app/api/embed/inquiry/route.ts lib/inquiries/public-actions.ts lib/booking/instant-book-actions.ts components/booking/booking-form.tsx lib/sharing/actions.ts lib/proposals/client-proposal-actions.ts tests/unit/public-intent-guard.test.ts tests/unit/public-intent-flows.test.ts tests/unit/open-booking.route.test.ts`
- Browser verification on `http://localhost:3111`:
  - `/book` loaded, accepted draft input, and kept `website_url` out of `sessionStorage`
  - `/chef/df-private-chef/inquire` loaded successfully
  - Screenshots saved under `public/proof/`

## Follow-up

- The current local dataset does not expose a live chef-specific booking page with `booking_enabled = true` and a populated `booking_slug`, so the direct `/book/[chefSlug]` surface still needs browser verification against a dataset that actually publishes one.
- Proposal and guest-token public flows have rate limits and token expiry/revocation checks, but a deeper audit of token rotation and replay behavior is still worth a dedicated pass.
