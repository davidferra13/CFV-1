# Build: Backup Strategy + Auto-Push Rules

## What Changed

### 1. `vercel.json` — Vercel build gate

Added `ignoreCommand` at the top of the file:

```json
"ignoreCommand": "[ \"$VERCEL_GIT_COMMIT_REF\" = \"main\" ]"
```

**How it works:** Vercel evaluates this shell command before every build. If the command exits with code 0, the build runs. If it exits with code 1, the build is skipped entirely.

- On `main` branch: condition is true → exits 0 → **build runs** (production deploy)
- On any feature branch: condition is false → exits 1 → **build skipped** ($0 cost)

This means pushing feature branches to GitHub for backup is now completely free. Zero Vercel build minutes consumed. Zero preview deployments created.

### 2. `CLAUDE.md` — Permanent push-after-every-session rule

The Git Workflow section now mandates:

> ALWAYS `git push` the current branch to GitHub at the end of every session. This is the off-machine backup. Do not wait to be asked.

Previously the rule said "NEVER push without explicit permission." That was correct for `main` (still true — never merge to main without approval) but was incorrectly blocking feature branch pushes, which are the backup mechanism.

The new rule distinguishes:

- **Feature branch push** → always do it, automatically, end of every session
- **Merge to main / deploy to Vercel** → still requires explicit approval

### 3. `.gitignore` — Junk file exclusions

Added to prevent backup SQLs, logs, and temp files from being accidentally committed:

```
backup-*.sql          # database dumps — may contain real client data
*.log                 # runtime log files
chefflow-watchdog.log # explicit watchdog log
playwright-run-output.txt
fix-tests.flag
null                  # Windows artifact file
.claude/settings.json # machine-specific Claude Code personal settings
```

### 4. `CLAUDE.md` line 1 — Stray `I.#` artifact fixed

The heading was `I.# ChefFlow V1 — Project Rules` (not a valid H1). Fixed to `# ChefFlow V1 — Project Rules`. This also resolves the MD041 IDE warning.

---

## Why This Matters

Before this change, the project had a silent backup gap: 263 uncommitted files and 68 commits existed only on the developer's local machine. If the machine was lost, stolen, or wiped, all of that work would be permanently unrecoverable.

The database (Supabase) was already off-machine and safe. Only the code was at risk.

After this change:

- Every session ends with a push → code is always on GitHub
- Feature branch pushes don't cost money → no reason to delay
- The rule is in CLAUDE.md → all agents follow it automatically without being asked

---

## Session That Triggered This

- 283 files committed in one snapshot commit
- All local branches pushed to GitHub: `feature/scheduling-improvements`, `feature/resend-email`, `feature/wix-integration`, `fix/cron-get-post-mismatch`, `fix/grade-improvements`
- Project is now at a clean, fully-backed-up state
