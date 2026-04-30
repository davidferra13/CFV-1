# Spec: Autonomous V1 Builder Contract

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/specs/p0-builder-agent-foundation.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-30 00:00 | Codex         |        |
| Status: ready | 2026-04-30 00:00 | Codex         |        |

---

## Developer Notes

### Raw Signal

The master answer is bigger than a V1 governor by itself. The problem is uncontrolled conversion of ideas into code without a durable finish-line system. ChefFlow is trying to build a product that normally requires a full team, and the developer is manually orchestrating agents all day. That creates output, but the developer is still the bottleneck for deciding what matters, approving every build, noticing duplication, remembering the goal, monitoring branches, turning ideas into tasks, preventing scope explosion, and verifying what is actually done.

ChefFlow should become an independent chef operating system that can run paid culinary work from inquiry to follow-up without a shadow system. V1 is not everything a chef could ever want. V1 is the smallest complete, trustworthy operating loop that makes a real chef able to run real paid work.

The correct solution is a four-part operating system:

- Governor: classifies ideas as V1 blocker, V1 support, V2, research, duplicate, blocked, or reject.
- Queue: turns approved V1 work into ordered, buildable tasks.
- Autonomous Builder Loop: a Codex-driven worker pulls from the approved V1 queue, builds on isolated branches, validates, commits, pushes, and records receipts.
- Mission Control: shows active lane, current task, branches, blockers, parked V2 ideas, overrides, validation state, and builder receipts.

Hermes should not be the unchecked brain of ChefFlow. Hermes may become intake and dispatch if isolated and governed, but codebase work belongs to Codex or a Codex-backed worker. The safe architecture is: ideas to Hermes or intake, V1 governor, approved queue, Codex builder, validation, commit and push, Mission Control. The master rule is: infinite ideas are allowed, but only a small number become active work. Everything else is captured, classified, and parked.

### Developer Intent

- **Core goal:** Define the contract for a governed autonomous build pipeline that only turns V1-approved work into code.
- **Key constraints:** Do not build product surface yet. Do not run Hermes yet. Do not start a swarm. Do not let Hermes decide product direction or mutate ChefFlow. Do not let agents build outside the active V1 lane without explicit override.
- **Motivation:** The developer needs one durable finish-line system that removes manual orchestration as the bottleneck without increasing code chaos.
- **Success from the developer's perspective:** A future builder can implement the loop without guessing what it may build, where queue state lives, how branches are named, what validation is mandatory, when to stop, and what Mission Control must display.

### 2026-04-30 Founder Authority Update

David's latest operating direction sharpens this spec:

- The human bottleneck is David manually prompting every build. That is the failure this system must remove.
- Codex should consume approved queues, specs, Sticky Notes, personas after triage, and durable instructions without asking David to fire every task by hand.
- David's role should become Founder Authority and orchestrator, not prompt operator.
- Routine implementation decisions should be made by Codex using repo patterns. Only true Founder Authority decisions should escalate.
- Escalations should be written into a durable queue or Sticky Notes intake output with a recommended default, not asked as one-off chat interruptions.
- The live monitor matters. A local Mission Control or launcher screen should show the project getting better through claims, branches, receipts, validations, blockers, and escalations.
- V1 readiness is pricing-led. If a chef anywhere in America cannot price a menu by zip or radius from system-owned observed or honestly modeled pricing data with high confidence labels, ChefFlow V1 is not ready.
- OpenClaw may be doing useful work while the website pricing engine still fails the product contract. The product blocker is trusted end-to-end pricing inside ChefFlow.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Continuity decision                 | attach                                                                                                                                                                   |
| Canonical owner                     | Attach to `docs/specs/p0-builder-agent-foundation.md`, `docs/v1-v2-governor.md`, and `docs/specs/mission-control-passive-dashboard.md`.                                  |
| Existing related routes             | Mission Control launcher at `scripts/launcher/index.html`; internal launcher APIs in `scripts/launcher/server.mjs`.                                                      |
| Existing related modules/components | Builder foundation spec, V1 governor, builder skill, context-continuity reports, work-continuity index, Mission Control passive dashboard spec.                          |
| Recent overlapping commits          | `424b519bb chore(agent): install v1 governor feature/haptic-explainable-event-audit`; recent branch also contains multiple agent-loop and control-tower commits.         |
| Dirty or claimed overlapping files  | Current worktree is dirty outside this docs-only slice. Active claims include context-continuity duplicate-prevention work. This spec does not edit those claimed files. |
| Duplicate or orphan risk            | Medium. The continuity scanner initially matched `client-intake` because of the word intake, but the real owner is internal builder/governor infrastructure.             |
| Why this is not a duplicate         | Existing docs define parts of the system, but none defines the end-to-end queue, branch, validation, receipt, stop, override, and Mission Control contract.              |
| What must not be rebuilt            | Do not replace the builder-agent foundation, the V1 governor, the existing Mission Control launcher, or work-continuity index. Extend them.                              |

