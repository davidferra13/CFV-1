# Work Ledger Core Proof Pack

> Run: `RUN-20260908-WORK-LEDGER-CORE`
> Queue item: `BQ-20260908T230001Z-automatic-work-ledger-core`
> Branch: `codex/work-ledger-core-20260908`
> Worktree: `C:\Users\david\Documents\CFv1-work-ledger-core`
> Status: IN-PROGRESS — runtime database and authenticated visual proof remain blocked

## Delivered checkpoint

- Canonical evidence, session, evidence-link, correction, rule, and capture-device schema.
- Tenant RLS, append-only evidence/corrections, tenant-scoped idempotency, and one-open-clock enforcement.
- Deterministic inference, summaries, timezone handling, validators, repositories, and authenticated actions.
- Authenticated evidence and reconstruction APIs plus cron-authenticated scheduled reconstruction.
- Compatibility projectors for admin logs, staff punches, and event phases.
- Review UI at `/insights/time-analysis` with manual fallback, proposed review, correction, split, merge, rejection, actor lanes, and coverage warnings.
- Approved-only economics and separate David, agent, staff, and system totals.
- Privacy boundary rejecting raw-content payload keys and oversized metadata.

## Passing verification

- Focused unit suite: `node --test --import tsx 'tests/unit/work-ledger.*.test.ts'`
  - Result: 15 tests passed, 0 failed.
- TypeScript: `node --max-old-space-size=12288 .\node_modules\typescript\bin\tsc --noEmit --skipLibCheck`
  - Result: exit 0.
- Wiring: `node scripts/regression-firewall.mjs --skip-nav --skip-typecheck --skip-runtime --json`
  - Result: 982 routes inspected, 979 wired, 0 weak routes, 0 orphans.
  - Affected canonical route: `/insights/time-analysis`.
- Production build: `node --max-old-space-size=32768 .\node_modules\next\dist\bin\next build --no-lint`
  - Result: exit 0 in 1,470.01 seconds; 1,037 routes generated.
- Fail-closed API probes while the local app was running:
  - `POST /api/v2/work-ledger/evidence` returned 401 without authentication.
  - `POST /api/v2/work-ledger/reconstruct` returned 401 without authentication.
  - `POST /api/scheduled/work-ledger-reconstruct` returned 401 without cron authentication.
- Unauthenticated `/insights/time-analysis` returned a 307 sign-in redirect.
- All three new API routes compiled cleanly in the dev server.

## Known inherited repository findings

- The full navigation audit reports seven pre-existing `/studio/*` hrefs without routes.
- The line-budget check reports 181 pre-existing oversized files.
- None of the new work-ledger files exceeds 900 lines.
- The production build emits inherited configuration, Browserslist, Sentry, middleware, React cache, and dynamic-route diagnostics; none caused the build to fail.

## Blocked proof

Local `DATABASE_URL` points to Postgres on `127.0.0.1:54322`, but the port is closed. The migration command and Playwright global setup both failed with `ECONNREFUSED`. No migration was partially applied.

The following Definition of Done evidence is therefore unavailable:

- migration applied to a disposable/local database;
- Jean fixture reconstruction against the real schema;
- authenticated review mutations through the live route;
- authenticated browser console, network, and server-log review;
- authenticated screenshot of the timeline.

The Playwright ledger test exists at `tests/e2e/work-ledger.runtime.spec.ts` and is ready to run once local Postgres is restored. No external or privileged database was queried or changed.

## Safety and scope

- No email, message, or other outbound communication was sent.
- No historical Gmail, Google Messages, or location data was accessed or imported.
- The isolated authentication-state copy used for runtime attempts was deleted after verification.
- Environment files remain ignored and are not included in source control.
- The pre-existing untracked `lib/hub/hub-push-subscriptions-internal.ts` dependency was not modified and must not be committed with this branch.

## Next verification gate

1. Restore local Postgres on `127.0.0.1:54322`.
2. Apply `lib/db/migrations/0005_work_ledger_core.sql` locally.
3. Run the focused suite and `tests/e2e/work-ledger.runtime.spec.ts`.
4. Capture authenticated UI, console, network, and server-log evidence.
5. Confirm compatibility ingestion does not double-count, then mark the queue item complete.

Until those checks pass, the queue item remains in flight by design.
