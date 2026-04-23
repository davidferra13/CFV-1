# Session Digest: Canonical Intake Lanes

**Date:** 2026-04-22
**Agent:** Codex
**Branch:** main
**Commits:** pending at digest update time

## What Changed

- Added `lib/public/intake-lane-config.ts` as the canonical public intake-lane contract for `open_booking`, `public_profile_inquiry`, `embed_inquiry`, `kiosk_inquiry`, `wix_form`, and `instant_book`.
- Added `components/public/intake-lane-expectations.tsx` and reused it on `/book` and `/chef/[slug]/inquire` so public expectation copy now matches the actual routing lane.
- Reused the shared helper in every live public ingress writer: `app/api/book/route.ts`, `lib/inquiries/public-actions.ts`, `app/api/embed/inquiry/route.ts`, `app/api/kiosk/inquiry/route.ts`, `lib/wix/process.ts`, and `lib/booking/instant-book-actions.ts`.
- Reused `deriveProvenance()` in `lib/admin/inquiry-admin-actions.ts` and `lib/admin/activity-feed.ts` so admin reporting no longer treats every website inquiry as open booking.
- Updated blueprint, project-map, user manual, audit, and build-state docs so the slice is documented truthfully.

## What Was Validated

- Focused ESLint passed for the touched public intake, admin provenance, and targeted test files.
- `node --test --import tsx tests/unit/intake-lane-config.test.ts tests/unit/intake-lane-source-truth.test.ts tests/unit/source-provenance.test.ts` passed.
- `node --test --import tsx tests/unit/open-booking-intake-parity.test.ts` passed.
- `node --test --test-force-exit --import tsx tests/unit/open-booking.route.test.ts` passed, with existing non-fatal log noise from notification and Dinner Circle side effects.
- Repo-wide CI typecheck passed via `node scripts/run-typecheck.mjs -p tsconfig.ci.json`.
- Direct browser verification passed on isolated `http://127.0.0.1:3300` for `/book` and `/chef/df-private-chef/inquire`.
- Screenshots saved to `test-screenshots/intake-lane-open-booking.png` and `test-screenshots/intake-lane-public-inquiry.png`.

## What Remains Open

- A fresh production build re-check for this slice is still unconfirmed. `$env:NEXT_DIST_DIR='.next-build-intake-lane-check'; npm.cmd run build -- --no-lint` timed out after about 15 minutes and never wrote `BUILD_ID`, so the last confirmed full-build baseline remains the earlier 2026-04-22 share-token pass.
- The next highest-leverage follow-up remains the route-aware reassurance and confirmation spine. The lane contract is canonical now, but pre-submit and post-submit messaging is still only partially shared.
- The repo remains dirty outside this slice. No unrelated files were reverted or folded into this work.

## What The Next Agent Should Do

1. Start from the new lane contract in `lib/public/intake-lane-config.ts` instead of adding route-local source labels or expectation copy.
2. Extend the reassurance spine against the now-canonical lane keys, not against raw `channel` values or page-specific heuristics.
3. If a full production build is required before the next slice, re-run it on a fresh isolated dist dir and confirm `BUILD_ID` exists before updating the build baseline.