### Current-State Summary

- `docs/specs/p0-builder-agent-foundation.md` already identifies the missing runtime pieces: no canonical memory index, no append-only execution journal, no shared loop detector, no release-hygiene scanner, and no builder-agent runtime entrypoint. It also specifies a file-based internal runtime and no database tables for phase 1. Evidence: `docs/specs/p0-builder-agent-foundation.md:57`, `docs/specs/p0-builder-agent-foundation.md:68`, `docs/specs/p0-builder-agent-foundation.md:114`, `docs/specs/p0-builder-agent-foundation.md:120`.
- The same foundation already defines CLI-only internal interaction and stop states, including idle, planned, running, blocked, and completed. Evidence: `docs/specs/p0-builder-agent-foundation.md:196`, `docs/specs/p0-builder-agent-foundation.md:204`, `docs/specs/p0-builder-agent-foundation.md:207`.
- `docs/v1-v2-governor.md` already defines the V1 classification classes, the active lane, the exact override phrase, and the Hermes/swarm limits. Evidence: `docs/v1-v2-governor.md:67`, `docs/v1-v2-governor.md:73`, `docs/v1-v2-governor.md:83`, `docs/v1-v2-governor.md:95`, `docs/v1-v2-governor.md:140`.
- The governor already says Mission Control must show the active V1 lane, spine completion, blockers, built-but-unverified work, parked V2 ideas, overrides, and next single allowed action. Evidence: `docs/v1-v2-governor.md:126`, `docs/v1-v2-governor.md:130`.
- `docs/specs/mission-control-passive-dashboard.md` already defines Mission Control as a passive, read-only dashboard with V1 progress, recent completions, active work, queue, live feed, and system health. Evidence: `docs/specs/mission-control-passive-dashboard.md:44`, `docs/specs/mission-control-passive-dashboard.md:132`, `docs/specs/mission-control-passive-dashboard.md:154`.
- The builder skill already says queue-aware builders must run `v1-governor`, scan ready specs, claim a spec, validate, and stop when no buildable specs remain. Evidence: `.claude/skills/builder/SKILL.md:18`, `.claude/skills/builder/SKILL.md:20`, `.claude/skills/builder/SKILL.md:24`, `.claude/skills/builder/SKILL.md:77`.
- Existing spec queue rules require one builder at a time, dependency order, read-only specs for builders unless correcting an inaccurate spec, and queue selection from the current handoff instead of filename sorting. Evidence: `docs/specs/README.md:31`, `docs/specs/README.md:32`, `docs/specs/README.md:33`, `docs/specs/README.md:39`.
- The Hermes decision memo rejects deploying Hermes for V1, rejects Hermes as a local resident runtime, rejects direct writes to ChefFlow state, and limits any future Hermes pilot to read-only ops intelligence, summaries, runbook drafts, and non-canonical notes. Evidence: `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md:100`, `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md:119`, `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md:226`, `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md:264`.
- The work-continuity index already exposes a start-here recommendation, built-unverified queue, blocked work, lanes, and status counts, but it is a status index, not an approved autonomous build queue. Evidence: `docs/research/work-continuity-index.md:28`, `docs/research/work-continuity-index.md:36`, `docs/research/work-continuity-index.md:40`, `docs/research/work-continuity-index.md:148`.

