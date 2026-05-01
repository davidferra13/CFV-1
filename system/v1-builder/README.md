# V1 Builder Runtime

This folder is the internal, file-based state layer for the governed Codex builder loop.

It exists so ChefFlow asks do not depend on chat memory. Every non-trivial ask should land in one durable state: built, queued, blocked, parked, research required, duplicate attach, or rejected.

## Files

- `request-ledger.jsonl`: every durable ask and its final state.
- `approved-queue.jsonl`: V1-approved buildable work.
- `parked-v2.jsonl`: useful future work outside the active V1 lane.
- `research-queue.jsonl`: work needing evidence before classification.
- `blocked.jsonl`: tasks that cannot safely proceed.
- `escalations.jsonl`: Founder Authority questions with recommended defaults.
- `overrides.jsonl`: explicit developer override records.
- `claims/`: active or historical task claims.
- `receipts/`: append-only run receipts.
- `runtime/intake-normalizer-status.json`: latest source intake normalization summary.

## Intake Normalizer

The live builder only executes `approved-queue.jsonl`. Upstream sources such as specs, Sticky Notes outputs, persona outputs, old Codex queues, and agent findings must first pass through the intake normalizer:

```text
node scripts/v1-builder/normalize-intake.mjs --write
```

The normalizer writes one durable ledger state per new source item, then routes it to exactly one sink: approved queue, research queue, blocked, parked, rejected, or ledger-only duplicate attachment.

Use this flag to let a one-shot or watcher run normalize intake before selecting work:

```text
node scripts/v1-builder/run-once.mjs --mode dry-run --normalize-intake
node scripts/v1-builder/watch.mjs --mode live --normalize-intake
```

Runner-triggered normalization uses the `builder-gate` profile. It writes only a small capped set of approved V1 queue records plus visible hard-stop records, while deferring research, persona, legacy, and Sticky Notes noise out of the live execution path. Use the full normalizer only for deliberate backlog accounting:

```text
node scripts/v1-builder/normalize-intake.mjs --profile full --write
node scripts/v1-builder/normalize-intake.mjs --profile builder-gate --max-approved 3 --max-hard-stops 10 --write
```

## Module Gate

The intake normalizer and runner treat module ownership as part of queue eligibility. A ready spec must resolve to a concrete module owner before it can enter `approved-queue.jsonl`, and a queued task must resolve again before `next`, `claim`, or `run-once` can select it. Module evidence comes from the task record first, then `system/unified-build-queue/candidates.json`, then `devtools/module-decision.mjs` keyword inference.

If the decision is `unassigned` or `module_review_required`, the task is skipped before selection. `createClaim()` repeats the check and refuses to write a claim for unmoduled work.

## Runner Rule

The first implementation may select, claim, and record work. It must not run unattended code edits unless the task is already in `approved-queue.jsonl`, passes the V1 governor, has a canonical owner, and can be validated with receipts.

Starting a 24/7 resident process still requires an explicit launcher step outside this folder.
