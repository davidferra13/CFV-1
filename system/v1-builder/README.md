# V1 Builder Control Spine

This directory is ChefFlow private developer infrastructure. It is not a product database, public route, scheduler, or autonomous daemon.

## Lifecycle

Raw intake from Sticky Notes, 3977, specs, and persona synthesis must be classified before it can become build work.

```text
intake -> V1 governor -> approved queue -> claim -> build -> validation -> receipt -> Mission Control
```

Only records in `approved-queue.jsonl` with `approved_v1_blocker` or current-lane `approved_v1_support` classifications are buildable.

## State Files

- `approved-queue.jsonl`: append-only approved V1 queue records.
- `blocked.jsonl`: records that cannot proceed and their unblock criteria.
- `research-queue.jsonl`: records needing evidence before build approval.
- `parked-v2.jsonl`: V2 ideas preserved outside the active build lane.
- `escalations.jsonl`: Founder Authority questions.
- `overrides.jsonl`: explicit developer overrides and risk notes.
- `claims/*.json`: active or historical builder claims.
- `receipts/*.json`: append-only validation and shipping receipts.

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

## Operator Rules

- Do not write raw notes directly into the approved queue.
- Do not auto-build parked V2 or research records.
- Do not reclaim stale claims automatically.
- Do not edit receipts after writing them.
- Do not store customer data, secrets, auth tokens, or production database state here.