---

## What This Does (Plain English)

This contract defines the operating rules for a future autonomous V1 builder loop. It does not build the loop yet. It tells builders which tasks may become code, where approved tasks live, how the next task is selected, how branches are isolated, which validations are mandatory, where receipts are recorded, what Mission Control displays, when the loop must stop, and what requires explicit developer override.

## Why It Matters

ChefFlow already has ideas, specs, agents, and dashboards. The missing piece is a governed conversion path from idea to finished work. Without this contract, autonomous builders will either duplicate the developer's manual orchestration burden or turn too many ideas into code.

---

## Autonomous V1 Builder Contract

### 1. Intake Contract

Allowed intake sources:

- developer messages
- existing specs under `docs/specs/`
- work-continuity findings under `docs/research/work-continuity-index.md`
- explicit V1 governor parking-lot entries under `docs/v1-v2-governor.md`
- optional future Hermes dispatcher output, only if written as non-canonical markdown or JSON for review

Disallowed intake sources:

- direct Hermes product decisions
- unclassified persona demands
- broad backlog lists without V1 governor classification
- any task that requires destructive database operations, production deploy, direct main push, recipe generation, or public-facing AI recipe behavior

Every intake item must become one of:

- `approved_v1_blocker`
- `approved_v1_support`
- `parked_v2`
- `research_required`
- `duplicate_attach`
- `blocked`
- `rejected`

Only `approved_v1_blocker` and current-lane `approved_v1_support` can enter the active build queue.

### 1.1 Escalation Intake

The builder should not stop to ask David routine implementation questions. It should create an escalation record only when the decision requires Founder Authority, credentials, destructive database approval, production deployment approval, a V1 scope change, or a risk-bearing business decision.

Escalation records belong in `system/v1-builder/escalations.jsonl` until the Sticky Notes intake workflow can mirror them into David's preferred review surface.

Each escalation record must include:

```json
{
  "id": "esc-20260430-0001",
  "createdAt": "2026-04-30T00:00:00-04:00",
  "taskId": "v1-20260430-0001",
  "question": "Exact decision needed.",
  "whyCodexCannotDecide": "One sentence tied to hard stop, Founder Authority, money risk, data risk, or credentials.",
  "recommendedDefault": "What Codex recommends if David approves.",
  "blocks": "build|validation|push|runtime|none",
  "status": "open|answered|superseded",
  "answer": null
}
```

### 2. Queue Location

The canonical future queue should be file-based and internal:

```text
system/v1-builder/
  approved-queue.jsonl
  parked-v2.jsonl
  research-queue.jsonl
  blocked.jsonl
  escalations.jsonl
  overrides.jsonl
  receipts/
  claims/
```

Rationale:

- It matches the builder foundation's file-based phase 1 rule.
- It avoids customer-facing tables and database migrations.
- It is easy for Mission Control to read.
- It keeps receipts append-only and reviewable in git.

Each queue record must include:

```json
{
  "id": "v1-20260430-0001",
  "createdAt": "2026-04-30T00:00:00-04:00",
  "source": "developer|spec|work-continuity|governor|hermes-intake",
  "sourcePath": "docs/specs/example.md",
  "classification": "approved_v1_blocker",
  "activeLane": "V1 event spine stabilization",
  "title": "Short task title",
  "reason": "One sentence tied to trust, money, safety, completion, return, or source-of-truth clarity.",
  "canonicalOwner": "route, file, spec, or doc",
  "dependencies": [],
  "risk": "low|medium|high",
  "status": "queued|claimed|running|blocked|validated|pushed|rejected",
  "overrideId": null
}
```

### 3. Task Eligibility

The builder may build a task only when all of these are true:

1. The task is classified by the V1 governor.
2. The task is `approved_v1_blocker` or current-lane `approved_v1_support`.
3. A canonical owner is known.
4. Duplicate risk has been checked with context-continuity.
5. Dependencies are already `verified`, `built`, or explicitly waived by the developer.
6. The task does not require unapproved destructive database work, production deploy, main push, `drizzle-kit push`, server restart, or external credential action.
7. The task can be validated with concrete receipts.

