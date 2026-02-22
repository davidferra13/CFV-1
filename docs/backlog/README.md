# Backlog — Save for Later

This folder contains **researched but not yet implemented** features, gaps, and ideas.

## How It Works

- Each file = one topic that was thoroughly researched but couldn't be built yet
- Files are named descriptively: `onboarding-gaps.md`, `recipe-bulk-import.md`, etc.
- Every file includes enough context to pick it up cold in a future session

## File Structure

Each backlog item should include:

1. **Context** — why this matters, what prompted the research
2. **What was learned** — findings, existing code patterns, related files
3. **What needs to be built** — specific implementation details
4. **Priority** — CRITICAL / HIGH / MEDIUM / LOW
5. **Estimated effort** — quick win (< 1 session), medium (1-2 sessions), heavy (multi-session)
6. **Files to modify** — exact paths so future agents don't have to re-explore

## For Agents

**Before starting work on a feature, check this folder first.** The research may already be done — don't re-explore what's already been documented here.

When you complete a backlog item, move the file to `docs/` (or delete it) and note what was built.

## Current Items

| File                                  | Topic                                    | Priority         | Added      |
| ------------------------------------- | ---------------------------------------- | ---------------- | ---------- |
| `ux-scenarios-and-onboarding-gaps.md` | Full UX scenario map + 7 onboarding gaps | CRITICAL (Gap 1) | 2026-02-21 |
