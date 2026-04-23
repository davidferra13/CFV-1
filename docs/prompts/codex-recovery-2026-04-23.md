# Codex Recovery Agent: Post-Absence Reconstruction

You are taking over a ChefFlow codebase after ~4 days of unsupervised Codex work. Claude Code (the primary agent) was offline from April 19 to April 23. During that gap, Codex made code changes without following project documentation standards. Your job is to restore process discipline without breaking what works.

---

## MANDATORY FIRST STEP

Read `CLAUDE.md` at the project root. It is the law of this codebase. Then run:

```bash
bash scripts/session-briefing.sh
cat docs/.session-briefing.md
```

This gives you build state, recent commits, and session continuity. If the build is broken, note it but do NOT fix it yet.

---

## SITUATIONAL AWARENESS

### Baseline (last verified Claude Code session)
- **Commit:** `39c69cbd2` (2026-04-19 12:19:45 EDT)
- **Message:** "fix: force dark mode permanently, remove all theme toggle buttons"
- **Session digest:** `docs/session-digests/2026-04-19-draft.md`

### What happened after baseline
Codex (GPT-5.4) worked from April 20-23 and produced:

**7 committed changes (72 files, +8226/-1220):**

| # | Hash | Message |
|---|------|---------|
| 1 | `4427048f0` | feat(auth): add privileged mutation policy contract |
| 2 | `96deee3c0` | docs(session): record privileged mutation closeout |
| 3 | `f361f6e1d` | feat(quotes): unify quote draft prefill contract |
| 4 | `77c52a867` | feat(client-interaction-ledger): add canonical relationship ledger |
| 5 | `195d0713f` | fix(ai): close task-todo contract drift |
| 6 | `150ad5152` | feat(client-profile-engine): wire chef workflow |
| 7 | `bf4ebd24d` | feat(operator-walkthrough-lane): close founder evaluation flow |

**508 uncommitted file changes (+41303/-13799)** across:
- 156 app/ files, 146 lib/ files, 79 components/ files, 56 tests/ files
- 21 scripts/, 16 docs/, 11 project-map/, plus config/infra

**7 new files (uncommitted):**
- `lib/security/public-intent-guard.ts`
- `tests/unit/public-intent-guard.test.ts`
- `tests/unit/public-intent-flows.test.ts`
- `docs/changes/2026-04-23-public-intent-hardening.md`
- `docs/session-digests/2026-04-23-public-intent-hardening.md`
- `public/proof/public-intent-book-2026-04-23.png`
- `public/proof/public-intent-chef-inquiry-2026-04-23.png`

**5 Codex session digests exist:**
1. `docs/session-digests/2026-04-22-canonical-intake-lane-truth-pack.md` (Agent: Codex)
2. `docs/session-digests/2026-04-22-ledger-backed-next-best-action.md` (Agent: Codex)
3. `docs/session-digests/2026-04-22-tasks-create-path-reliability.md` (Agent: Codex)
4. `docs/session-digests/2026-04-23-public-intent-hardening.md` (Agent: Builder, but commits "pending")
5. `docs/session-digests/2026-04-23-draft.md` (unfilled template)

**Memory Palace:** Zero new entries since April 19. Complete gap.

### 10 known work units (from digests + commits)

| # | Unit | Evidence | Status |
|---|------|----------|--------|
| 1 | Privileged mutation policy | commits 1-2 | committed |
| 2 | Quote draft prefill unification | commit 3 | committed |
| 3 | Client interaction ledger | commit 4 | committed |
| 4 | Task-todo contract drift fix | commit 5 | committed |
| 5 | Client profile engine | commit 6 | committed |
| 6 | Operator walkthrough lane | commit 7 | committed |
| 7 | Canonical intake lanes | digest only | uncommitted |
| 8 | Ledger-backed next best action | digest only | uncommitted |
| 9 | Tasks create path reliability | digest only | uncommitted |
| 10 | Public intent hardening | digest + 7 new files | uncommitted |

The remaining ~400 uncommitted file changes have no session digest. They need to be categorized.

---

## PHASE A: INVENTORY (read-only, no edits)

**Goal:** Produce a complete, categorized inventory of every change since baseline.

### A1. Categorize uncommitted files

Run `git diff --name-only HEAD` to get the full file list. For each file, determine which work unit it belongs to by reading the Codex session digests and cross-referencing file paths mentioned.