Tasks that fail any check must move to `blocked.jsonl`, `research-queue.jsonl`, `parked-v2.jsonl`, or `duplicate_attach`, not active build.

### 4. Next-Task Selection

The autonomous loop selects exactly one active task at a time:

1. Refuse to run if another `system/v1-builder/claims/*.json` claim is active and fresh.
2. Load `docs/v1-v2-governor.md` for the active lane.
3. Load `system/v1-builder/approved-queue.jsonl`.
4. Exclude tasks with unmet dependencies, blocked status, duplicate status, or missing canonical owner.
5. Sort by classification, then risk, then age:
   - `approved_v1_blocker`
   - current-lane `approved_v1_support`
   - lower risk first when value is equal
   - oldest first when risk is equal
6. Claim one task by writing an append-only claim file before editing source code.
7. If no task qualifies, record `queue_empty` and stop.

No builder may pull directly from a broad brainstorm, persona batch, or Hermes output.

### 5. Branch Contract

Each run uses an isolated feature branch:

```text
feature/v1-builder-[short-task-slug]
```

Branch rules:

- Never run on `main`.
- Never push to `main`.
- Never force push.
- If already on a feature branch with unrelated dirty work, either create a new branch before edits or stop if branch ownership is ambiguous.
- Stage, commit, and push only files owned by the current task.

### 6. Builder Execution Contract

The Codex-backed worker must:

1. Run `omninet`, `v1-governor`, `context-continuity`, and `builder`.
2. Read the task record, source spec or evidence, `docs/build-state.md`, recent `docs/session-log.md`, and affected docs.
3. Produce a spike summary before implementation.
4. Implement exactly the queued task.
5. Update the claim and receipt after each major phase.
6. Validate with mandatory checks.
7. Commit and push the branch.
8. Mark the task `validated` or `blocked` with receipts.

If the spec is wrong, the worker updates the spec or task record first, records the correction, and does not improvise code.

### 7. Mandatory Validation

Every completed run must record:

- `git status --short` before and after
- branch name
- files touched
- context-continuity decision
- V1 governor classification
- typecheck result, usually `npm run typecheck:app` or the current repo-standard command
- build result only when explicitly allowed by the developer or existing builder gate permits it
- focused tests when code changed
- Playwright proof when UI changed and a server is available or explicitly approved to start
- compliance scan for no em dashes, no public forbidden names, no `@ts-nocheck`
- final commit hash
- push result

Validation failures block the task unless the failure is unrelated dirty-work pollution. If unrelated dirty work pollutes validation, record exact polluted evidence and stop without modifying unrelated files.

### 8. Receipt Contract

Each run writes an append-only receipt:

```text
system/v1-builder/receipts/YYYYMMDDTHHMMSSZ-[task-id].json
```

Receipt schema:

```json
{
  "taskId": "v1-20260430-0001",
  "branch": "feature/v1-builder-example",
  "classification": "approved_v1_blocker",
  "canonicalOwner": "docs/specs/example.md",
  "status": "validated",
  "startedAt": "2026-04-30T00:00:00-04:00",
  "finishedAt": "2026-04-30T00:30:00-04:00",
  "touchedFiles": [],
  "validations": [],
  "blockedReason": null,
  "commit": "abc1234",
  "pushed": true,
  "missionControlSummary": "One sentence."
}
```

Receipts are the source of truth for what the autonomous loop actually did. Mission Control reads receipts, not agent prose.

### 9. Mission Control Contract

Mission Control must show:

- active V1 lane
- current claimed task
- current branch
- task age and stale-claim warning
- V1 blocker queue
- current-lane V1 support queue
- blocked tasks with reasons
- parked V2 idea count and latest entries
- explicit overrides
- built-but-unverified work
- latest validation state
- latest commit and push receipt
- open Founder Authority escalations with recommended defaults
- pricing reliability status when V1 readiness or menu costing is in scope
- next single allowed action

