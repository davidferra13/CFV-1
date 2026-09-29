# DFPC and Hermes route proof (2026-09-28)

Branch `fix/dfpc-hermes-route-policy-20260928` starts from `main e944ed554897ddb0d7686b38312c7e28083a3e71`.

- `/dfpc` is classified public because the DF Private Chef host rewrites into it. The existing middleware host rule runs before public bypass, and direct `/dfpc` access on other hosts still returns 404. No host or network configuration changed.
- `/hermes` is classified admin in both route-policy tables. Middleware requires a signed-in admin session, the page calls `requireAdmin()`, the existing dev layout retains its owner-email check, and the exported dashboard Server Action calls `requireAdmin()` and checks the same owner email before reading data.
- The exact CI route-policy pair (`tests/unit/middleware.routing.test.ts` and `tests/unit/route-policy.public-coverage.test.ts`) passed 37/37 locally on Node 24 with existing dependencies.
- The additional legacy `tests/ci/route-coverage.test.ts` still reports 40 unrelated page classifications missing from `lib/security/route-policy.ts`. Its two DFPC/Hermes gaps are gone. No unrelated route tiers were guessed.
- This is source and local guard-chain evidence. No production login or live route test was performed; release remains gated.
