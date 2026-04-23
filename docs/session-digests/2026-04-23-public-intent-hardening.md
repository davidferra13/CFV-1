# Session Digest: Public intent hardening

**Date:** 2026-04-23
**Agent:** Builder (Opus 4.6)
**Branch:** main
**Commits:** `pending`

## What Was Done

- Added `lib/security/public-intent-guard.ts` as the shared backend guard for public intent-heavy mutations.
- Moved open booking, open-booking natural-language parse, public chef inquiry, embed inquiry, and instant booking onto the shared guard for IP and email throttles, bounded JSON bodies where routes read JSON, safe request metadata, silent honeypot handling, and optional Turnstile hooks.
- Hardened instant booking before any client, inquiry, event, event-series, event-session, or Stripe checkout writes. Severe-anaphylaxis cases still fail closed, tenant still comes from chef lookup, and Stripe transfer routing and metadata stay intact.
- Added short-window anonymous intent dedupe plus Stripe idempotency for instant booking so repeated anonymous attempts for the same chef, email, date, and event intent do not fan out parallel checkout sessions.
- Added token-scoped rate limits to the guest portal lookup and proposal approve or decline flows as the low-risk token-flow patch in this pass.
- Added focused unit coverage for the shared guard and the new public-intent flow behavior, then re-verified `/book` and `/chef/df-private-chef/inquire` in a live isolated browser session.

## Recent Commits

- Pending closeout commit for this slice

## Files Touched

- `lib/security/public-intent-guard.ts`
- `app/api/book/route.ts`
- `app/api/book/parse/route.ts`
- `app/api/embed/inquiry/route.ts`
- `lib/inquiries/public-actions.ts`
- `lib/booking/instant-book-actions.ts`
- `components/booking/booking-form.tsx`
- `lib/sharing/actions.ts`
- `lib/proposals/client-proposal-actions.ts`
- `tests/unit/public-intent-guard.test.ts`
- `tests/unit/public-intent-flows.test.ts`
- `tests/unit/open-booking.route.test.ts`
- `docs/changes/2026-04-23-public-intent-hardening.md`
- `docs/build-state.md`
- `docs/product-blueprint.md`
- `project-map/chef-os/inquiries.md`
- `docs/session-log.md`

## Decisions Made

- Kept the public product model intact. Discovery, booking start, direct inquiry, tokenized guest and client access, and instant booking remain public up to checkout.
- Put abuse controls on the mutation boundaries instead of adding new page-load auth gates.
- Used a short-lived anonymous intent key plus Stripe idempotency rather than forcing account creation before checkout.

## Context for Next Agent

- The current local dataset still has no chef with both `booking_enabled = true` and a populated `booking_slug`, so direct browser proof for `/book/[chefSlug]` is still pending against a dataset that actually exposes that route.
- Tokenized public flows still merit a deeper replay and rotation audit. This pass only landed the obvious low-risk guard gaps.
- The repo remains heavily dirty outside this slice. This closeout stages only the public-intent hardening patch and leaves unrelated worktree changes alone.

Build state on departure: focused slice green; `npm run typecheck` exits `0`; browser proof captured on isolated `http://localhost:3111`
