# V1 Builder Control Spine

This directory is ChefFlow private developer infrastructure. It is not a product database or public route.

## Lifecycle

Raw intake from Sticky Notes, 3977, specs, and persona synthesis must be classified before it can become build work.

```text
intake -> V1 governor -> approved queue -> claim -> build -> validation -> receipt -> Mission Control
```

Only records in `approved-queue.jsonl` with `approved_v1_blocker` or current-lane `approved_v1_support` classifications are buildable.
The autonomous runner consumes only those buildable records and skips anything with a prior receipt.

## State Files

- `approved-queue.jsonl`: append-only approved V1 queue records.
- `blocked.jsonl`: records that cannot proceed and their unblock criteria.
- `research-queue.jsonl`: records needing evidence before build approval.
- `parked-v2.jsonl`: V2 ideas preserved outside the active build lane.
- `escalations.jsonl`: Founder Authority questions.
- `overrides.jsonl`: explicit developer overrides and risk notes.
- `claims/*.json`: active or historical builder claims.
- `receipts/*.json`: append-only validation and shipping receipts.
- `build-packets/*.md`: task packets handed to the Codex executor.
- `runner-state.json`: current local runner state for Mission Control.

Mission Control reads these files. It must show read or parse failures honestly. Missing or malformed files are not empty queues.

## CLI Flow

Use `v1-builder:submit` for new intake instead of hand-writing JSON.

```powershell
npm run v1-builder:submit -- -- --title "Research pricing gap" --reason "Needs evidence before build."
```

That defaults to `research-queue.jsonl`. To put work directly into the buildable queue, the record must be explicitly classified and marked as governor-approved:

```powershell
npm run v1-builder:submit -- -- --title "Fix quote safety" --reason "V1 blocker." --classification approved_v1_blocker --v1-governor-approved
```

To promote an existing research, blocked, or parked record without deleting history:

```powershell
npm run v1-builder:promote -- -- --from v1-20260430-example --classification approved_v1_blocker --reason "Evidence confirmed this is V1." --v1-governor-approved
```

Promotion appends a new record. It does not remove the source record.

## Autonomous Runner

Run one build cycle:

```powershell
npm run v1-builder:run-once
```

Run the resident loop:

```powershell
npm run v1-builder:runner -- -- --interval 300 --commitRecords
```

Start it hidden in the background:

```powershell
npm run v1-builder:runner:start -- -IntervalSeconds 300 -CommitRecords
```

Stop that runner:

```powershell
npm run v1-builder:runner:stop
```

The default executor is:

```text
codex exec --cd <repo> --sandbox danger-full-access --ask-for-approval never <build packet>
```

The runner refuses to start on a dirty git worktree, blocks on fresh or stale claims, writes an append-only claim, creates a build packet, invokes the executor, records a receipt, releases the claim with an append-only status record, and stops on blocked or failed runs. Mission Control reads `runner-state.json`.

## Operator Rules

- Do not write raw notes directly into the approved queue.
- Do not auto-build parked V2 or research records.
- Do not reclaim stale claims automatically.
- Do not edit receipts after writing them.
- Do not count tasks with receipts as still buildable.
- Do not store customer data, secrets, auth tokens, or production database state here.
