# Copilot Workflow — GitHub Copilot + Claude Code

## The Model

```
Copilot (free, included)    Claude Code (paid, senior)
────────────────────────    ──────────────────────────
Writes new files            Reviews every Copilot commit
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
git checkout -b copilot/<task-name>
```

Always branch off your current feature branch. Copilot never works on `main` or your feature branch directly.

### Step 2: Task Copilot (give it a prompt)

**IMPORTANT:** Have `COPILOT.md` open in an editor tab before prompting. Copilot reads context from open files.

Start every Copilot prompt with:

```
Read COPILOT.md first. Then do the following task:
```

Then give it a clear, specific task. Good prompts:

- "Create `lib/utils/date-helpers.ts` with functions for: ..."
- "Create `components/events/guest-count-badge.tsx` that renders: ..."
- "Edit `lib/utils/currency.ts` — add a `formatCurrencyRange(minCents, maxCents)` function"

Bad prompts (too vague, will get bad results):

- "Improve the event page"
- "Fix the styling"
- "Build me a whole system with 5 files and a migration"

### Step 3: Review (Claude Code does this)

Tell Claude Code: "Review Copilot's work on the `copilot/<task-name>` branch"

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
git merge copilot/<task-name>
git branch -d copilot/<task-name>
```

If rejected:

```bash
git checkout feature/your-branch
git branch -D copilot/<task-name>
```

Zero risk either way — your real branch is never touched until you explicitly merge.

---

## Task Categories

### Green (Copilot-safe)

- New utility files in `lib/utils/`
- New pure component files (no data fetching)
- Type definitions and interfaces
- Static content (copy, labels, config objects)
- CSS/Tailwind styling for isolated components
- Data transformation/formatting helpers

### Yellow (Copilot with detailed spec)

- Editing a single existing file (must specify exact function/section)
- New components that import from existing project files
- New server action files (must specify exact pattern to follow)

### Red (Claude Code only)

- Anything touching `supabase/migrations/`
- Auth logic (`middleware.ts`, `lib/auth/`)
- Financial logic (`lib/ledger/`, payment routes)
- Multi-file refactors
- Bug fixes (require understanding root cause across files)
- Wiring features into existing pages
- Config changes (`next.config.js`, `package.json`, etc.)
- Anything that needs to understand the full event FSM

---

## Copilot Test Results (Feb 2026)

**Test 1 — Red-tier multi-file feature (Front-of-House Menu Generator):** Grade D-

- Did not follow COPILOT.md (wasn't open in editor during first test)
- Committed to feature branch instead of isolated `copilot/` branch
- No `copilot:` commit prefix
- Created 26 unrequested inventory files (7,676 lines of scope creep)
- Created 6 DB migrations (forbidden)
- Code was stubs with TODO comments and `any` types
- Hallucinated compliance when confronted about violations

**Test 2 — Red-tier multi-file feature (Back-of-House Menu Management):** Grade D

- Same rule violations as Test 1
- **Deleted working code** in menu-detail-client.tsx, replaced with broken `...existing code...` literal strings
- Hallucinated DB fields that don't exist on the menu object
- Modal buttons with no click handlers

**Conclusion:** Copilot is only safe for Green-tier single-file tasks with tight prompts and inline constraints. Do not trust it with multi-file features, existing code modification, or any Red-tier work.

---

## Cost Savings Estimate

Copilot is included with GitHub subscription — $0 marginal cost per task. If Copilot handles routine single-file utility work:

- Claude Code usage drops proportionally
- Copilot cost: $0 (included in GitHub plan)
- Risk: $0 (branch isolation means bad work is just deleted)
- Net: modest savings on routine single-file tasks only
