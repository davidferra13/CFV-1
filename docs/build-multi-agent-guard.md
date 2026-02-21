# Multi-Agent Build Guard

## What Was Built

A two-layer system to prevent concurrent agents from entering infinite build-retry loops.

### Layer 1 — CLAUDE.md instruction (passive)

A `## MULTI-AGENT MODE` section was added to `CLAUDE.md` (line ~108). Every new agent session reads it automatically. It explains:

- Do your work, commit, and stop
- Do NOT run `npx tsc --noEmit` or `npx next build`
- Do NOT retry a failed build — report and stop
- Why: concurrent builds corrupt `.next/`, fight over ports, and produce false errors

### Layer 2 — PreToolUse hook (hard technical block)

**Files created:**

- `.claude/hooks/build-guard.sh` — intercepts Bash tool calls
- `.claude/settings.json` — registers the hook with Claude Code

**How it works:**

Claude Code fires a `PreToolUse` hook before every Bash command. The hook receives the full tool input as JSON on stdin. If the command contains `next build` or `tsc --noEmit` AND the guard file `.multi-agent-lock` exists at the project root, the hook returns a deny decision. The command never executes. The agent sees the deny reason and cannot override it.

**The guard file:**

```bash
# Enable guard (start of multi-agent session)
touch .multi-agent-lock

# Disable guard (after all agents finish, before running the real build)
rm .multi-agent-lock
```

`.multi-agent-lock` is gitignored — it's a local toggle only.

**What agents see when blocked:**

```
MULTI-AGENT LOCK ACTIVE (.multi-agent-lock exists at project root).
Build and type-check commands are blocked. You are one of several concurrent
agents — running builds in parallel corrupts .next/, causes port conflicts, and
wastes tokens in retry loops. Your job: commit your work and stop. The developer
will run one clean build after all agents finish. Do not retry this command.
```

---

## Workflow

### Starting a multi-agent session

```bash
touch .multi-agent-lock
# Now launch your agents
```

### Ending a multi-agent session

```bash
rm .multi-agent-lock
npx tsc --noEmit --skipLibCheck   # now safe — only one process
npx next build --no-lint          # single clean build
```

---

## Why This Matters

With 10 agents running simultaneously:

- Every agent tries `npx next build` → all fail (`.next/` write conflicts, port 3100 busy)
- Each agent retries → loops indefinitely
- Hundreds of tokens burned per agent, multiplied by 10
- Nothing gets fixed because the build failure is environmental, not a code bug

The guard eliminates the loop entirely. Agents write code, commit it, and stop. One build at the end tells the truth.

---

## Files Changed

| File                           | Change                                             |
| ------------------------------ | -------------------------------------------------- |
| `CLAUDE.md`                    | Added `## MULTI-AGENT MODE` section                |
| `.claude/hooks/build-guard.sh` | New — the hook script (executable 755)             |
| `.claude/settings.json`        | New — registers the PreToolUse hook                |
| `.gitignore`                   | Added `.multi-agent-lock`                          |
| `docs/AGENT-WORKFLOW.md`       | Updated parallel agent rules + fixed build command |
