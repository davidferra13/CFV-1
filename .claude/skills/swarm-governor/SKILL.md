---
name: swarm-governor
description: Bounded Codex orchestration for ChefFlow. Use automatically when a task is large, multi-track, research-heavy, build-heavy, or likely to benefit from parallel explorers or workers, even if the user does not explicitly ask for subagents. Governs whether to delegate, how many agents are safe, file ownership, saturation checks, and orchestrator closeout.
---

# Swarm Governor

Use this skill to decide whether Codex should act as an orchestrator for the current ChefFlow task. The goal is automatic, bounded parallelism, not maximum agent count.

## Decision Gate

Before spawning or delegating, answer these in order:

1. Is there a separable side task that can run without blocking the orchestrator's immediate next step?
2. Can the side task be completed with read-only exploration or a disjoint write scope?
3. Can the orchestrator verify the result quickly against source files, tests, or runtime evidence?
4. Is the working tree already too dirty, conflicted, or saturated to add more writers safely?
5. Would delegation reduce wall-clock time more than it adds integration risk?

If any answer is no, keep the work local.

## Default Caps

- Normal task: no subagents.
- Complex codebase investigation: 1 to 3 read-only explorer agents.
- Larger feature with clean file ownership: 1 to 3 worker agents.
- Hard cap: 5 total subagents unless the user explicitly approves a larger run in the current conversation.
- Avoid 10 or more agents except for read-only research batches with no shared files, no database changes, no server processes, and no tight integration path.

## Saturation Check

Before delegation, inspect branch and dirty work. Treat unfamiliar changes as other agents' active work.

Do not add worker agents when:

- The current branch is `main`.
- The intended files are already dirty from another agent.
- Ownership cannot be described as a short explicit file or directory list.
- The task touches migrations, generated database types, production deployment, server restarts, destructive database operations, or shared financial ledger invariants.
- Validation will be polluted by unrelated dirty work and cannot be scoped.

## Agent Packet

Every delegated task must include:

- Role: explorer, worker, reviewer, or verifier.
- Objective: one concrete result.
- Scope: allowed files or read-only paths.
- Boundaries: forbidden files and project hard stops.
- Coordination: "You are not alone in the codebase. Do not revert or clean up unrelated work."
- Output: changed file list for workers, findings with file references for explorers or reviewers.

## Orchestrator Duties

The main Codex session remains accountable for:

1. Choosing the smallest useful agent count.
2. Doing the immediate blocking work locally.
3. Integrating or rejecting subagent output.
4. Reviewing all changed files before commit.
5. Running scoped validation when allowed.
6. Staging, committing, and pushing only owned files.

## Ollama Boundary

Do not treat ChefFlow's Ollama or Gemma runtime as a Codex subagent backend. Use it only through product code paths or explicit local scripts that are already part of the repo. Low-risk summarization or triage can use Ollama only when the task intentionally invokes that product path and the output is verified against source evidence.

## Closeout

Report whether delegation was used. If it was not used, state the blocking reason briefly when relevant, such as "no clean file ownership" or "local critical path was faster."
