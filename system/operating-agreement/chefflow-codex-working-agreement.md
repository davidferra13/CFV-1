# ChefFlow Codex Working Agreement

Purpose: keep ChefFlow architecture and Codex behavior improving continuously while avoiding dirty-tree drift, parallel-agent collisions, and shallow module sprawl.

## Shared Design Concept

ChefFlow work should continuously improve two systems:

1. The ChefFlow app architecture, including Remy, finance, tasks, data boundaries, UI flows, and module design.
2. The Codex operating system for this repo, including skills, routing, build queues, verification, YouTube learning, and parallel-agent coordination.

YouTube links are optimization inputs. A video should not become a passive summary. It should become evidence-backed lessons, reusable skills, bounded app drills, and validation loops.

## Module Shape

Move away from many tiny shallow surfaces that require agents to coordinate across dozens of files. Move toward a smaller number of deeper modules with clear top interfaces, hidden complexity, stable tests, and explicit ownership.

Before creating or changing code, ask:

- What is the top-level interface?
- What complexity should be hidden behind it?
- Which internals are high-risk and need direct inspection?
- Which tests protect the interface?
- Which adjacent module should not be touched?

## Human Strategy And AI Tactics

Human strategy means deciding the goal, product meaning, safety boundaries, module ownership, public interfaces, invariants, and unresolved ambiguity.

AI tactics means implementing narrow internals, tests, docs, extraction, and validation after the strategy is clear.

If an agent cannot state the shared design concept, module boundary, invariant, fastest feedback loop, and design investment, it should not code yet.

## Runtime Visibility

For UI, browser behavior, app-flow work, runtime truth, or anything where visual inspection materially reduces risk, Codex should use visible Playwright or browser inspection automatically when it is necessary and permitted.

Constraints:

- Do not start dev, beta, prod, or long-running servers without explicit permission.
- Do not restart or kill existing servers.
- Do not claim runtime verification from static inspection.
- If visible runtime feedback is needed but unavailable, state the blocker and the exact safe next step.

## Dirty Tree And Parallel Agents

Dirty-tree management is part of the system design.

- Preserve unrelated dirty work.
- Use isolated feature branches or worktrees for scoped skill and architecture work.
- If unrelated dirty work blocks a task, report the exact blocker and queue the task instead of mixing changes.
- Stage, commit, and push only files owned by the current task.
- Prefer build queue, ready task, or spec handoff over broad opportunistic cleanup.
- Use `queue-batcher` to process queued work in small batches instead of overloading the repo.
- Treat 100 percent queue health as every item classified, owned, built or blocked, validated, committed, pushed, and removed from the active queue.
- Use task ID as the primary ownership unit, module boundary second, branch or worktree third, and file paths as the final enforcement detail.

## YouTube Optimization Protocol

For any YouTube link:

1. Capture metadata, transcript source, visual evidence, and source confidence.
2. Identify the user's goal.
3. Extract principles, tactics, assets, and risks.
4. Map lessons to ChefFlow app architecture, Remy, skills, queues, UI, data, tests, and docs.
5. Separate safe skill/process changes from app refactors that need specs.
6. Update a video-learning ledger when the video is a continuing source.
7. Default to a full operating packet when the user wants app optimization: source evidence, visual evidence, principles, ChefFlow optimization map, safe-now changes, needs-spec changes, and queue entries.

## Remy Safety

Remy must not perform or imply authority over restricted actions without explicit, safe server-side contracts.

Hard restrictions:

- No recipe generation or restricted recipe mutations.
- No silent AI fallback when inference is required for truth.
- No money movement.
- No client deletion.
- No event state transitions.
- No messages to clients.
- No prospecting actions for non-admin users.
- No admin actions.
- No cross-tenant access.
- No hidden writes behind conversational wording.

Remy expansion should move toward a deep tool registry with task type, input schema, policy tier, executor, deterministic examples, and golden tests.

## Current Highest-Risk Areas

- Parallel agents working on overlapping surfaces without shared ownership.
- Remy tool capability expansion without a clear command contract.
- Dirty trees blocking or mixing unrelated work.
- Financial and ledger display logic leaking into pages.
- Server-action files exporting types or internal helpers.
- AI fallback language causing agents to confuse truthful deterministic formula floors with failed AI inference.

## First Deep Module Priority

The first deep-module push should target ChefFlow's highest-value financial and food-costing boundary: ledger-backed food costing, price cascades, inventory cost truth, and finance read models.

Target shape:

- One or a small number of public read-model interfaces for displayed food cost and finance numbers.
- Clear cents/minor-unit invariants.
- No page-local financial reductions.
- Tests that cover payment, tip, refund, credit, add-on, ingredient cost, and inventory price cases.
- Human inspection of money and tenant-scope internals before delegation.

## Ground Truth Hierarchy

`AGENTS.md` remains law. This working agreement is the strategy layer for how Codex should apply that law while improving ChefFlow architecture and agent behavior.

## Next Grill Questions

Use these when the user says "grill me":

1. Which surface are we improving right now: architecture, Remy, Codex operation, YouTube learning, queue discipline, or a specific module?
2. What must never break while we improve it?
3. What ambiguity would cause an agent to guess?
4. What is the deep module interface we want?
5. What is the fastest feedback loop?
6. What should be visible in Playwright or browser runtime?
7. What gets queued instead of mixed into this change?
