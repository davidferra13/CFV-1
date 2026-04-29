---
name: evidence-integrity
description: Verify whether ChefFlow evidence surfaces deserve trust before drawing conclusions. Use when a task involves build health, "green" claims, test failures, stale tests, dirty working trees, docs/build-state.md, docs/sync-status.json, OpenClaw or system health, scheduled tasks, watchdogs, live processes, operational status files, old audit findings, or any conflict between docs, logs, code, tests, and runtime behavior.
---

# Evidence Integrity

Use this skill when the risk is not the app code itself, but whether the evidence used to judge the app is trustworthy.

## Core Rule

Never let a historical report, stale status file, or prior green baseline stand in for current evidence. Classify the evidence before making the claim.

## Trust Classification

Classify each evidence source as one of:

- `current-clean`: verified on the current commit with no relevant dirty files.
- `current-dirty`: verified on a dirty working tree. State the dirty files that affect confidence.
- `historical-baseline`: describes an older commit or prior run only.
- `runtime-truth`: live process, live database, live HTTP, live task scheduler, or fresh command output.
- `report-artifact`: checked-in status or docs that may be useful but are not live proof.
- `design-intent`: docs, specs, or comments describing what should be true.
- `heuristic-signal`: grep, string scan, fragile test, or warning that needs human interpretation.

## Workflow

1. Identify the claim being made, for example "build is green", "OpenClaw is healthy", "tests prove this", or "server is running".
2. Gather the minimum evidence needed from current commands, code, logs, docs, and status files.
3. Classify each evidence source using the trust classification above.
4. Detect conflicts across layers:
   - Build state file vs current git status.
   - Test output vs known stale assumptions.
   - Wrapper status vs DB freshness vs logs.
   - Runbook intent vs live Windows processes or scheduled tasks.
   - Prior verified spec vs current dirty checkout.
5. State the safest conclusion with its confidence level.
6. If evidence is mixed, say what would settle it.

## Old Finding Rules

Promote these older audit findings into standing behavior:

- `docs/build-state.md` is a historical baseline unless tied to the exact current commit and dirty state.
- Failing tests can be real regressions, stale tests, heuristic warnings, or contract drift. Triage before treating them as release blockers.
- A checked-in status file such as `docs/sync-status.json` is not live runtime truth unless regenerated and tied to the current run.
- OpenClaw health is multi-layered: wrapper acquisition, sync completion, DB freshness, downstream price propagation, and logs can disagree.
- Fresh downstream data does not prove upstream acquisition health.
- Windows host integrity includes scheduled tasks, hidden launch behavior, live processes, open ports, watchdog resurrection, and child-process cleanup.
- A cleanup hook killing zombie processes is evidence of process hygiene debt, not proof that the system is clean.
- Navigation and contract tests must evolve with intentional IA changes.

## Test Failure Triage

When tests fail, label each failure:

- `real-regression`: current product behavior violates current system law.
- `stale-test`: test asserts an outdated route, file path, or IA shape.
- `heuristic-warning`: test uses broad grep or string matching and may overflag.
- `contract-drift`: product changed intentionally but contract tests were not updated.
- `environmental`: failure depends on missing service, port, credential, or local state.
- `unknown`: not enough evidence yet.

Do not collapse these labels into one generic "tests failed" verdict.

## Output Format

Use this compact format when reporting:

```text
EVIDENCE INTEGRITY

CLAIM: [claim being evaluated]
VERDICT: [trusted | mixed | untrusted | not enough evidence]

EVIDENCE:
- [classification] [source] - [what it proves]

CONFLICTS:
- [conflict or none]

NEXT PROOF:
- [smallest action that would settle uncertainty]
```
