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

## Runner Rule

The first implementation may select, claim, and record work. It must not run unattended code edits unless the task is already in `approved-queue.jsonl`, passes the V1 governor, has a canonical owner, and can be validated with receipts.

Starting a 24/7 resident process still requires an explicit launcher step outside this folder.
