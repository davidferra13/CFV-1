# Chef Client Ops Snapshot Reuse

Date: 2026-04-23

## Gap

The chef-facing client detail page still relied on coarse lifetime stats and light portal telemetry even though the authenticated client workspace already had a richer operational snapshot for payments, proposals, profile readiness, and RSVP state.

## Evidence

- `lib/client-dashboard/actions.ts` and `lib/client-work-graph/actions.ts` already assembled the richer authenticated-client stats.
- `app/(chef)/clients/[id]/page.tsx` still rendered only the coarse statistics cards plus portal-link state and engagement badges.
- `lib/clients/actions.ts` already returned `outstandingBalanceCents`, but the chef page was not surfacing it in the higher-signal action block the handoff asked for.

## Why The Old Logic Was Insufficient

- The chef's main decision surface did not reuse the richer operational view that already existed for the client.
- The page hid useful payment, proposal, profile, and RSVP signals behind separate routes or did not surface them at all.
- Re-implementing the same queries directly in the chef page would have duplicated logic and created another drift point.

## Smallest Correct Move

- Extract one tenant-scoped shared snapshot builder from the authenticated client work-graph path.
- Keep the client-auth gate in `lib/client-work-graph/actions.ts`; do not bypass `requireClient()`.
- Reuse the extracted snapshot on `app/(chef)/clients/[id]/page.tsx` for only the highest-signal chef-facing stats.
- Fail closed when the shared snapshot cannot be loaded.

## What Shipped

- Added `lib/client-work-graph/shared-snapshot.ts` as the shared tenant-scoped snapshot layer.
- Rewired `lib/client-work-graph/actions.ts` to build the full authenticated-client work graph on top of that shared snapshot instead of owning the shared queries directly.
- Reused the shared `buildClientActionRequiredSummary()` helper in `lib/client-dashboard/actions.ts` so dashboard and chef-client detail read the same action-required summary contract.
- Updated `app/(chef)/clients/[id]/page.tsx` to render `Client Ops Snapshot` with:
  - action-required counts
  - outstanding balance and payment state
  - profile completeness, pending meal requests, and signal-alert state
  - next active RSVP or share state
- Added an explicit `Client Ops Snapshot Unavailable` card so the chef surface does not fake zero states when the shared snapshot fails.
- Added focused tests for the shared snapshot contract and the chef-surface reuse guard.

## Validation

- `node --test --import tsx tests/unit/client-work-graph.test.ts tests/unit/client-work-graph-shared-snapshot.test.ts tests/unit/client-work-graph-surface-guard.test.ts tests/unit/chef-client-ops-surface-guard.test.ts`
- `npm run typecheck`
- `graphify update .`

## Live Verification Status

- Started a fresh isolated dev server on `http://127.0.0.1:3112` with `E2E_ALLOW_TEST_AUTH=true`.
- Seeded chef auth through `POST /api/e2e/auth`.
- Verified `/clients` rendered and then opened a live client route at `/clients/9fe3cea4-45ab-4019-963a-e852c2779e7c`.
- Confirmed the page rendered `Client Ops Snapshot` and the text excerpt included real shared values for action required, balance, profile readiness, and the honest sparse-data state `No active RSVP lane`.
