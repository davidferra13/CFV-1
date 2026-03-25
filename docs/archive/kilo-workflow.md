# Kilo Workflow — Local AI + Claude Code

## The Model

```
Kilo (free, local)          Claude Code (paid, senior)
─────────────────           ──────────────────────────
Writes new files            Reviews every Kilo commit
Simple component scaffolds  Wires components into the app
Utility functions           Multi-file changes
Data transformers           Database/auth/financial logic
Boilerplate                 Architecture decisions
                            Bug fixes
                            Integration + testing
```

## The Workflow (every time)

### Step 1: Branch (you do this)

```bash
git checkout feature/your-branch
git checkout -b kilo/<task-name>
```

Always branch off your current feature branch. Kilo never works on `main` or your feature branch directly.

### Step 2: Task Kilo (give it a prompt)

Start every Kilo prompt with:

```
Read KILO.md first. Then do the following task:
```

Then give it a clear, specific task. Good prompts:

- "Create `lib/utils/date-helpers.ts` with functions for: ..."
- "Create `components/events/guest-count-badge.tsx` that renders: ..."
- "Edit `lib/utils/currency.ts` — add a `formatCurrencyRange(minCents, maxCents)` function"

Bad prompts (too vague, will get bad results):

- "Improve the event page"
- "Fix the styling"
- "Add error handling everywhere"

### Step 3: Review (Claude Code does this)

Tell Claude Code: "Review Kilo's work on the `kilo/<task-name>` branch"

Claude Code will:

1. `git diff` to see exactly what changed
2. Check that only the intended files were touched
3. Read the code for quality, types, edge cases
4. Run `npx tsc --noEmit --skipLibCheck` to verify it compiles
5. Grade it and either approve or fix issues

### Step 4: Merge or discard

If approved:

```bash
git checkout feature/your-branch
git merge kilo/<task-name>
git branch -d kilo/<task-name>
```

If rejected:

```bash
git checkout feature/your-branch
git branch -D kilo/<task-name>
```

Zero risk either way — your real branch is never touched until you explicitly merge.

---

## Task Categories

### Green (Kilo-safe)

- New utility files in `lib/utils/`
- New pure component files (no data fetching)
- Type definitions and interfaces
- Static content (copy, labels, config objects)
- CSS/Tailwind styling for isolated components
- Data transformation/formatting helpers
- **Writing and running tests** (unit, integration, Playwright)
- **Fixing test failures** (unless the root cause is in auth/DB/billing — escalate to Claude Code)

### Yellow (Kilo with detailed spec)

- Editing a single existing file (must specify exact function/section)
- New components that import from existing project files
- New server action files (must specify exact pattern to follow)

### Red (Claude Code only)

- Anything touching `database/migrations/`
- Auth logic (`middleware.ts`, `lib/auth/`)
- Financial logic (`lib/ledger/`, payment routes)
- Multi-file refactors
- Bug fixes (require understanding root cause across files)
- Wiring features into existing pages
- Config changes (`next.config.js`, `package.json`, etc.)
- Anything that needs to understand the full event FSM

---

## Quick Reference Commands

```bash
# Before Kilo starts
git checkout -b kilo/task-name

# After Kilo finishes — check what it did
git diff main..HEAD --stat          # files touched
git diff main..HEAD                 # full diff
git log --oneline main..HEAD        # commits made

# Accept
git checkout feature/your-branch && git merge kilo/task-name && git branch -d kilo/task-name

# Reject
git checkout feature/your-branch && git branch -D kilo/task-name
```

---

## Work Log (MANDATORY)

After every task, Kilo **must** append an entry to `docs/kilo-work-log.md`. This is the "show your work" system — Claude Code reads this file to know what to review.

Format:

```markdown
## [Date] — [Task Name]

- **Branch:** `kilo/<task-name>`
- **Files created/modified:** list each file
- **What I built:** 1-2 sentence summary
- **Decisions I made:** any choices or assumptions
- **Unsure about:** anything you weren't confident in
```

Claude Code uses this log to:

1. See everything Kilo has done at a glance
2. Prioritize what to review
3. Catch potential issues before looking at code

---

## Cost Savings Estimate

If Kilo handles ~40% of boilerplate/utility work:

- Claude Code usage drops proportionally
- Kilo cost: $0 (runs locally)
- Risk: $0 (branch isolation means bad work is just deleted)
- Net: significant savings on routine coding tasks