Mission Control is read-only for autonomous work in the first implementation. Any action button that mutates queue or runs a builder belongs behind an explicit later spec and must be gated as internal-only.

The monitor must be useful as a passive room display. A developer should be able to leave it open and see whether ChefFlow is improving, blocked, idle, validating, or waiting for a Founder Authority answer without reading agent chat.

### 10. Hermes Contract

Hermes may only:

- ingest ideas into a non-canonical intake file
- summarize candidate tasks
- propose classifications for review
- dispatch a Codex prompt after a task is already approved by the V1 governor
- read receipts and write a human summary

Hermes must not:

- write ChefFlow product code
- mutate the database
- mutate canonical queues directly
- choose product direction
- approve its own tasks
- run local resident automation on the daily PC
- touch financial, lifecycle, identity, chef/client, or public product state

### 11. Stop Conditions

The loop must stop immediately when:

- queue is empty
- another fresh claim exists
- active branch is `main`
- dirty files overlap the task and are not owned by this run
- V1 governor classification is missing or disallows build
- context-continuity returns `merge-candidate`
- destructive DB work would be needed
- a migration is needed and the SQL has not been shown to the developer
- validation fails three times on the same issue
- typecheck or focused tests fail and cannot be isolated to unrelated dirty work
- pre-push or commit hooks report issues in owned files
- the task would require deploy, server restart, long-running server start, or `drizzle-kit push` without explicit approval
- Hermes or another runtime tries to bypass the queue

### 12. Override Contract

Only the developer can bypass the V1 governor with:

```text
Override V1 governor: build this anyway.
```

An override must create an `overrides.jsonl` entry with:

- exact override text
- task id
- reason
- timestamp
- branch
- risk
- validation plan

Overrides do not bypass hard stops for production deploy, destructive DB operations, main push, recipe generation, or unsafe data access.

---

## Files to Create

These files belong to the future implementation, not this docs-only contract pass.

| File                                     | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `system/v1-builder/README.md`            | Explains queue, claim, receipt, override, and parking-lot semantics. |
| `system/v1-builder/approved-queue.jsonl` | Append-only approved V1 build queue.                                 |
| `system/v1-builder/parked-v2.jsonl`      | Parked non-V1 ideas.                                                 |
| `system/v1-builder/research-queue.jsonl` | Ideas needing evidence before classification.                        |
| `system/v1-builder/blocked.jsonl`        | Blocked tasks with reasons and unblock criteria.                     |
| `system/v1-builder/escalations.jsonl`    | Founder Authority questions with recommended defaults and blockers.  |
| `system/v1-builder/overrides.jsonl`      | Explicit developer overrides.                                        |
| `lib/v1-builder/types.ts`                | Shared task, claim, receipt, validation, and status types.           |
| `lib/v1-builder/queue.ts`                | Queue parser, sorter, and eligibility checks.                        |
| `lib/v1-builder/receipts.ts`             | Append-only receipt writer and reader.                               |
| `scripts/v1-builder/next.mjs`            | Reads queue and prints the next eligible task.                       |
| `scripts/v1-builder/claim.mjs`           | Claims one task and writes claim file.                               |
| `scripts/v1-builder/record-receipt.mjs`  | Writes final receipt after validation and push.                      |
| `tests/unit/v1-builder-queue.test.ts`    | Verifies selection, stopping, and classification behavior.           |
| `tests/unit/v1-builder-receipts.test.ts` | Verifies receipt schema and append-only behavior.                    |

## Files to Modify

