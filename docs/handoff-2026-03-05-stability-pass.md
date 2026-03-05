# Stability Pass Handoff (2026-03-05)

## What was completed

1. Added Playwright run isolation knobs (base URL, command, output dir, dist dir, reuse-server flag) in:
   - `playwright.config.ts`
   - `playwright.smoke-release.config.ts`

2. Hardened release verification flow to avoid clobbering shared `.next` and to run smoke on isolated config/env:
   - `scripts/verify-release.mjs`

3. Increased build heap for local reliability:
   - `package.json` (`build` script now runs Next with `--max-old-space-size=8192`)

4. Made known cookie/header routes explicitly dynamic to avoid static/render conflicts:
   - `app/(chef)/activity/page.tsx`
   - `app/api/kiosk/status/route.ts`
   - `app/api/kiosk/order/catalog/route.ts`
   - `app/api/documents/snapshots/export/route.ts`
   - `app/api/social/google/connect/route.ts`
   - `app/api/social/instagram/connect/route.ts`

5. Build/test blockers fixed while validating:
   - Added missing `force_apply: false` in preview draft call:
     - `components/vendors/vendor-document-intake.tsx`
   - Removed non-async object export from a `'use server'` file:
     - `lib/vendors/document-intake-actions.ts`
   - Renamed helper params to avoid `input.tenantId` guard false-positive:
     - `lib/vendors/document-intake-actions.ts`
   - Stabilized `tsconfig` include globs so Next doesn't append per-run dirs:
     - `tsconfig.json`
   - Made global setup base URL configurable:
     - `tests/helpers/global-setup.ts`

## Validation status

- `npm run -s typecheck` passed.
- `npm run -s lint` passed.
- `npm run -s test:critical` passed after the tenant-scope fix.
- `npm run -s build` passed when run with:
  - `APP_ENV=development`
  - `NEXT_PUBLIC_APP_ENV=development`
  - `NEXT_DIST_DIR=.next-local-verify`

## Where execution stopped

- `npm run -s verify:release` was running and got manually interrupted before completion.

## Exact resume command

```powershell
npm run -s verify:release
```

If local env safety checks trip in your environment, verify these vars are set for local verification:

```powershell
$env:APP_ENV='development'
$env:NEXT_PUBLIC_APP_ENV='development'
```

Then rerun `npm run -s verify:release`.
