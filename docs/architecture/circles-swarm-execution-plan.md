# Circles Swarm Execution Plan

> **Status:** draft
> **Created:** 2026-05-15
> **Use when:** firing the Circles primitive queue.
> **Do not treat this as fire authorization.** This is the orchestration plan for the lead once the queue is fired.

## Required Context For Every Fresh Agent

Every agent spawned for Circles work should receive only the smallest relevant pack from this list:

- `AGENTS.md` / repo rules
- `CONTEXT.md`
- `docs/domain/circles.md`
- `docs/agent-contexts/circles-domain.md`
- `docs/architecture/circles-current-state-inventory.md`
- `docs/architecture/circles-policy-matrix.md`
- `docs/architecture/circles-source-of-truth-boundaries.md`
- `docs/specs/circles-operating-loop-build-extraction.md`
- the specific fired queue item file
- the exact files in that agent's write scope

Do not send the whole repo history. Do not send unrelated human-systems docs unless the item touches operating-loop semantics, evidence labels, waiting states, or support-network mapping.

## Lead Responsibilities

The lead orchestrator owns:

- run ID
- dependency order
- file ownership boundaries
- merge order
- proof packs
- finish-check
- final route/runtime verification

The lead should not let two agents edit the same file in the same wave.

## Wave 0: Docs And Inventory

Fire first:

- `BQ-20260515T173051Z-canonical-circle-primitive-contract`
- `BQ-20260515T173051Z-circles-current-state-inventory`

Parallel lanes are safe:

| Lane      | Scope                                                 | Write set                                                                       |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Contract  | Finalize canonical domain language and contradictions | `docs/domain/circles.md`, `CONTEXT.md`, `docs/agent-contexts/circles-domain.md` |
| Inventory | Deepen current-state implementation map               | `docs/architecture/circles-current-state-inventory.md`                          |

Verification:

- docs links resolve
- no contradictory Circle/Dinner Circle definitions remain in canonical docs
- queue item proof packs cite exact files and findings

## Wave 1: Serial Foundation

Do not parallelize shared policy modules.

1. `BQ-20260515T173051Z-circle-access-policy-and-type-taxonomy`
2. `BQ-20260515T173051Z-circle-lifecycle-helper-contract`

Recommended write set:

- `lib/hub/circle-types.ts`
- `lib/hub/circle-ownership.ts`
- `lib/hub/circle-linked-object-policy.ts`
- `lib/hub/circle-creation-policy.ts`
- `lib/hub/circle-access-policy.ts`
- `lib/hub/types.ts`
- focused tests under `tests/unit/`

Verification:

- type mapping tests
- access policy tests
- tenant/member/public token negative tests
- focused grep for unsupported `group_type` assumptions

Implementation contract:

- `docs/architecture/circles-policy-matrix.md`

## Wave 2: Creation And Membership Bridges

Can run in parallel after Wave 1 if write sets are separated.

| Lane                     | Queue item                                                          | Likely write scope                                                                                           |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Core client lifecycle    | `BQ-20260515T173052Z-event-inquiry-client-circle-invariants`        | `lib/hub/inquiry-circle-actions.ts`, `lib/hub/chef-circle-actions.ts`, inquiry/event/share integration files |
| Operations collaborators | `BQ-20260515T173052Z-collaborator-staff-and-partner-circle-bridges` | `lib/hub/crew-circle-actions.ts`, `lib/staff/actions.ts`, collaboration modules                              |
| Tickets                  | `BQ-20260515T173052Z-ticket-lifecycle-circle-membership`            | ticket purchase/actions/webhook modules                                                                      |

Merge serially through the lead and rerun relevant policy tests after each merge.

## Wave 3: Product Surfaces

Run only after Wave 1. Prefer waiting for Wave 2 if UI depends on true membership and lifecycle state.

| Lane                     | Queue item                                                       | Likely write scope                                                                    |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Chef command center      | `BQ-20260515T173052Z-chef-circles-command-center`                | `app/(chef)/circles/**`, `components/hub/circles-*`, chef dashboard widgets           |
| Public/client experience | `BQ-20260515T173052Z-public-and-client-circle-experience`        | `app/(public)/hub/g/[groupToken]/**`, client portal Circle entry points               |
| Discovery                | `BQ-20260515T173052Z-open-tables-and-community-circle-discovery` | `app/(public)/hub/circles/**`, `lib/hub/community-circle-actions.ts`, discovery cards |

Verification:

- Playwright screenshots for `/circles`, `/circles/[id]`, `/hub/g/[groupToken]`, `/hub/circles`
- mobile states
- loading/empty/error states
- console/network clean
- tenant and token privacy checks

## Wave 4: Intelligence And Reliability

Run after Circle creation/membership is stable.

| Lane          | Queue item                                            | Scope                                                            |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Signals       | `BQ-20260515T173052Z-circle-engagement-signals`       | CIL/current/client memory adapters for Circle activity           |
| Notifications | `BQ-20260515T173052Z-circle-notification-reliability` | circle-first notify, lifecycle hooks, push/email/digest behavior |

Verification:

- evidence labels for inferred/stale/unknown signals
- no private message content copied unnecessarily
- duplicate notification suppression
- failed push/email degradation

## Wave 5: Regression Harness

Final queue item:

- `BQ-20260515T173052Z-circles-regression-and-security-harness`

Must cover:

- type taxonomy
- ownership modes
- public token reads
- profile-token writes
- chef tenant scoping
- client/staff/vendor/partner linked-object limits
- public discovery exclusion of private Circles
- route registration
- no financial/internal data in guest views

## Fresh-Context Agent Prompt Template

```text
You are working in C:\Users\david\Documents\CFv1.

Fresh-context Circles task. Do not use prior thread assumptions beyond the files listed here.

Read:
- AGENTS.md / repo rules
- CONTEXT.md
- docs/domain/circles.md
- docs/agent-contexts/circles-domain.md
- docs/architecture/circles-current-state-inventory.md
- docs/specs/circles-operating-loop-build-extraction.md
- .agents/build-queue/active/<QUEUE_ITEM>.md
- <exact files in your write scope>

Your write scope is:
- <files/directories>

Do not edit outside this scope without stopping and reporting the needed handoff.
Preserve unrelated dirty workspace changes.
Do not change source-of-truth ownership: Circles coordinate; canonical records own truth.
Enforce server-side auth, tenant scoping, token/member checks, and linked-object policy.
Return changed files, tests run, evidence, and remaining risks.
```

## Stop Conditions

Stop and return to the lead if:

- a required file is dirty with unrelated changes in your write scope
- a route/action lacks an obvious auth model
- a proposed Circle feature duplicates Event/Menu/Client/Ledger canonical state
- a public token view would expose private data
- two queue items require the same shared policy file in the same wave
