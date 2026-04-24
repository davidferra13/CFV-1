# REVIEW: Codex Work Unit Backlog (10 Unreviewed Units)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

Between April 18-23, 2026, the Codex agent produced 10 work units. They are committed but NEVER reviewed by Claude Code. Some are uncommitted. One contains security-sensitive code (Public Intent Hardening). 20 Codex migrations were applied but need verification.

## What to Do

This is a REVIEW task, not a build task. For each work unit below:

1. **Read the code changes** (git log, git diff, or read the files directly)
2. **Verify correctness:** Does the code do what the memory file says it does?
3. **Check for CLAUDE.md violations:** em dashes, missing tenant scoping, missing auth gates, silent failures, hardcoded values
4. **Check for security issues:** SQL injection, missing input validation, exposed secrets, privilege escalation
5. **Check migration safety:** Are migrations additive? Any destructive operations?
6. **Report:** For each unit, give a PASS/FAIL/NEEDS-FIX with specific findings

### Work Units to Review

Read the corresponding memory file for context on each:

1. **Privileged Mutation Policy** - `memory/project_privileged_mutation_policy.md` - Server action auth inventory + privileged mutation contract
2. **Quote Prefill Unification** - `memory/project_quote_prefill_unification.md` - Unified quote draft prefill replacing 4 separate paths
3. **Client Interaction Ledger** - `memory/project_client_interaction_ledger.md` - Canonical client relationship ledger
4. **Task-Todo Contract Drift** - `memory/project_task_todo_contract_drift.md` - Fixed Remy AI conflating tasks and todos
5. **Client Profile Engine** - `memory/project_client_profile_engine.md` - CP-Engine wired into menu intelligence (BLOCKED by runtime error)
6. **Operator Walkthrough Lane** - `memory/project_operator_walkthrough_lane.md` - Public operator evaluation form + admin inbox + SQL migration
7. **Canonical Intake Lanes** - `memory/project_canonical_intake_lanes.md` - Shared intake-lane contract for 6 public ingress paths (UNCOMMITTED)
8. **Ledger-Backed NBA** - `memory/project_ledger_backed_nba.md` - Deterministic client action recommendations (UNCOMMITTED, BLOCKED)
9. **Tasks Create Path** - `memory/project_tasks_create_path.md` - Fixed /tasks create flow (UNCOMMITTED)
10. **Public Intent Hardening** - `memory/project_public_intent_hardening.md` - Shared backend guard for public mutations with rate limiting (UNCOMMITTED, HIGH RISK - security code)

### Migration Verification

Search `database/migrations/` for migrations from April 18-23. For each:

- Verify the migration is additive (no DROP, no DELETE, no TRUNCATE)
- Check that referenced tables exist in the schema
- Note any failures (the memory files mention `directory_waitlist` table missing and a transport metadata view join syntax error)

### Priority Order

1. **Public Intent Hardening** (security code, uncommitted - review FIRST)
2. **Operator Walkthrough Lane** (public-facing, has migration)
3. **Privileged Mutation Policy** (auth/security)
4. Everything else

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- All 10 memory files listed above
- `database/migrations/` - recent migrations
- `git log --oneline --since="2026-04-18" --until="2026-04-24"` to see Codex commits

## Deliverable

Write a review report to `docs/codex-review-report.md` with:

- Per-unit: PASS/FAIL/NEEDS-FIX + specific findings
- Migration audit results
- List of uncommitted units with recommendation (commit/discard/fix-then-commit)
- Any blocking issues that need developer input

## Rules

- Read CLAUDE.md fully before starting
- This is a REVIEW task - do NOT modify code unless you find a critical security vulnerability
- If you find a critical security issue, fix it immediately and flag it in the report
- No em dashes in the report
- Be specific: cite file paths and line numbers for every finding
