# P0 OpenClaw Health Contract Consumer Bridge

Status: ready for builder
Priority: P0
Created: 2026-04-24
Scope: additive ChefFlow consumers of the canonical OpenClaw health contract

## Single Highest-Leverage Action Remaining

Add the canonical `OpenClawHealthContract` into existing ChefFlow health consumers, while preserving every legacy response field.

Do this for:

1. `GET /api/openclaw/status`
2. `GET /api/sentinel/sync-status`

Do not create a new health model and do not remove old fields. The new contract already exists; the remaining leverage is making existing readers carry that truth so ChefFlow stops relying on older inferred statuses.

## Evidence

- The original scope requires a stage-aware contract ChefFlow can read everywhere instead of inferring health from daemon logs, freshness, cron comments, sentinel route counts, or host state (`docs/specs/p0-openclaw-health-contract-and-chefflow-bridge.md:6`, `docs/specs/p0-openclaw-health-contract-and-chefflow-bridge.md:10`).
- The same scope explicitly says not to delete existing health/status routes (`docs/specs/p0-openclaw-health-contract-and-chefflow-bridge.md:26`).
- The same scope allows adding the canonical result to an existing founder/admin health surface if low-risk (`docs/specs/p0-openclaw-health-contract-and-chefflow-bridge.md:40`-`42`).
- The canonical contract type now exists with `overall`, `generatedAt`, `stages`, `cadencePolicy`, and `contradictions` (`lib/openclaw/health-contract.ts:50`-`56`).
- The reducer and builder now preserve contradictions and reduce stage severity into canonical `overall` (`lib/openclaw/health-contract.ts:417`-`447`).
- The runtime source bridge now reads the implemented repo-local sources and returns contract input (`lib/openclaw/health-sources.ts:360`-`395`).
- The new admin route already returns the canonical contract directly (`app/api/openclaw/health/route.ts:14`-`19`).
- `GET /api/openclaw/status` still imports and returns only the older `getOpenClawRuntimeHealth()` shape (`app/api/openclaw/status/route.ts:2`, `app/api/openclaw/status/route.ts:16`-`55`).
- `GET /api/sentinel/sync-status` still imports and returns only the older `getOpenClawRuntimeHealth()` shape (`app/api/sentinel/sync-status/route.ts:3`, `app/api/sentinel/sync-status/route.ts:13`-`28`).

## Non-Goals

- Do not remove `getOpenClawRuntimeHealth()`.
- Do not remove, rename, or break any legacy JSON fields from `/api/openclaw/status` or `/api/sentinel/sync-status`.
- Do not change Pi scheduled tasks, Windows Task Scheduler, OpenClaw capture, or database schema.
- Do not add public-facing OpenClaw product copy.
- Do not claim health from freshness-only fields.

## Deliverable

Minimum files:

1. `app/api/openclaw/status/route.ts`
2. `app/api/sentinel/sync-status/route.ts`
3. `tests/unit/openclaw-health-consumer-bridge.test.ts`
4. `docs/research/openclaw-health-contract-runtime-notes.md`

Optional only if already present and low-risk:

- Add one sentence to an existing admin/internal docs note saying the legacy status routes now include a `canonical` field.

## Required Behavior

### `/api/openclaw/status`

Keep the current response shape intact. Add a new top-level field:

```ts
canonical: OpenClawHealthContract
```

Also add a small compatibility field under existing `health`:

```ts
health: {
  canonical_overall: OpenClawStageStatus
  canonical_contradictions: number
  // all existing health fields remain unchanged
}
```

The legacy top-level `status` may remain mapped from the old runtime health for compatibility. Do not use it as the canonical truth.

### `/api/sentinel/sync-status`

Keep the current response shape intact. Add:

```ts
canonical: OpenClawHealthContract
canonicalStatus: OpenClawStageStatus
canonicalContradictions: OpenClawHealthContract['contradictions']
```

The existing `status`, `overall`, `bridge`, `mirror`, `pi`, `wrapper`, and `warnings` fields must remain.

### Error Handling

- Fetch legacy runtime health and canonical health independently enough that a canonical failure cannot produce fake success.
- Prefer `Promise.allSettled()` or an equivalent explicit fail-closed path.
- If canonical source reads fail, use `getOpenClawHealthContract()` so the contract returns `overall = failed` with source-read failure stages.
- If the old runtime health fails but canonical health succeeds, return the existing error status expected by the route unless preserving the old route contract clearly allows a partial response. Do not silently convert old route exceptions to success.

## Test Requirements

Create `tests/unit/openclaw-health-consumer-bridge.test.ts` as a static route contract test. It can read route source as text rather than booting Next.js.

Prove:

- `/api/openclaw/status` imports `getOpenClawHealthContract`.
- `/api/openclaw/status` includes a top-level `canonical` field.
- `/api/openclaw/status` keeps legacy `sync` and `health` fields.
- `/api/sentinel/sync-status` imports `getOpenClawHealthContract`.
- `/api/sentinel/sync-status` includes `canonical`, `canonicalStatus`, and `canonicalContradictions`.
- `/api/sentinel/sync-status` keeps legacy `status`, `overall`, `bridge`, `mirror`, `pi`, and `wrapper` fields.
- Neither route removes `getOpenClawRuntimeHealth`.

## Verification

Run:

```bash
node --test --import tsx tests/unit/openclaw-health-contract.test.ts tests/unit/openclaw-health-consumer-bridge.test.ts
npm run typecheck
```

If repo-wide typecheck is blocked by unrelated dirty-checkout errors, run a focused typecheck for the touched route/test files and document the blocker.

## Acceptance Criteria

- Existing routes are still present and backward compatible.
- Existing legacy JSON keys are preserved.
- Both existing consumers carry the canonical stage-aware contract.
- Unit tests prove the consumer bridge and backward compatibility.
- No public-facing copy treats OpenClaw as a product.
- No host scheduler, Pi service, or capture behavior is changed.
