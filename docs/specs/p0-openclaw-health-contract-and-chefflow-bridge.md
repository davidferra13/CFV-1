# P0 OpenClaw Health Contract And ChefFlow Bridge

Status: ready for builder
Priority: P0
Created: 2026-04-24
Scope: additive bridge-owned health contract for OpenClaw status truth consumed by ChefFlow

## Highest-Leverage Action

Build one canonical, stage-aware OpenClaw health contract that ChefFlow can read everywhere instead of inferring health independently from daemon logs, price history freshness, cron comments, sentinel route counts, or host scheduled-task state.

Evidence:

- The system audit says OpenClaw wrapper-level sync health was red while downstream price propagation appeared complete, creating at least two competing truths (`docs/anthropic-system-audit-2026-04-18.md:11`).
- The same audit says the repo cannot answer a simple health question with one source of truth (`docs/anthropic-system-audit-2026-04-18.md:286`).
- Follow-on audit says there is no one truthful answer to "Is OpenClaw healthy?" (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:225`).
- Follow-on audit says cadence is spread across daemon code, scheduled tasks, route comments, and docs, with no single configuration authority (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:381`).
- Fresh downstream price history proves some data flowed, but does not prove full sync health (`docs/anthropic-follow-on-audit-supplement-2026-04-18.md:140`).

## Non-Goals

- Do not rewrite OpenClaw capture.
- Do not change Pi scheduled tasks in this slice.
- Do not add public OpenClaw branding.
- Do not claim the pipeline is healthy from a single freshness timestamp.
- Do not delete existing health/status routes.

## Deliverable

Create an additive health contract layer in ChefFlow.

Minimum files:

1. `lib/openclaw/health-contract.ts`
2. `lib/openclaw/health-sources.ts`
3. `app/api/openclaw/health/route.ts`
4. `tests/unit/openclaw-health-contract.test.ts`
5. `docs/research/openclaw-health-contract-runtime-notes.md`

Optional, only if low-risk:

- Add the canonical result to an existing founder/admin health surface. Do not create a broad new UI if the route and tests are enough for this slice.

## Contract Shape

```ts
type OpenClawStageStatus = 'success' | 'partial' | 'stale' | 'failed' | 'unknown'

type OpenClawHealthStage = {
  id: string
  label: string
  status: OpenClawStageStatus
  checkedAt: string | null
  source: string
  freshnessSeconds?: number | null
  successCount?: number | null
  failureCount?: number | null
  message: string
}

type OpenClawHealthContract = {
  overall: OpenClawStageStatus
  generatedAt: string
  stages: OpenClawHealthStage[]
  cadencePolicy: {
    fullSyncExpectedSeconds: number | null
    deltaSyncExpectedSeconds: number | null
    priceFreshnessMaxAgeSeconds: number | null
    source: 'code' | 'env' | 'unknown'
  }
  contradictions: Array<{
    id: string
    severity: 'info' | 'warning' | 'critical'
    message: string
    sources: string[]
  }>
}
```

## Required Stages

The first implementation must represent these stages even if some are `unknown`:

- `daemon_or_wrapper`
- `scheduled_task_or_host`
- `capture_or_pull`
- `normalization`
- `price_history_write`
- `chefflow_mirror_read`
- `chef_costing_consumption`

## Status Rules

- `failed` beats `partial`, `stale`, and `success`.
- `partial` beats `stale` and `success`.
- `stale` beats `success`.
- `unknown` should not become `success`.
- Fresh price writes may make `price_history_write = success`, but they must not force `overall = success` when wrapper/daemon/capture stages fail or are unknown.
- If two stages conflict, preserve the contradiction in `contradictions`.

## Source Strategy

Use existing repo-local sources first:

- OpenClaw status/log files if already present under `logs`, `.openclaw-*`, or `data`
- existing OpenClaw query helpers under `lib/openclaw`
- existing cron/sync route behavior
- database freshness queries if existing DB helpers make that safe

If a source is missing, represent it as `unknown` with a clear message.

Do not add brittle shell calls to Windows Task Scheduler in this first slice. Host task state can be represented as `unknown` unless a safe existing helper already exists.

## API Route

`GET /api/openclaw/health` should:

- require admin/founder authorization if that is the local pattern for OpenClaw health
- return `OpenClawHealthContract`
- never return fake success on exceptions
- return `overall = failed` or `unknown` with a message if source reads fail
- be deterministic and testable

## Research Note

`docs/research/openclaw-health-contract-runtime-notes.md` must document:

- which sources are implemented now
- which sources are still unknown
- which contradictions are expected
- how this differs from old freshness-only checks
- what Pi-side or host-owned work remains out of scope

## Verification

Run:

```bash
node --test --import tsx tests/unit/openclaw-health-contract.test.ts
npm run typecheck
```

If repo-wide typecheck is blocked by unrelated dirty-checkout errors, run a focused typecheck for the touched files and document the blocker.

## Acceptance Criteria

- `lib/openclaw/health-contract.ts` exports the contract type and a pure reducer for overall status.
- Unit tests prove:
  - fresh price writes do not mask daemon failure
  - unknown host state does not become success
  - partial stage results become overall partial unless a failure exists
  - contradictions are preserved
  - missing source reads fail closed
- `/api/openclaw/health` returns the canonical contract.
- No existing route or UI is removed.
- No public-facing copy says OpenClaw is a product.
