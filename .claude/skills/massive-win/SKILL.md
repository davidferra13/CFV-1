---
name: massive-win
description: Identify THE single highest-leverage change that would deliver disproportionate value. Not a list - one move that unblocks the most, multiplies the most, or changes the game.
user-invocable: true
---

# Massive Win

Identify THE single highest-leverage change. Not a list. One move.

## Procedure

### 1. Load State

Read these (skip missing):

- `docs/product-blueprint.md` - progress, what's left
- `docs/build-state.md` - what's broken/working
- `docs/.session-briefing.md` - recent context
- `system/persona-batch-synthesis/saturation.json` - persona gap data
- `system/persona-batch-synthesis/priority-queue.json` - queued work
- Latest file in `docs/session-digests/`
- `memory/project_current_priorities.md`
- `memory/user_business_reality_april2026.md`

### 2. Score Candidates

For each candidate, score:

| Factor          | Weight | Question                                                   |
| --------------- | ------ | ---------------------------------------------------------- |
| Unblock         | 3x     | Does this unblock other stalled work?                      |
| Multiply        | 3x     | Does this make existing features more valuable?            |
| User pain       | 2x     | Does this fix the developer's biggest current frustration? |
| Business impact | 2x     | Does this move real dinners/revenue forward?               |
| Effort          | 1x     | Can it be done in one session? (bonus, not requirement)    |

### 3. Pick ONE

Not two. Not three. One. Highest weighted score wins.

Tie-breaker: pick the more reversible option.

### 4. Output

```
## MASSIVE WIN

**The Move:** [one sentence]

**Why This Over Everything Else:**
[2-3 sentences. What it unblocks, what it multiplies, why NOW]

**Effort Estimate:** [small/medium/large]

**What Changes After This Ships:**
- [downstream effect 1]
- [downstream effect 2]
- [downstream effect 3]

**First Step:** [the literal first thing to do]
```

## Rules

- NO lists of "also consider". One winner.
- NO hedging. Commit to a pick.
- Business reality trumps technical elegance.
- If developer's stated priorities conflict with data, flag it but respect developer's call.
- Re-run anytime priorities shift. The answer changes as the project evolves.
