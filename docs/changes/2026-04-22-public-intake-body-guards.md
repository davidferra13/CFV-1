# Public Intake Body Guards

## What changed

- Added `lib/api/request-body.ts` as the shared JSON body reader for intake routes.
- Hardened `app/api/book/route.ts`, `app/api/embed/inquiry/route.ts`, and `app/api/kiosk/inquiry/route.ts` to reject malformed JSON with `400` and oversized payloads with `413`.
- Preserved embed widget CORS headers on the new failure path so host sites still receive a clean browser-visible response.

## Why

The security checklist calls out payload-size and malformed-body handling on public POST surfaces. Before this slice, these intake routes could fall into their generic catch blocks and return `500`, which was both noisy and untruthful for users and operators.

## How it was verified

- `node --test --test-force-exit --import tsx tests/unit/public-intake-body-guards.test.ts`
- `node --test --test-force-exit --import tsx tests/unit/open-booking.route.test.ts`
- `node scripts/run-typecheck.mjs -p tsconfig.ci.json`
- `$env:NEXT_DIST_DIR='.next-intake-body-guard'; npm.cmd run build -- --no-lint`
- Live isolated app proof on `http://127.0.0.1:3401`
- `/book` loaded with a real form and screenshot proof at `public/proof/public-intake-body-guard-book-2026-04-22.png`
- `POST /api/book` with a valid low-fanout location returned `200`
- `POST /api/book` with malformed JSON returned `400`
- `POST /api/embed/inquiry` with an oversized body returned `413` and kept `Access-Control-Allow-Origin: *`
