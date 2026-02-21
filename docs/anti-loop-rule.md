# Anti-Loop Rule — What Changed and Why

## Date

2026-02-21

## Problem

Agents can get stuck in loops that run for 30–60+ minutes, burning real money and producing nothing (or making code worse). The existing rules in CLAUDE.md only addressed **build loops** in multi-agent mode — they didn't cover the many other ways agents loop:

- Fix a type error → build → same error → fix differently → build → same error (fix-retry loop)
- Can't find a file → search → not found → search differently → repeat (search loop)
- Command blocked → tweak → blocked again (permission loop)
- API fails → retry → fails → retry (network loop)
- Fix test → new failure → fix → original failure returns (circular fix loop)

The developer observed agents coding for an hour straight when stuck in these loops.

## What Was Added

### CLAUDE.md — New "ANTI-LOOP RULE" Section

Placed right after the document preamble and before DATA SAFETY, making it one of the first things agents read. Contains:

1. **The 3-Strike Rule** — if the same problem fails 3 times, hard stop. Report to user.
2. **Strike vs. Forward Progress distinction** — critical to prevent the rule from making agents too cautious:
   - Strikes = same error coming back, going in circles, retrying known failures
   - NOT strikes = fixing different errors across different files, normal multi-file implementation, research/reading
   - The test: "Am I making forward progress or going in circles?"
3. **What "STOP" means** — commit partial work, report clearly, let user decide, but continue other tasks
4. **Why it exists** — real dollar cost explanation ($10–50+ per loop incident)

### memory/MEMORY.md — Summary Entry

Added a concise reference to the anti-loop rule so it persists across sessions.

## Design Decisions

### Why 3 strikes, not 2 or 5?

- 2 is too aggressive — many real problems need a second attempt with a different approach
- 5 is too lenient — by the 4th retry, you're almost certainly looping
- 3 gives agents room to try a genuinely different approach while catching loops early

### Why distinguish strikes from forward progress?

The developer explicitly asked that this rule "never inhibit or hinder the agent from working." Without the distinction, agents might stop after encountering 3 _different_ errors in a row (normal work), which would be counterproductive. The key insight: **different errors = progress, same error = loop.**

### Why not a timer-based approach?

Claude Code agents don't have built-in timers or turn counters that can interrupt execution. The defense has to be **prompt-level** (rules the agent follows) plus the existing **hook-level** defense (build-guard.sh blocks builds when the lock file exists). The 3-strike rule is a prompt-level defense that works for all loop types, not just builds.

## Files Changed

| File                     | Change                                      |
| ------------------------ | ------------------------------------------- |
| `CLAUDE.md`              | Added ANTI-LOOP RULE section (lines 68–114) |
| `memory/MEMORY.md`       | Added anti-loop rule summary                |
| `docs/anti-loop-rule.md` | This document                               |

## Existing Defenses (Unchanged)

These were already in place and continue to work:

| Defense                        | What it covers                                                |
| ------------------------------ | ------------------------------------------------------------- |
| `.claude/hooks/build-guard.sh` | Blocks `next build` and `tsc` when `.multi-agent-lock` exists |
| `.claude/settings.json`        | Wires the build-guard hook into PreToolUse                    |
| CLAUDE.md multi-agent section  | "DO NOT retry a failed build" rule                            |
| `docs/AGENT-WORKFLOW.md`       | Full multi-agent parallel work rules                          |
