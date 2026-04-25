# Agent Handoff: Runtime Blocker Fixes + Codex Triage

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 3: Runtime Blocker Fixes."

## Context

Codex committed code to main (April 22-23) that was never reviewed by Claude Code. Two known runtime errors exist in committed code. Additionally, 4 Codex items remain uncommitted and at risk of being lost.

## Your job

### Fix Runtime Errors

1. **`/clients/[id]/relationship` returns 500**
   - Root cause: import chain `parse-ollama -> chat-insights -> insights/actions`
   - This was documented in `memory/project_ledger_backed_nba.md`
   - Trace the import chain starting from the relationship page component
   - The fix is likely a missing `'use server'` directive, a client/server boundary violation, or a missing null check
   - Fix it so the page loads

2. **Client Profile Engine event surface errors**
   - `app/(chef)/events/[id]/page.tsx` may error when `client_profile_*` tables don't exist
   - The CP-Engine was designed to "fail closed" (null profileGuidance when tables absent)
   - Verify this actually works by reading the code path
   - If it doesn't fail closed, add proper try/catch that returns null

### Triage Uncommitted Codex Work

3. **Check what's in the working tree vs stash**
   - Run `git stash show stash@{2}` to see the Codex backup (997+ files)
   - The 4 uncommitted items were: Canonical Intake Lanes, Ledger-Backed NBA, Tasks Create Path, Public Intent Hardening
   - Check if their key files exist in the current working tree:
     - `lib/public/intake-lane-config.ts`
     - `lib/clients/next-best-action-core.ts`
     - `components/tasks/task-create-panel.tsx`
     - `lib/security/public-intent-guard.ts`
   - If they exist and `npx tsc --noEmit --skipLibCheck` passes: commit them with descriptive messages
   - If they don't exist: note in memory file that they're in stash@{2} only
   - Do NOT pop the stash (destructive)

### Update Memory

4. Update `memory/project_ledger_backed_nba.md`, `memory/project_canonical_intake_lanes.md`, `memory/project_tasks_create_path.md`, `memory/project_public_intent_hardening.md` with current status.

## Rules

- Do not delete any files without explicit approval
- `npx tsc --noEmit --skipLibCheck` must pass after all changes
- Commit with conventional commit format: `fix(codex-review): description`
- Non-blocking side effects: wrap in try/catch, log failures as warnings
