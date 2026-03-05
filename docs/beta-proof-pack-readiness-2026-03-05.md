# Beta Proof Pack - Readiness Snapshot (2026-03-05)

## Verification Evidence

- Full gate command: `npm run verify:release`
- Passing run ID: `verify-36364-1772738832833`
- Result: `passed` (`test-results/verify-36364-1772738832833/.last-run.json`)

## What Passed

- `verify:secrets`
- `typecheck`
- `lint:strict`
- `test:critical`
- `test:unit`
- `build`
- `test:e2e:smoke:release`

## Fixes Applied During Verification

1. `tests/unit/auth.tenant-isolation.test.ts`

- Added admin observability file allowlist entry to remove a false-positive tenant-input violation in admin-only read filters.

2. `lib/auth/admin.ts`

- Added explicit `process.env.ADMIN_EMAILS` read path used by the tenant-isolation test contract.

3. `scripts/verify-release.mjs`

- Fixed release verifier env consistency by setting `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` during build to match smoke server origin (`http://localhost:3110` fallback).

## Hidden Risks Found In Runtime Logs (Priority Queue)

### P0 (launch-blocking)

1. RLS recursion in collaboration tables

- Error: `42P17 infinite recursion detected in policy for relation "chef_handoffs"` and `"chef_handoff_recipients"`.
- Impact: network/collaboration actions can fail unpredictably.
- Files: `lib/network/collab-actions.ts`, migration `supabase/migrations/20260330000026_chef_collaboration_network.sql`.

2. Ledger column mismatch in concentration risk

- Error: `column ledger_entries.type does not exist`.
- Impact: dashboard concentration widget silently fails in production logs.
- File: `lib/finance/concentration-actions.ts` (should query `entry_type`).

3. Receipt client column mismatch

- Error: `column clients_1.name does not exist`.
- Impact: receipt library queries break.
- File: `lib/receipts/library-actions.ts` (uses `clients(name)`; schema uses `full_name`).

4. Missing table in runtime schema cache

- Error: `PGRST205 Could not find table public.event_prep_blocks`.
- Impact: protected time blocks fail on affected environments.
- Files: `lib/scheduling/protected-time-actions.ts`, migration `supabase/migrations/20260304000001_event_prep_blocks.sql`.

### P1 (must fix before wider beta)

1. External dependency instability during run

- Error: Supabase `502 Bad gateway` and occasional `ECONNRESET` in simulation checks.

2. Static auth audit warnings

- Numerous API routes flagged as potentially unauthenticated.
- Validate intentional-public vs accidentally-public routes before open beta.

3. Admin client usage audit warnings

- Many files flagged for admin client usage outside narrow allowlist.
- Triage and document justified exceptions.

## Next 48-Hour Execution Plan

1. Patch schema/query mismatches

- Fix `entry_type` usage in concentration risk.
- Fix `clients.full_name` usage in receipt library joins.
- Verify by rerunning `npm run verify:release`.

2. Resolve collaboration RLS recursion

- Update problematic policies in `20260330000026_chef_collaboration_network.sql`.
- Rehearse on local/staging DB and rerun smoke plus affected unit tests.

3. Push migrations and refresh generated types on the beta DB

- Apply missing migration(s) for `event_prep_blocks`.
- Regenerate `types/database.ts`.

4. Tighten smoke signal quality

- Promote high-severity runtime console/database errors to test failures for release smoke.

## Beta Demo Narrative (Use With Skeptical Reviewers)

1. Show objective gates passed (`verify:release` run ID and timestamp).
2. Show issue discovery discipline (runtime risk queue above).
3. Show active closure plan with concrete file-level ownership.
4. Re-run `verify:release` after P0 fixes to demonstrate measurable improvement.
