# Triage Handoff - 2026-04-27

**Branch:** feature/weather-visibility-analysis
**Build health:** GREEN for direct type check. `npx.cmd tsc --noEmit --skipLibCheck` exited 0 with no tail output. Full production build was not run because this was a docs, research, and triage task.
**Last 5 commits:**

- 6d1fe5efc docs(research): 24-7 hybrid support model
- 60baf6b62 docs(analysis): weather visibility massive-win analysis + verify AGENTS.md skills
- 01d952b0e feat(client): add menu selection sharing, group split, and referral badge
- c303ddf08 refactor(brand): consolidate brand constants into single source of truth
- 7d7b75bb9 style(public): remove AI template patterns from landing and signin

## Triage Results

| #   | Item                                         | Spec                                                               | Label  | Status                  |
| --- | -------------------------------------------- | ------------------------------------------------------------------ | ------ | ----------------------- |
| 1   | Client relationship closure data contract    | `docs/specs/build-client-relationship-closure-data-contract.md`    | CLAUDE | queued, approval needed |
| 2   | Client relationship closure server actions   | `docs/specs/build-client-relationship-closure-server-actions.md`   | CLAUDE | blocked on #1           |
| 3   | Client relationship closure communications   | `docs/specs/build-client-relationship-closure-communications.md`   | CLAUDE | blocked on #1           |
| 4   | Client relationship closure UI               | `docs/specs/build-client-relationship-closure-ui.md`               | CODEX  | blocked on #2           |
| 5   | Client relationship closure guards and tests | `docs/specs/build-client-relationship-closure-guards-and-tests.md` | CLAUDE | blocked on #2           |

## Decisions Made

- This queue overrides the prior auto-circle triage queue for immediate attention because relationship closure is a trust and safety gap, not polish.
- The market pattern is a policy matrix, not a single lifecycle label: archive, transition, close, do-not-book, and legal hold behave differently.
- `dormant` must not be reused for closure because existing ChefFlow behavior treats dormancy as a re-engagement signal.
- The data contract is intentionally additive and uses a new append-only `client_relationship_closures` table instead of editing `clients.status` or deleting data.
- Migration work is blocked until the developer approves the proposed SQL in `docs/specs/build-client-relationship-closure-data-contract.md`.

## Parallel Execution Plan

- Run #1 alone first. It must request migration approval before writing any migration file.
- After #1 lands, run #2 and #3 in parallel. #2 owns core closure actions and guards. #3 owns explicit-send closure communication.
- After #2 lands, run #4 and #5 in parallel. #4 owns chef UI surfaces. #5 owns regression tests and guard coverage.

## Ready-to-Paste Prompts

### Agent 1, data contract

Read and execute `docs/prompts/client-relationship-closure/agent-1-data-contract.md`.

### Agent 2, server actions

Read and execute `docs/prompts/client-relationship-closure/agent-2-server-actions.md`.

### Agent 3, communications

Read and execute `docs/prompts/client-relationship-closure/agent-3-communications.md`.

### Agent 4, UI

Read and execute `docs/prompts/client-relationship-closure/agent-4-ui.md`.

### Agent 5, guards and tests

Read and execute `docs/prompts/client-relationship-closure/agent-5-guards-and-tests.md`.

## Blocked Items

- Any migration implementation: blocked until the developer approves the full SQL in the data-contract spec.
- UI and guard implementation: blocked until server actions land.
- Full production build verification: not run in this triage because long-running build commands require explicit permission.

## Notes for Next Triage

- Written research report: `docs/research/client-relationship-closure-market-research.md`.
- Agent coordination folder: `docs/prompts/client-relationship-closure/`.
- The prior queued work remains valid, but relationship closure should run first because it prevents unsafe rebooking, unwanted outreach, and misleading dormancy behavior.
- Current worktree was already heavily dirty before this triage. Do not stage unrelated changes.

## Cold-Start Prompt

Copy this into a fresh conversation to continue:

> Read docs/prompts/last-triage-handoff.md, then read docs/research/client-relationship-closure-market-research.md. Execute the next unblocked client relationship closure agent prompt from docs/prompts/client-relationship-closure/. Do not re-derive what is already decided. Do not create any migration without explicit developer approval.