Group files into:
- One of the 10 known work units above
- "cross-cutting" (changes that touch multiple units, like nav-config.tsx)
- "docs-only" (living doc updates: build-state, product-blueprint, user-manual, app-complete-audit, project-map)
- "orphan" (changes that don't map to any known unit)

### A2. Assess completion status

For each of the 10 work units, answer:
1. Is the code complete (feature works end-to-end)?
2. Are there tests?
3. Are the living docs updated?
4. Were any database schema changes made?
5. Were any new server actions created?

### A3. Identify high-risk changes

Flag any file that touches:
- `lib/auth/` or auth gates
- `lib/db/schema/` or migrations
- `lib/finance/` or ledger logic
- `middleware.ts`
- `app/api/` routes (especially public ones)
- Any file with `'use server'` directive

### A4. Output

Write the complete inventory to `docs/changes/2026-04-23-codex-recovery-inventory.md` with this structure:

```markdown
# Codex Recovery Inventory (2026-04-23)

## Baseline
Commit: 39c69cbd2 (2026-04-19)

## Committed Changes (7 commits, 72 files)
[table: hash, files touched, work unit, risk level]

## Uncommitted Changes (508 files)

### Work Unit 1: [name]
Files: [list]
Status: [complete/partial/unknown]
Has tests: [yes/no]
Docs updated: [yes/no]
Risk areas: [auth/db/finance/public/none]

[repeat for all 10 units + cross-cutting + docs-only + orphan]

## High-Risk File Inventory
[table: file path, what changed, which unit, risk type]

## Schema Changes
[any migrations or schema.ts changes, with exact SQL if applicable]

## New Server Actions
[every new 'use server' export, with auth gate status]
```

**STOP after Phase A. Do not proceed to Phase B until the developer reviews the inventory.**

---

## PHASE B: MEMORY PALACE RECONSTRUCTION

**Goal:** Create memory entries for each work unit so future Claude Code sessions inherit full context.

### Memory file schema

Each memory file goes in the `memory/` directory at the project root. Use this exact format:

```markdown
---
name: [short name]
description: [one-line description, specific enough to judge relevance in future conversations]
type: project
---

[What was built and why]

**Why:** [motivation, constraint, or stakeholder ask that drove this work]

**How to apply:** [how this should shape future suggestions or decisions]

**Depends on:** [other work units or existing systems this relies on]

**Completion status:** [complete/partial, with specifics on what remains]

**Built by:** Codex (April 22-23, 2026). Not reviewed by Claude Code at time of writing.
```

### Naming convention

Follow existing pattern in `memory/`: `project_[descriptive_slug].md`

Examples from existing entries:
- `project_completion_contract.md`
- `project_event_lifecycle_integrity.md`
- `project_ingredient_lifecycle.md`

### MEMORY.md index

After creating all memory files, add entries to `memory/MEMORY.md` under a new section:

```markdown
## Codex Recovery (April 22-23, 2026)
- [Privileged Mutation Policy](project_privileged_mutation_policy.md) - Auth hardening for privileged mutations. Codex, unreviewed.
- [Quote Prefill Unification](project_quote_prefill_unification.md) - ...
[etc.]
```

### What NOT to put in memory
- File paths or code patterns (derivable from code)
- Git history details (derivable from git log)
- Debugging solutions (the fix is in the code)
- Anything already in CLAUDE.md

Focus on: decisions, dependencies, completion status, what remains open, and WHY things were done.

---

## PHASE C: COMPLIANCE AUDIT

**Goal:** Check every post-baseline change against CLAUDE.md rules. Flag violations.

### C1. Automated scans

```bash
bash scripts/compliance-scan.sh    # em dashes, OpenClaw in UI, ts-nocheck exports
bash scripts/hallucination-scan.sh # 7-pattern zero-hallucination audit
npx tsc --noEmit --skipLibCheck    # type safety
```

Record all output.

### C2. Manual checks (CRITICAL)

For every new file with `'use server'` directive (search with `rg "'use server'" --files-with-matches`), verify the Server Action Quality Checklist from CLAUDE.md:

1. **Auth gate** - Does it call `requireChef()`, `requireClient()`, or `requireAuth()`?
2. **Tenant scoping** - Is `tenant_id` derived from session, never from request body?
3. **Input validation** - Are inputs validated (Zod, manual checks, etc.)?
4. **Error propagation** - Does it return `{ success, error? }` and never silently return zero?
5. **Mutation feedback** - Does it provide feedback to the caller?
6. **Cache busting** - After mutations, does it call `revalidatePath`/`revalidateTag`?
7. **Internal functions** - Are non-exported helpers in separate non-`'use server'` files?

### C3. Architecture coherence

Check against CLAUDE.md patterns:
- Financial state derived from ledger, never stored directly?
- Non-blocking side effects wrapped in try/catch?
- No forced onboarding gates in chef layout?
- Monetization: no locked buttons, no Pro badges?
- Button/Badge variants only use allowed values?

### C4. Security boundaries

For every public API route (`app/api/` without auth):
- Rate limiting present?
- Input sanitization?
- No tenant data leakage?

For `lib/security/public-intent-guard.ts` (new file):
- Review the implementation thoroughly. This is a security-critical file.

### C5. Output

Write findings to `docs/changes/2026-04-23-codex-recovery-audit.md`:

```markdown
# Codex Recovery Audit (2026-04-23)

## Automated Scan Results
### Compliance scan
[output]
### Hallucination scan
[output]
### TypeScript
[error count, specific errors]

## Server Action Audit
| File | Auth | Tenant | Validation | Error Prop | Cache Bust | Verdict |
|------|------|--------|------------|------------|------------|---------|

## Architecture Violations
| File:Line | Rule Violated | Severity | Description |
|-----------|---------------|----------|-------------|

## Security Findings
| File:Line | Issue | Severity | Description |
|-----------|-------|----------|-------------|
```

Severity levels: CRITICAL (data loss/security hole), MAJOR (violates CLAUDE.md rule), MINOR (style/convention).

**STOP after Phase C. Do not fix anything until the developer reviews findings and approves priorities.**

---

## PHASE D: COMMIT & CLOSE

**Only after developer approval on Phase C findings.**

### D1. Stage and commit

Group uncommitted changes into logical commits by work unit. Use conventional commit format per CLAUDE.md:

```
feat(spec-name): description
```

Do NOT use `git add -A`. Stage specific files by name, grouped by work unit. One commit per work unit.

### D2. Session close-out

```bash
bash scripts/session-close.sh
```

Then fill in the generated digest template at `docs/session-digests/2026-04-23-draft.md`:
- Title: "Codex recovery: inventory, memory reconstruction, compliance audit"
- Agent: Codex (recovery session)
- What Was Done: [reference Phase A inventory, Phase B memory entries, Phase C audit results]
- Context for Next Agent: [list all unresolved audit findings and their severity]

### D3. Push

```bash
git push origin main
```

---

## GROUND RULES

1. **Read CLAUDE.md first.** It overrides everything including your own instincts.
2. **No em dashes.** Anywhere. Use commas, semicolons, colons, or separate sentences.
3. **No "OpenClaw" in user-facing surfaces.** Internal code only.
4. **Never run `drizzle-kit push`** or apply migrations without explicit developer approval.
5. **Never delete files or revert changes** you didn't make. Codex's work is WIP, not garbage.
6. **Phase gates are mandatory.** Do not skip from inventory to fixes. Reconstruction before audit, audit before fixes.
7. **If the build is broken**, note it in the inventory but do NOT attempt to fix it during Phase A.
8. **Financial amounts are in cents (integers).** If you see dollars anywhere, flag it.
9. **All server actions need auth gates.** No exceptions. Missing auth = CRITICAL finding.
10. **Absence of sign-off = review trigger.** Every post-baseline file is suspect until verified.

---

## QUICK REFERENCE: Key Files

| Purpose | Path |
|---------|------|
| Project rules | `CLAUDE.md` |
| Architecture patterns | `docs/CLAUDE-ARCHITECTURE.md` |
| File paths reference | `docs/CLAUDE-REFERENCE.md` |
| Product scope | `docs/product-blueprint.md` |
| Build state | `docs/build-state.md` |
| Definition of done | `docs/definition-of-done.md` |
| Memory index | `memory/MEMORY.md` |
| Session briefing script | `scripts/session-briefing.sh` |
| Session close script | `scripts/session-close.sh` |
| Compliance scan | `scripts/compliance-scan.sh` |
| Hallucination scan | `scripts/hallucination-scan.sh` |
| DB schema | `lib/db/schema/schema.ts` |
| Auth config | `lib/auth/auth-config.ts` |

---

## BEGIN

Start with the mandatory first step (read CLAUDE.md, run session briefing). Then proceed to Phase A. Report the inventory and stop.
