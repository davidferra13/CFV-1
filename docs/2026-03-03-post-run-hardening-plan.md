# 2026-03-03 Post-Run Hardening Plan

## Run Outcome

- Full coverage sweep completed on March 3, 2026 around 7:47 PM ET.
- Playwright last-run marker reports `status: passed`.

## What This Pass Did Not Prove

- Admin coverage was not truly validated because admin auth state is empty unless `ADMIN_E2E_EMAIL` and `ADMIN_E2E_PASSWORD` are configured.
- Test pass does not guarantee healthy runtime behavior under load; dev server still showed severe latency during the run.

## Highest-Priority Improvements

1. Enforce real admin coverage in hardening runs.
   - Added `COVERAGE_REQUIRE_ADMIN` enforcement path for admin coverage tests.
   - Overnight runner now defaults to `--require-admin=true`.
2. Make overnight coverage recoverable and auditable.
   - Added sequential project runner with retry, resume, per-project logs, and final summary report.
3. Reduce false green status.
   - Missing admin auth now becomes a hard failure (when `COVERAGE_REQUIRE_ADMIN=true`) instead of silent skip.

## Current Stability Risks

1. Dev runtime health under load.
   - During long sweeps, `/` and `/api/health` timed out repeatedly.
2. High memory pressure in Next dev process.
   - Worker process memory grew to very high levels during test marathon.
3. Observability gap for ad-hoc runs.
   - Plain line-reporter runs provide poor post-mortem data unless explicitly logged.

## Next Execution Plan

1. Configure admin E2E credentials in `.env.local` and regenerate `.auth/admin.json`.
2. Run overnight coverage with strict admin requirement enabled (default in the new runner).
3. Capture morning summary and address first failing project before broad reruns.
4. Move long sweeps to production-mode server (`next build` + `next start`) for runtime consistency.
