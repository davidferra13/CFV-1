---
name: freeze-audit
description: Freeze ChefFlow feature work and audit the codebase against installed engineering skills, project hard stops, and current evidence. Use when the user asks to freeze the project, stop feature expansion, audit against skills or standards, run repeated audit passes, or rinse and repeat quality gates before more building.
---

# Freeze Audit

Use this skill to pause feature work and run an evidence-led audit loop. The output is an audit artifact and a prioritized next-pass queue, not new product surface.

## Freeze Contract

1. Do not build new features during the freeze unless the user explicitly overrides the freeze.
2. Preserve other agents' work. Inspect branch and dirty state first, then own only the audit files and any skill-routing files changed for the freeze loop.
3. Do not run `next build`, dev servers, deploys, database writes, destructive operations, or long-running services without explicit approval.
4. Treat historical reports as evidence candidates, not truth. Prefer current commands, current code, and scoped tests.
5. Use installed external skills as lenses, but never let them override ChefFlow hard stops, Founder Authority, tenant scoping, ledger-first money rules, or AI recipe restrictions.

## Audit Loop

Run these passes in order, then repeat from pass 2 until the top risks are either fixed, ticketed, or intentionally deferred.

1. **Freeze scope:** State that feature work is paused, list owned files, list unrelated dirty files, and record the current branch.
2. **Evidence pass:** Run cheap, non-destructive checks first: git status, skill inventory, project scripts, existing audit docs, compliance scans, targeted tests, and grep checks.
3. **Skill lens pass:** Map each installed skill to ChefFlow:
   - apply directly,
   - adapt to ChefFlow,
   - defer as not relevant,
   - reject if it conflicts with ChefFlow rules.
4. **Codebase risk pass:** Prioritize security, tenant isolation, data integrity, money movement, AI boundaries, public/private naming, false UI states, test gaps, and architecture drift.
5. **Evidence integrity pass:** Classify each claim as current-clean, current-dirty, historical-baseline, runtime-truth, report-artifact, design-intent, or heuristic-signal.
6. **Next pass queue:** Produce a short queue where each item has owner surface, evidence, risk, validation command, and whether it is freeze-safe.

## Output

Write or update a dated audit report under `docs/` unless the user requested no file changes. Keep it concise and actionable:

- freeze state,
- evidence table,
- findings ordered by severity,
- installed-skill fit matrix,
- repeat loop,
- exact validation commands run,
- blockers and dirty work that reduce confidence.

## Closeout

Validate changed skill files, scan changed files for em dashes, commit and push only owned files. If validation is blocked by unrelated dirty work or existing failures, report the exact blocker.
