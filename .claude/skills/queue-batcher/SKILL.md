---
name: queue-batcher
description: Batch ChefFlow build queue work safely. Use when the user asks to build the queue, get the build queue to 100%, reduce dirty-tree bottlenecks, run queued tasks in batches, coordinate parallel agents, process system/build-queue, system/ready-tasks, docs/specs, or turn blocked work into queued tasks without overloading the repo.
---

# Queue Batcher

Batch queue work without mixing unrelated changes, overloading agents, or weakening ChefFlow hard stops.

## Definition Of 100 Percent

Treat "queue at 100%" as this state:

1. Every ready item is classified as spec-needed, build-ready, in-progress, verified, blocked, duplicate, or rejected.
2. Every build-ready item has an owner boundary: task ID first, module boundary second, branch or worktree third, file paths last.
3. Every active batch has limited concurrency and non-overlapping ownership.
4. Every finished item is validated, committed, pushed, and moved out of the active queue.
5. Every blocked item records the exact blocker and the next safe action.

## Batch Selection

1. Inspect branch and dirty tree before touching files.
2. Prefer ready specs in `docs/specs/`.
3. Use `system/ready-tasks/` for task packets that are already bounded.
4. Use `system/build-queue/` only after classifying vague items with `findings-triage`.
5. Skip or block tasks that require destructive database operations, production deploys, server restarts, or unclear ownership.
6. Pick a small batch. Default to 1 high-risk item, 2 medium-risk items, or 3 low-risk independent items.

## Ownership Model

Use this priority order:

1. Spec or task ID.
2. Module boundary.
3. Feature branch or isolated worktree.
4. File paths.

Do not run two agents on the same task ID or module boundary. If file overlap appears, stop one side and record the conflict.

## Required Sidecars

- `software-fundamentals`: shared design concept, module boundary, fastest feedback loop, design investment.
- `builder`: build-ready specs or implementation packets.
- `findings-triage`: vague, duplicated, stale, or mixed queue items.
- `validation-gate`: new product surface or persona-derived product expansion.
- `evidence-integrity`: stale build health, dirty tree, or conflicting status artifacts.
- `review`: before shipping a batch.

## Runtime Visibility

Use visible Playwright or browser inspection automatically when it is necessary for UI, browser behavior, runtime truth, or user-facing workflow confidence and when it is permitted by project rules.

Do not start or restart long-running servers without explicit permission. If runtime visibility is needed but no server is safely available, block the item with the exact command or warmup skill needed.

## Output

For each batch, report:

```markdown
Batch goal:
[what queue slice is being processed]

Items:
- [id] [status] [owner boundary] [risk]

Shared design concept:
[what must stay true across the batch]

Concurrency:
[why these items can or cannot run together]

Fastest feedback loop:
[first checks]

Blocked:
- [id] [blocker] [next safe action]

Closeout:
[commits, pushes, validations, remaining queue]
```
