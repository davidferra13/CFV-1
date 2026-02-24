# ChefFlow — Agent Registry

This project is built by multiple AI agents. This document defines who they are, their authority level, and how to identify their work.

---

## Agent Hierarchy

| Rank | Agent           | Type                         | Cost            | Authority                                                                                                                                                            |
| ---- | --------------- | ---------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Claude Code** | Cloud (Anthropic API)        | Paid            | **Lead engineer.** Full authority. Reviews all other agents' work. Can modify any file, make architectural decisions, run builds, push branches.                     |
| 2    | **Kilo**        | Local (Ollama)               | Free            | **Junior engineer.** Writes code per instructions. All work must be reviewed by Claude Code before shipping. Cannot push, build, or touch config/auth/database.      |
| 2    | **Copilot**     | Cloud (GitHub Copilot/GPT-4) | Free (included) | **Junior engineer.** Same rank and constraints as Kilo. All work must be reviewed by Claude Code before shipping. Cannot push, build, or touch config/auth/database. |

---

## How to Identify Each Agent's Work

### Claude Code

- **Commits:** Standard commit messages (no prefix), with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` when committing via git
- **Files:** No special tag (Claude Code is the default/lead)

### Kilo

- **Commits:** Always prefixed with `kilo:` — e.g., `kilo: feat(utils): add date helpers`
- **Files:** First line is always `// @agent Kilo — review-pending`
- **After review:** Claude Code changes the tag to `// @agent Kilo — reviewed by Claude Code`

### Finding all Kilo code

```bash
# All Kilo commits
git log --oneline --all --grep="kilo:"

# All files Kilo created (pending review)
grep -r "@agent Kilo — review-pending" --include="*.ts" --include="*.tsx" --include="*.css" .

# All files Kilo created (already reviewed)
grep -r "@agent Kilo — reviewed by Claude Code" --include="*.ts" --include="*.tsx" --include="*.css" .
```

### Copilot

- **Commits:** Always prefixed with `copilot:` — e.g., `copilot: feat(utils): add currency formatter`
- **Files:** First line is always `// @agent Copilot — review-pending`
- **After review:** Claude Code changes the tag to `// @agent Copilot — reviewed by Claude Code`

### Finding all Copilot code

```bash
# All Copilot commits
git log --oneline --all --grep="copilot:"

# All files Copilot created (pending review)
grep -r "@agent Copilot — review-pending" --include="*.ts" --include="*.tsx" --include="*.css" .

# All files Copilot created (already reviewed)
grep -r "@agent Copilot — reviewed by Claude Code" --include="*.ts" --include="*.tsx" --include="*.css" .
```

---

## Review Protocol

The same review protocol applies to **all junior agents** (Kilo, Copilot, and any future agents).

1. **Agent commits on an isolated branch** (`kilo/<task-name>` or `copilot/<task-name>`)
2. **Developer asks Claude Code to review** — "review Copilot's work on branch X"
3. **Claude Code runs the review:**
   - `git diff` — check only intended files were touched
   - Read the code — types, edge cases, patterns
   - `npx tsc --noEmit --skipLibCheck` — compile check
   - Verdict: approve, fix, or reject
4. **If approved:** Claude Code updates `// @agent <Name> — review-pending` → `// @agent <Name> — reviewed by Claude Code`, merges to feature branch
5. **If needs fixes:** Claude Code fixes in place, updates the tag, merges
6. **If rejected:** Branch is deleted, no harm done

---

## Adding Future Agents

If a new AI agent is added to the project:

1. Add it to the hierarchy table above with its rank, type, cost, and authority level
2. Define its commit prefix and file tag format
3. Define what it can and cannot do
4. Claude Code remains rank 1 — the lead engineer that reviews all other agents
