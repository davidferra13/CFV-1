---
name: perfect-world-root-cause
description: Applies a clean hypothetical lens for ChefFlow root-cause and new-action thinking while bracketing dirty workspace, current bills, active queue, partial work, and known obligations. Use when the user says "perfect world", "put on blinders", "pretend everything is built", "ignore the queue for this conversation", "root of the problem", or asks to talk through ideas without being redirected to existing work.
user-invocable: true
---

# Perfect World Root Cause

Use this skill when the user wants a protected thinking mode: not implementation, not queue grooming, not status triage, and not a reminder that other work exists.

## Core Contract

Start from this stance:

> For this conversation, I will bracket the dirty tree, active queue, partial work, bills, known obligations, and unfinished verification. I will reason as if the built product and planned queue are complete enough to stop distracting us, while clearly labeling that as a hypothetical lens.

This does not mean those things are actually done. It means they are temporarily out of scope so the user can reason about root problems, missing actions, product philosophy, future workflows, or new ideas without every answer collapsing back into current execution state.

## What To Do

1. Name the lens briefly: `Perfect-world lens:` or `Hypothetical lens:`.
2. Restate the problem at the highest useful altitude.
3. Separate actual facts from assumed future-state premises when needed.
4. Find the root tension, missing decision, missing user action, or broken mental model.
5. Generate new actions, product moves, questions, or strategy from that root.
6. Keep the conversation conceptual unless the user explicitly asks to queue, fire, or hotfix.

## What To Avoid

- Do not lead with dirty workspace warnings, queue status, in-flight work, bills, or "we still need to build X" unless the user asks for operational reality.
- Do not block ideation because a prerequisite is not implemented.
- Do not pretend hypothetical work is real, tested, shipped, or verified.
- Do not create queue items unless the user explicitly says to queue the outcome.
- Do not fire implementation unless the user uses ChefFlow firing language or explicitly says direct hotfix now.
- Do not over-explain the skill every time; one short lens marker is enough.

## Reality Boundary

Use this sentence shape when the boundary matters:

`Hypothetically, assuming the current queue and known obligations are already handled, the root issue is ...`

If the user later pivots back to execution, drop the blinders and re-apply normal ChefFlow rules: Build Queue First, dirty workspace protection, canonical dev server policy, auth/tenant invariants, and finish gates.

## Output Shape

Prefer this compact structure:

1. `Perfect-world lens:` one sentence defining the assumption.
2. `Root problem:` the deepest issue, not the nearest missing feature.
3. `What this implies:` 2-5 concrete consequences.
4. `New actions:` the best next product, strategy, or discussion moves.

Keep the answer useful for conversation. This skill exists to protect thinking space, not to produce bureaucracy.
