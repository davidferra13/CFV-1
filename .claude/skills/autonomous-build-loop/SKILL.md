---
name: autonomous-build-loop
description: Use when David says Codex should stop making him prompt every build, asks why things are not being built, says he is repeating himself, asks for autonomous or 24/7 building, references builder queues, Sticky Notes as build input, Mission Control as a live monitor, or asks how to make sure everything he has asked for is captured, classified, built, blocked, parked, rejected, or proven done.
---

# Autonomous Build Loop

ChefFlow's operating target is to move David from prompt operator to Founder Authority. Codex should consume governed inputs, select approved work, build, validate, commit, push, and record receipts without making David fire off every task by hand.

## Core Diagnosis

The bottleneck is not idea supply. ChefFlow already has specs, sticky notes, personas, build queues, audits, and domain rules. The bottleneck is manual orchestration: David has to choose, prompt, monitor, repeat, and answer questions that the system should route itself.

David repeats himself when requests land in chat, notes, specs, audits, and persona output without a required final state. If an ask does not become a queue record, blocker, parked item, duplicate attachment, rejection, or receipt, future agents rediscover it instead of finishing it.

When the live builder is idle but real work exists in specs, Sticky Notes outputs, persona outputs, old Codex queues, ready tasks, or agent findings, treat that as an intake wiring failure, not as a lack of work. The executor should drink from `system/v1-builder/approved-queue.jsonl`, but upstream sources must first be normalized into `system/v1-builder/request-ledger.jsonl` and exactly one final state.

## Ground Truth

1. Autonomous building is a P0 operating-system requirement, not a nice-to-have.
2. Pricing reliability is the V1 release blocker. If pricing data is untrusted, route through `pricing-reliability` before generic feature work.
3. Codex must not invent random work. It must pull from governed sources: approved specs, V1 builder queues, classified sticky notes, persona synthesis after triage, and explicit developer overrides.
4. David should answer only escalation questions that require Founder Authority. Routine implementation choices should use repo patterns and proceed.
5. Escalations must become durable queue items, not one-off chat questions.
6. Progress must be visible through Mission Control or another local monitor that reads claims, receipts, branches, blockers, and validation state.

## No Lost Ask Invariant

Every non-trivial request from David must end in exactly one durable state:

- `built`: implemented, validated, committed, pushed, and receipt recorded.
- `queued`: approved by the V1 governor and waiting in the active build queue.
- `blocked`: cannot proceed, with the blocker, unblock condition, and recommended default recorded.
- `parked`: valid but outside the active V1 lane or explicitly deferred.
- `research_required`: needs evidence before build classification.
- `duplicate_attach`: already covered by an existing spec, queue item, receipt, or canonical surface.
- `rejected`: unsafe, forbidden, obsolete, or outside ChefFlow's operating rules.

Do not rely on chat memory as the storage layer. If a request matters and cannot be built immediately, attach it to the governed queue, Sticky Notes intake output, a spec, an escalation record, or the learning inbox before closeout.

When David asks why things are not getting built, do this first:

1. Name the missing invariant plainly: requests are being captured in too many places without one final status ledger.
2. Inspect the existing governed surfaces before proposing anything new: `docs/specs/autonomous-v1-builder-contract.md`, `docs/specs/sticky-notes-intake-layer.md`, `system/v1-builder/` if present, and Mission Control specs.
3. Find whether the ask already has a durable state. Search specs, queues, receipts, blocked records, parked records, and Sticky Notes state.
4. If there is no durable state, create or patch the smallest appropriate skill, spec, queue candidate, or escalation record.
5. If upstream work exists outside `system/v1-builder/approved-queue.jsonl`, run or build the source intake normalizer before adding another queue family.
6. If the ask is buildable and approved, route to `builder`. If not, record why it is not buildable instead of leaving it as advice.

## Routing

Use this skill as primary when the user asks why Codex is not building on its own, asks for a resident builder, or says they are exhausted by prompting each build.

Sidecars:

- `pricing-reliability` when the request mentions V1 readiness, OpenClaw, ingredient prices, quote safety, local coverage, or menu costing.
- `context-continuity` before changing builder, queue, intake, Mission Control, or sticky-note surfaces.
- `builder` when implementing a queued task.
- `host-integrity` only when changing Task Scheduler, ports, resident processes, watchdogs, or launchers.
- `skill-garden` when the user gives new durable operating guidance.

## Operating Loop

When asked to make the project build itself:

1. Attach to `docs/specs/autonomous-v1-builder-contract.md`.
2. Attach to `docs/specs/sticky-notes-intake-layer.md` when Sticky Notes are part of intake.
3. Inspect current branch and dirty work before writing.
4. Identify the next missing runtime slice, usually request ledger, queue files, selector, claim writer, receipt writer, escalation writer, or Mission Control projection.
5. Prefer source normalization before executor changes when the runner is idle because it only reads an empty approved queue.
6. Build the smallest slice that increases unattended throughput.
7. Record what still requires explicit permission, such as Task Scheduler setup, long-running server start, production deploy, destructive DB work, or `drizzle-kit push`.
8. Commit and push only owned files.

## Escalation Contract

Do not interrupt David for routine questions. Use existing codebase patterns, documented rules, and conservative defaults.

Create an escalation record only when the decision requires Founder Authority, has money or data-loss risk, changes V1 scope, needs credentials, needs destructive DB work, needs production deploy, or conflicts with a hard stop.

Preferred destinations:

1. `system/v1-builder/escalations.jsonl` for builder runtime questions.
2. Sticky Notes intake action candidates when the sticky-note workflow exists.
3. `system/agent-learning-inbox/` for reusable agent behavior that is not yet actionable.

Each escalation must include the exact question, why Codex cannot safely decide, the recommended default, affected files, deadline or blocker status, and the queue item it blocks.

## Monitor Contract

The builder loop is not trusted if it is invisible. Mission Control or the local launcher must show:

- current task
- current branch
- active claim age
- request ledger counts by state
- queue depth
- validation state
- latest commit and push receipt
- blocked items
- escalations waiting for David
- pricing reliability status when V1 readiness is in scope

Do not start long-running servers or restart existing ones without explicit permission. If a monitor needs a running process, implement the read-only data source first and report the exact command David can approve later.

## Closeout

Every autonomous-build-loop task must end with one of:

- `throughput increased`: a runtime slice was built, validated, committed, and pushed.
- `spec strengthened`: durable guidance was patched into the builder contract or skills, validated, committed, and pushed.
- `blocked`: the next step needs an explicit approval that Codex cannot assume.

Never close with only advice when a safe skill, spec, queue, or runtime patch can be made.