| File                                              | What to Change                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/v1-v2-governor.md`                          | Link the queue contract and replace empty parking-lot placeholders with queue file pointers.    |
| `docs/specs/p0-builder-agent-foundation.md`       | Add this contract as the next dependent implementation layer.                                   |
| `docs/specs/mission-control-passive-dashboard.md` | Add V1 builder queue and receipt fields to the passive display contract.                        |
| `scripts/launcher/server.mjs`                     | Later implementation only: read queue and receipts through internal Mission Control APIs.       |
| `scripts/launcher/index.html`                     | Later implementation only: display queue, claim, branch, receipt, and validation state.         |
| `system/canonical-surfaces.json`                  | Add the autonomous V1 builder loop as an internal canonical owner to prevent future misrouting. |

## Database Changes

None.

No database migrations are allowed for the first implementation. Queue, claim, and receipt state is internal, file-based, append-only, and reviewed through git.

## Data Model

The data model is the queue record, claim record, and receipt record described above. All records are append-only JSONL or JSON files under `system/v1-builder/`. No customer data, chef/client PII, financial secrets, or auth material belongs in these records.

## Server Actions

None in the first implementation.

This is internal developer infrastructure. Mission Control may expose internal launcher APIs later, but no Next.js server actions or customer-facing routes should be added for queue mutation.

## UI / Component Spec

Mission Control displays the contract read-only.

### Page Layout

Attach to the passive dashboard Live view:

- top strip: active V1 lane and current branch
- main queue zone: current claimed task and next V1 blockers
- validation zone: latest checks and latest receipt
- parking zone: V2, research, blocked, and overrides

### States

- **Loading:** Reading queue and receipts.
- **Empty:** Queue empty; show next allowed action as classification or research, not build.
- **Blocked:** Show blocker reason and required developer action.
- **Stale Claim:** Show claim age and branch, require human review before another claim.
- **Validated:** Show commit, pushed branch, and receipt path.
- **Error:** Show exact file read or parse failure. Do not render empty queue as success.

### Interactions

The first implementation is read-only. No run, approve, reject, deploy, restart, or push buttons.

---

## Edge Cases and Error Handling

| Scenario                                    | Correct Behavior                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Queue file missing                          | Show setup-required state and stop.                                                                |
| Queue record malformed                      | Move record to blocked with parse error if safe, otherwise stop and report exact line.             |
| Two fresh claims exist                      | Stop and show both claims.                                                                         |
| Claim is stale                              | Stop and require developer review before reclaiming.                                               |
| Task is V2                                  | Park it, do not build it.                                                                          |
| Task is duplicate                           | Attach it to canonical owner, do not create another surface.                                       |
| Hermes proposes a build                     | Treat it as intake only until V1 governor approves it.                                             |
| Validation polluted by unrelated dirty work | Record exact polluted files and stop without editing them.                                         |
| Push fails                                  | Commit remains local, receipt status becomes `push_failed`, and Mission Control shows the blocker. |

---

## Verification Steps

For this docs-only contract:

1. Confirm the spec includes developer notes, continuity preflight, contract sections, file plan, data model, stop conditions, and Mission Control display rules.
2. Run a targeted em dash scan on this file.
3. Confirm no product code, migrations, server actions, or UI files changed.

For the future implementation:

1. Create fixture queue records covering V1 blocker, V1 support, V2, research, duplicate, blocked, and reject.
2. Run `node scripts/v1-builder/next.mjs` and verify only eligible V1 work is selected.
3. Run `node scripts/v1-builder/claim.mjs` and verify a claim file is created before edits.
4. Simulate a stale claim and verify selection stops.
5. Simulate a malformed queue record and verify an honest blocked state.
6. Record a receipt and verify Mission Control reads the receipt instead of agent prose.
7. Run unit tests for queue sorting, eligibility, stop conditions, and receipt schema.

---

## Out of Scope

- Not implementing the autonomous loop in this pass.
- Not running Hermes.
- Not starting any server or swarm.
- Not creating database tables or migrations.
- Not deploying.
- Not adding mutating Mission Control buttons.
- Not changing ChefFlow product behavior.
- Not building V2 tasks.
- Not bypassing the V1 governor.

---

## Notes for Builder Agent

- Build this in two slices: file-based queue and receipt engine first, read-only Mission Control projection second.
- Treat `docs/v1-v2-governor.md` as the classification source and this spec as the execution contract.
- Keep all state internal, append-only, and git-reviewable.
- Use the existing builder-agent foundation instead of creating a parallel runtime.
- The first code implementation should prove selection, claim, stop, receipt, and read-only display. It should not run autonomous code edits yet.

---

## Spec Validation

1. **What exists today that this touches?** Builder foundation exists as a ready spec with file-based runtime, journal, loop guard, and no DB storage (`docs/specs/p0-builder-agent-foundation.md:80`, `docs/specs/p0-builder-agent-foundation.md:82`, `docs/specs/p0-builder-agent-foundation.md:83`, `docs/specs/p0-builder-agent-foundation.md:114`). The V1 governor exists and defines classifications, active lane, Mission Control requirements, and Hermes limits (`docs/v1-v2-governor.md:67`, `docs/v1-v2-governor.md:95`, `docs/v1-v2-governor.md:126`, `docs/v1-v2-governor.md:140`). Mission Control passive dashboard exists as a ready spec with queue and live-feed zones (`docs/specs/mission-control-passive-dashboard.md:44`, `docs/specs/mission-control-passive-dashboard.md:154`).
2. **What exactly changes?** This pass adds only `docs/specs/autonomous-v1-builder-contract.md`. Future implementation would add `system/v1-builder/*`, `lib/v1-builder/*`, `scripts/v1-builder/*`, tests, and read-only Mission Control projection.
3. **What assumptions are you making?** Verified: file-based internal state is the existing builder foundation direction (`docs/specs/p0-builder-agent-foundation.md:120`). Verified: Mission Control can consume file-derived status (`docs/specs/mission-control-passive-dashboard.md:222`). Unverified: exact launcher API shape for future queue reads, because implementation was intentionally not inspected deeply beyond existing docs.
4. **Where will this most likely break?** Queue selection can drift if builders keep using spec filename sorting instead of the approved queue. Mission Control can mislead if it treats missing files as empty queues. Branch ownership can collide on a dirty feature branch if claims are not enforced.
5. **What is underspecified?** The exact implementation language for `scripts/v1-builder/*` is intentionally left to the future builder but should follow the existing Node script style in `devtools/` and `scripts/`.
6. **What dependencies or prerequisites exist?** Depends on the builder-agent foundation and V1 governor. Does not require DB, migrations, credentials, server, or Hermes.
7. **What existing logic could this conflict with?** It must not conflict with `docs/specs/README.md` queue rules requiring one builder at a time and handoff-aware selection (`docs/specs/README.md:31`, `docs/specs/README.md:39`).
8. **What existing work could this duplicate or fragment?** The main risk is duplicating builder-agent foundation. This spec avoids that by making the foundation the dependency and limiting itself to V1 queue, branch, validation, and Mission Control contract.
9. **What is the end-to-end data flow?** Idea or spec enters intake, V1 governor classifies, eligible task goes to `approved-queue.jsonl`, builder claims one task, builds on feature branch, validates, commits, pushes, writes receipt, Mission Control reads queue and receipts.
10. **What is the correct implementation order?** Queue schema and tests, queue selector, claim writer, receipt writer, stop-condition tests, Mission Control read-only APIs, Mission Control display.
11. **What are the exact success criteria?** V2 tasks cannot be selected, duplicate tasks stop, stale claims stop, eligible V1 blockers are selected first, receipts are written after validation, Mission Control displays receipt truth, and no DB or public route mutation exists.
12. **What are the non-negotiable constraints?** No main push, no deploy, no destructive DB, no `drizzle-kit push`, no Hermes mutation, no product code without V1 approval, no fake success, no empty queue as success on read failure.
13. **What should NOT be touched?** Do not touch ChefFlow product routes, server actions, database schema, `types/database.ts`, public UI, or running servers.
14. **Is this the simplest complete version?** Yes. It defines the contract first and leaves implementation to a future build.
15. **If implemented exactly as written, what would still be wrong?** The autonomous loop would still not edit code by itself until a later implementation explicitly wires Codex execution. That is intentional for the first safe slice.

## Final Check

This spec is production-ready as a contract for the next implementation slice. The only uncertainty is the exact Mission Control API shape, which should be resolved during implementation by reading `scripts/launcher/server.mjs` around the existing status, queue, livefeed, and file-watcher endpoints.
