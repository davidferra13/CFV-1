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

| File                                  | Topic                                                                                                                                  | Priority         | Added      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| `ux-scenarios-and-onboarding-gaps.md` | Full UX scenario map + 7 onboarding gaps                                                                                               | CRITICAL (Gap 1) | 2026-02-21 |
| `remy-features-phase2-master.md`      | 8 Remy features: voice input, dietary check, prep timeline, nudges, quick-add, Q&A profile, doc management, favorite chefs integration | HIGH             | 2026-02-21 |
| `remy-public-client-layers.md`        | Extend Remy to public pages (visitor-facing) and client portal (authenticated clients)                                                 | HIGH             | 2026-02-21 |
| `culinary-board-animation-polish.md`  | Polish word-feel animations: tune timing, haptics, sound FX, particles, chain reactions, combo mode                                    | LOW              | 2026-02-22 |
