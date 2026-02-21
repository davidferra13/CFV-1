# Token Efficiency Optimization — What Changed and Why

## Date

2026-02-21

## Problem

Every new agent conversation was burning ~10,500 tokens just to orient itself before doing any work. At 20 conversations/day, that's 210,000 tokens/day on orientation alone. On top of that, agents were re-exploring the codebase from scratch because there was no project map telling them what exists and where.

Specific waste sources:

1. **MEMORY.md was ~80% duplicate of CLAUDE.md** — both loaded into system prompt, same rules said twice (~2,000 wasted tokens/conversation)
2. **CLAUDE.md had verbose explanations** — "why" sections that agents don't need to follow rules (~4,000 tokens that could be compressed)
3. **No project map** — agents glob/grep to discover what's already built, every time

## What Changed

### 1. MEMORY.md — Deduplicated (117 → 26 lines, ~75% reduction)

Stripped everything already covered by CLAUDE.md. What remains:

- Completed features (gap closure, grocery quote) — context agents need
- Build gotchas not in CLAUDE.md (`'use server'` export rules, ENOTEMPTY fix, PWA bypass)

### 2. CLAUDE.md — Compressed (424 → 186 lines, 24KB → 8KB, ~56% reduction)

Every rule preserved (34/34 verified by audit). Changes:

- Cut "why" explanations — agents don't need them to follow rules
- Removed redundant text (same thing said 2-3 ways → said once)
- Condensed code examples
- Merged overlapping sections
- Added PROJECT-MAP.md reference in Quick Reference

**Old version saved:** `docs/CLAUDE-md-pre-compression-backup.md` — instantly recoverable.

### 3. PROJECT-MAP.md — New (132 lines, 5.5KB)

Compact reference of the entire codebase:

- All app routes organized by route group
- All component and lib folders with file counts
- Database migration range and schema layers
- Key config files and their purpose
- Critical module locations

Referenced from CLAUDE.md Quick Reference section so agents know to check it.

## Token Savings Estimate

| Source               | Before                    | After                         | Savings/conversation           |
| -------------------- | ------------------------- | ----------------------------- | ------------------------------ |
| CLAUDE.md            | ~8,000 tokens             | ~3,500 tokens                 | ~4,500 tokens                  |
| MEMORY.md            | ~2,500 tokens             | ~600 tokens                   | ~1,900 tokens                  |
| Exploration overhead | ~2,000 tokens (estimated) | ~500 tokens (check map first) | ~1,500 tokens                  |
| **Total**            | **~12,500 tokens**        | **~4,600 tokens**             | **~7,900 tokens/conversation** |

At 20 conversations/day: **~158,000 tokens saved per day.**

## What Did NOT Change

- **Every rule is still enforced** — 34/34 critical rules verified present
- **No workflow changes** — session close-out, commit/push, feature branches all identical
- **No file deletions** — old CLAUDE.md preserved as backup
- **Hooks still work** — build-guard.sh unchanged
- **AGENT-WORKFLOW.md unchanged** — full playbook still available

## Files Changed

| File                                       | Change                                 |
| ------------------------------------------ | -------------------------------------- |
| `CLAUDE.md`                                | Compressed 424 → 186 lines, same rules |
| `memory/MEMORY.md`                         | Deduplicated 117 → 26 lines            |
| `docs/PROJECT-MAP.md`                      | New — codebase orientation map         |
| `docs/CLAUDE-md-pre-compression-backup.md` | Old CLAUDE.md preserved                |
| `docs/token-efficiency-optimization.md`    | This document                          |
