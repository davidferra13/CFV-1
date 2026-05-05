# ChefFlow Agent Orchestration Pipeline

> **Purpose:** Maximize Codex usage after May 5 reset, minimize Anthropic/Opus burn, maintain code quality and architectural coherence across a 5,617-file codebase.
>
> **Status:** Planning document. Nothing here is implemented yet.
>
> **Date:** 2026-05-04

---

## Part 0: The 10 Diagnostic Questions

### 1. What work should Opus personally do?

- **Architecture decisions:** Cross-module refactors, new domain boundaries, schema design, state machine transitions
- **Security-sensitive work:** Auth changes, tenant scoping, data exposure review, MFA implementation, session management
- **Product judgment calls:** Translating David's chef/business language into technical requirements; deciding what to build vs. skip
- **Plan decomposition:** Breaking a product goal into scoped, safe, parallel task packets for Codex/Sonnet
- **Final integration review:** Reviewing all subordinate agent output before merge; catching regressions, hallucinations, or architectural drift
- **Debugging dead ends:** When a subordinate agent hits strike 2 of the 3-strike rule, Opus intervenes
- **Spec writing and spec review:** Specs define what gets built; they must be Opus-quality
- **CLAUDE.md and hook maintenance:** These govern all agents; errors here cascade everywhere
- **Cross-module wiring:** When a change touches 3+ lib modules or requires understanding the full data flow (e.g., event -> menu -> recipe -> ingredient completion chain)

### 2. What work should Opus never waste tokens on?

- Mechanical file edits (rename, move, reformat)
- Writing boilerplate components from a clear spec
- Adding types/interfaces when the shape is defined
- Running and interpreting test suites
- Scanning for compliance violations (em dash, OpenClaw surface)
- Generating session digests, reports, summaries
- Single-file bug fixes where the cause is already identified
- CSS/Tailwind styling adjustments
- Adding error toasts, loading states, or empty states to existing components
- Writing migration SQL from a defined schema change
- Seed scripts and data backfill scripts
- Documentation updates (USER_MANUAL, app-complete-audit)

### 3. What tasks should Codex handle after the reset?

Codex is best for **scoped, multi-file implementation work** with clear boundaries:

- Implement a component from a spec (inputs, outputs, styling defined)
- Wire a new route: page.tsx, layout, server actions, navigation entry
- Write and run tests for an existing module
- Refactor a single lib module (rename exports, consolidate files, fix imports)
- Apply a pattern across many files (e.g., "add auth gate to all server actions in lib/events/")
- Fix a specific bug with a known root cause and affected files
- Write migration SQL + update Drizzle schema for an additive change
- Build seed/backfill scripts
- Implement server actions from a defined contract
- Add UI states (loading, error, empty) to a list of components

### 4. What tasks are safer for Sonnet?

Sonnet (via Claude Code subagents) fills the gap between Haiku's mechanical scanning and Opus's strategic reasoning:

- Code review of Codex output (cheaper than Opus review for obvious issues)
- QA testing via Playwright (already configured as qa-tester agent)
- Moderate-complexity bug investigation (read code, form hypothesis, suggest fix)
- Writing tests when the module interface is clear but edge cases need judgment
- Documentation generation from code (not from product vision)
- Intermediate planning (breaking an Opus-level plan into Codex-sized tasks)

### 5. What tasks are best for Gemma/local agents?

- Compliance scanning (em dash, OpenClaw in UI strings, @ts-nocheck exports)
- File inventory and structural reports
- Reformatting/normalizing data files
- Summarizing long documents into bullet points
- Generating boilerplate from templates (given exact template + variables)
- Drafting session digests from structured change lists
- Simple data transformations (JSON reshaping, CSV generation)

### 6. How should tasks be split so parallel agents do not collide?

**File-boundary isolation.** Each task packet declares:

- `OWNS`: files this agent may modify (exclusive lock)
- `READS`: files this agent may read but not modify
- `FORBIDDEN`: files this agent must not touch

**Rules:**

- No two concurrent tasks may have overlapping `OWNS` sets
- Shared infrastructure files (`middleware.ts`, `lib/db/schema/schema.ts`, `lib/auth/`, `app/layout.tsx`) are FORBIDDEN for all parallel tasks; only Opus modifies these, sequentially
- Each task works in its own git branch or worktree
- Merges happen sequentially, reviewed by Opus

**Natural boundaries in ChefFlow:**

| Domain boundary           | Typical OWNS scope                                                   |
| ------------------------- | -------------------------------------------------------------------- |
| A single lib module       | `lib/{module}/**`                                                    |
| A single route group      | `app/(chef)/{route}/**`                                              |
| A single component domain | `components/{domain}/**`                                             |
| Database schema           | `lib/db/schema/*.ts` + `database/migrations/*.sql` (SEQUENTIAL ONLY) |
| Shared UI primitives      | `components/ui/**` (SEQUENTIAL ONLY)                                 |

### 7. How should dirty work trees be prevented?

1. **Branch-per-task:** Every Codex task creates a branch named `codex/{task-slug}`
2. **Commit-on-complete:** Task must commit all changes before reporting done. Uncommitted changes = task failure.
3. **No-modify-main:** Codex never pushes to main. Only Opus merges after review.
4. **Worktree isolation:** For truly parallel work, use git worktrees so agents cannot accidentally stage each other's files.
5. **Post-task verification:** `git status --short` must return empty after task completion. Non-empty = reject.
6. **Stale branch cleanup:** Branches older than 48 hours without merge get flagged for review.

### 8. How should every agent prove its work?

Every task completion report must include:

```
## Task Report: {task-slug}
- Branch: codex/{task-slug}
- Files modified: [list]
- Files created: [list]
- tsc --noEmit: PASS/FAIL
- next build: PASS/FAIL (if UI changes)
- Tests run: [count pass/fail]
- Verification command output: [exact output]
- Screenshot: [path, if UI change]
- Commit hash: [sha]
- git status: CLEAN
```

### 9. How should Opus verify subordinate work efficiently?

**Tiered verification (not everything needs full review):**

| Risk level                                                     | Verification                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Low** (styling, docs, boilerplate)                           | `tsc` + `git diff --stat` scan. Accept if clean.                                     |
| **Medium** (new routes, server actions, component logic)       | Read the diff. Check auth gates, tenant scoping, error handling. Run relevant tests. |
| **High** (schema changes, auth, payments, cross-module wiring) | Full diff review + manual testing + regression check against related modules.        |
| **Critical** (data mutations, security, production config)     | Opus does these itself. No delegation.                                               |

**Efficiency tactics:**

- Use `git diff codex/{task-slug}..main` to see only what changed
- Run `tsc --noEmit --skipLibCheck` as first gate (reject immediately if fails)
- Use Haiku to scan the diff for compliance violations before Opus reads it
- Only read files that appear in the diff, not the entire module

### 10. What is the ideal daily operating loop?

See Part 8 below.

---

## Part 1: Orchestration Model

```
                    +------------------+
                    |     DAVID        |
                    | (Product Owner)  |
                    +--------+---------+
                             |
                    business intent / priorities
                             |
                    +--------v---------+
                    |   OPUS 4.6       |
                    |  (Architect /    |
                    |   Coordinator)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     planning |    delegation|     review   |
              |              |              |
    +---------v--+  +--------v-------+  +---v-----------+
    | OPUS PLANS |  | TASK DISPATCH  |  | VERIFICATION  |
    | specs,     |  | to Codex,      |  | tsc, tests,   |
    | decomp,    |  | Sonnet, Haiku, |  | diff review,  |
    | priorities |  | Gemma          |  | merge/reject  |
    +------------+  +--------+-------+  +---------------+
                             |
              +--------------+--------------+-----------+
              |              |              |           |
      +-------v----+ +------v-----+ +------v----+ +---v------+
      |   CODEX    | |  SONNET    | |  HAIKU    | |  GEMMA   |
      | (Primary   | | (QA, code  | | (Scan,    | | (Draft,  |
      |  builder)  | |  review,   | |  extract, | |  reformat|
      |            | |  moderate  | |  report)  | |  summary)|
      +-------+----+ |  debug)    | +-----------+ +----------+
              |       +------+-----+
              |              |
              +--------------+
                     |
              +------v------+
              |  GIT MERGE  |
              | (Opus only) |
              +-------------+
```

**Flow:**

1. David states intent in business language
2. Opus translates to technical plan, decomposes into task packets
3. Opus dispatches tasks to appropriate tier (Codex for implementation, Sonnet for QA/review, Haiku for scanning, Gemma for drafts)
4. Agents execute in isolation (branch-per-task or worktree)
5. Agents report back with proof of work
6. Opus verifies, merges or rejects
7. Opus reports result to David

---

## Part 2: Role Map

### Opus 4.6 (Architect, Coordinator, Final Authority)

**Token budget target:** < 30% of weekly Anthropic allocation

| Responsibility         | Details                                           |
| ---------------------- | ------------------------------------------------- |
| Plan decomposition     | Break product goals into scoped task packets      |
| Architecture decisions | Schema, state machines, cross-module wiring       |
| Security ownership     | Auth, tenant scoping, session, MFA, payments      |
| Spec writing           | Product specs, migration plans, API contracts     |
| Task dispatch          | Write task briefs, assign to correct tier         |
| Verification           | Review diffs, run acceptance checks, merge/reject |
| Debugging escalation   | Intervene when subordinates hit strike 2          |
| CLAUDE.md governance   | Maintain rules, hooks, agent configs              |
| David translation      | Convert chef-language to engineering tasks        |

**Opus must NOT:**

- Write boilerplate components
- Do mechanical file edits
- Run full test suites (delegate, read results)
- Scan for compliance issues
- Write seed scripts or migration SQL from defined schemas
- Style components
- Generate reports or digests

### Codex (Primary Implementation Engine)

**Token budget target:** Maximize usage (resets weekly, use aggressively)

| Responsibility         | Details                                            |
| ---------------------- | -------------------------------------------------- |
| Feature implementation | Build from specs with defined file boundaries      |
| Route wiring           | Create pages, layouts, server actions, nav entries |
| Test writing           | Unit and integration tests for specified modules   |
| Bug fixes              | Known root cause, defined affected files           |
| Refactoring            | Single-module scope, clear before/after contract   |
| Migration SQL          | From defined schema changes (additive only)        |
| Seed scripts           | Data population from defined requirements          |
| Pattern application    | Apply a change pattern across many files           |

**Codex constraints:**

- Must work in `codex/{task-slug}` branch
- Must commit before reporting done
- Must run `tsc --noEmit` and report result
- Must not touch FORBIDDEN files
- Must not modify `middleware.ts`, `lib/auth/`, `lib/db/schema/schema.ts`, or `app/layout.tsx`
- Must not run `drizzle-kit push`
- Must follow CLAUDE.md rules (no em dashes, no OpenClaw in UI, etc.)

### Sonnet (QA, Code Review, Moderate Debug)

**Token budget target:** < 20% of weekly Anthropic allocation

| Responsibility      | Details                                                           |
| ------------------- | ----------------------------------------------------------------- |
| Code review         | Review Codex diffs for obvious issues before Opus sees them       |
| QA testing          | Playwright-based UI verification (qa-tester agent)                |
| Moderate debugging  | Investigate bugs where root cause is unclear but scope is limited |
| Test gap analysis   | Identify what tests are missing for a module                      |
| Documentation       | Generate docs from code (not from product vision)                 |
| Pre-review scanning | Triage Codex output so Opus only reviews what matters             |

### Haiku 4.5 (Mechanical Scanner)

**Token budget target:** Minimal (cheapest Claude tier)

| Responsibility      | Details                                                    |
| ------------------- | ---------------------------------------------------------- |
| Compliance scanning | Em dash, OpenClaw surface, @ts-nocheck exports             |
| File inventory      | Count files, list exports, map imports                     |
| Data extraction     | Pull structured data from unstructured text                |
| Diff scanning       | Check a diff for compliance violations before Opus reviews |
| Pattern matching    | Find all instances of X across the codebase                |

### Gemma 4 e4b (Local, $0)

**Token budget target:** $0 (runs on local Ollama)

| Responsibility         | Details                                        |
| ---------------------- | ---------------------------------------------- |
| Draft generation       | First drafts of docs, summaries, reports       |
| Reformatting           | Normalize data files, reshape JSON/CSV         |
| Template expansion     | Generate boilerplate from exact templates      |
| Session digest drafts  | Given structured change list, draft digest     |
| Simple data transforms | Calculations, aggregations, format conversions |

---

## Part 3: Delegation Decision Tree

```
START: New task arrives from David or from plan decomposition

Q1: Does this task require product judgment, architecture decisions,
    or security-sensitive changes?
    YES -> Opus handles personally
    NO  -> Continue

Q2: Does this task touch shared infrastructure?
    (middleware.ts, lib/auth/, lib/db/schema/schema.ts, app/layout.tsx,
     CLAUDE.md, hooks, agent configs)
    YES -> Opus handles personally
    NO  -> Continue

Q3: Does this task touch payments, ledger, or financial data?
    YES -> Opus handles personally
    NO  -> Continue

Q4: Is the task clearly scoped with defined file boundaries?
    NO  -> Opus decomposes further, then re-enters this tree
    YES -> Continue

Q5: Does the task require multi-file implementation?
    YES -> Delegate to CODEX with full task brief
    NO  -> Continue

Q6: Is it a mechanical scan, compliance check, or data extraction?
    YES -> Delegate to HAIKU
    NO  -> Continue

Q7: Is it a draft, summary, or template expansion?
    YES -> Delegate to GEMMA (local, $0)
    NO  -> Continue

Q8: Is it QA testing, code review, or moderate debugging?
    YES -> Delegate to SONNET
    NO  -> Continue

Q9: Is it a single-file edit with clear instructions?
    YES -> Delegate to CODEX
    NO  -> Opus handles personally
```

**Visual summary:**

```
Security/Arch/Product/Shared infra/Payments -> OPUS
Multi-file implementation from spec          -> CODEX
Single-file edit with clear instructions     -> CODEX
QA testing, code review, moderate debug      -> SONNET
Mechanical scan, compliance, extraction      -> HAIKU
Drafts, summaries, templates, reformatting   -> GEMMA
Unclear scope                                -> OPUS decomposes first
```

---

## Part 4: Safe Parallel-Agent Protocol

### Rules for Parallel Execution

1. **Exclusive file ownership:** No two concurrent agents may modify the same file. Period.

2. **Domain isolation:** Parallel tasks should target different lib modules and route groups. Natural parallel pairs:
   - `lib/events/` + `lib/recipes/` (separate domains)
   - `app/(chef)/events/` + `app/(chef)/clients/` (separate routes)
   - `components/events/` + `components/recipes/` (separate component dirs)

3. **Shared files are sequential-only:**
   - `lib/db/schema/schema.ts` (all schema changes sequential)
   - `middleware.ts`
   - `lib/auth/auth-config.ts`
   - `app/layout.tsx`, `app/(chef)/layout.tsx`
   - `components/ui/*` (shared primitives)
   - `tailwind.config.ts`, `next.config.ts`
   - `package.json` (dependency additions sequential)

4. **Branch discipline:**
   - Each parallel task gets `codex/{task-slug}` branch
   - All branch from current `main` HEAD
   - No rebasing during execution
   - Merge order: Opus decides based on dependency graph

5. **Conflict detection:**
   - Before merging task B, check if task A's merge created conflicts in task B's branch
   - If conflicts: Opus resolves manually or sends task B back for rebase
   - Never auto-resolve conflicts in shared files

6. **Maximum concurrency:** 3 parallel Codex tasks at a time. More than that increases collision risk and makes verification harder.

### Safe Parallel Patterns

| Pattern                                           | Example                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Two independent routes                            | Build `/events/[id]/prep` while building `/clients/[id]/history`               |
| Feature + tests for different module              | Build `lib/tickets/` while writing tests for `lib/recipes/`                    |
| UI component + server action in different domains | Build `components/events/PrepTimeline` while building `lib/clients/actions.ts` |
| Scan + build                                      | Haiku scans codebase for X while Codex builds Y                                |

### Unsafe Parallel Patterns (NEVER)

| Pattern                                                | Why                                                 |
| ------------------------------------------------------ | --------------------------------------------------- |
| Two tasks modifying schema                             | Migration timestamp conflicts, FK dependency issues |
| Task A builds component, Task B modifies shared UI lib | Import/export conflicts                             |
| Two tasks adding dependencies                          | package.json merge conflicts                        |
| Task A modifies auth, Task B builds protected route    | Auth contract might change mid-build                |

---

## Part 5: Codex Task Template

Every task dispatched to Codex must follow this template:

```markdown
# CODEX TASK: {task-slug}

## Objective

{One paragraph: what to build and why}

## Branch

codex/{task-slug}

## Files You May INSPECT (read-only)

- {list of files/dirs the agent should read for context}

## Files You May MODIFY

- {exhaustive list of files/dirs the agent may create or edit}

## Files You Must NOT Touch

- middleware.ts
- lib/auth/
- lib/db/schema/schema.ts
- app/layout.tsx
- CLAUDE.md
- {any additional forbidden files}

## Requirements

1. {Specific requirement}
2. {Specific requirement}
3. {Specific requirement}

## Constraints

- Follow CLAUDE.md rules (no em dashes, no OpenClaw in UI, etc.)
- All server actions must include: auth gate, tenant scoping, input validation,
  error propagation, mutation feedback
- No @ts-nocheck
- No `drizzle-kit push`
- Additive migrations only (no DROP, DELETE, TRUNCATE)

## Expected Output

- {What files should exist when done}
- {What behavior should be observable}

## Verification Commands
```

npx tsc --noEmit --skipLibCheck

# (if UI): npx next build --no-lint

# (if tests): npm run test -- --filter={module}

git status --short # must be empty

```

## Success Criteria
- [ ] tsc passes
- [ ] All listed files created/modified
- [ ] {Specific behavioral criterion}
- [ ] {Specific behavioral criterion}
- [ ] git status is clean (all changes committed)

## Rollback
If this task fails or produces broken output:
```

git checkout main
git branch -D codex/{task-slug}

```

## Report Format
When complete, output:
- Branch name and commit hash
- Files modified/created (list)
- tsc result
- Test results (if applicable)
- Any deviations from the spec (explain why)
```

---

## Part 6: Sonnet Task Template

```markdown
# SONNET TASK: {task-slug}

## Type

{code-review | qa-test | debug-investigate | test-gap-analysis | doc-generation}

## Objective

{What to review/test/investigate and why}

## Scope

- Branch to review: codex/{source-task-slug}
- Files in scope: {list}
- Compare against: main

## Context

- {What the Codex task was supposed to accomplish}
- {Any specific concerns to watch for}

## Checklist

### For Code Review:

- [ ] Auth gates present on all server actions
- [ ] Tenant scoping (userId/chefId) on all queries
- [ ] No em dashes in strings
- [ ] No OpenClaw in user-visible strings
- [ ] Error states handled (not swallowed)
- [ ] No optimistic updates without try/catch + rollback
- [ ] No @ts-nocheck
- [ ] Imports resolve correctly

### For QA Test:

- [ ] Page renders without errors
- [ ] Console has no errors
- [ ] Interactive elements respond
- [ ] Navigation works correctly
- [ ] Edge cases tested (empty state, error state, loading state)

## Report Format

- PASS / FAIL / PASS WITH NOTES
- Issues found (file:line, severity, description)
- Recommendation: MERGE / FIX REQUIRED / REJECT
```

---

## Part 7: Verification Checklist

Opus uses this checklist when reviewing any subordinate agent's output:

### Gate 1: Mechanical (automated, free)

- [ ] `tsc --noEmit --skipLibCheck` exits 0
- [ ] `git status --short` is empty (all committed)
- [ ] Branch is named correctly (`codex/{task-slug}`)
- [ ] No files outside the MODIFY boundary were changed

### Gate 2: Compliance (Haiku scan, cheap)

- [ ] No em dashes in changed files
- [ ] No OpenClaw in user-visible strings
- [ ] No @ts-nocheck in new files
- [ ] No hardcoded dollar amounts in JSX

### Gate 3: Quality (Opus reads diff)

- [ ] Auth gate on every server action
- [ ] Tenant scoping on every DB query
- [ ] Error states propagated (not swallowed)
- [ ] No `return { success: true }` on no-ops
- [ ] Cache invalidation uses correct method (revalidateTag for unstable_cache)
- [ ] No new dependencies added without justification
- [ ] Immutable tables not mutated (ledger_entries, event_transitions, quote_state_transitions)

### Gate 4: Behavioral (Sonnet QA or manual)

- [ ] Feature works as specified
- [ ] No regressions in adjacent features
- [ ] UI matches expected layout
- [ ] Edge cases handled (empty, error, loading)

### Gate 5: Merge Decision

- ALL gates pass -> MERGE
- Gate 1 or 2 fail -> REJECT, send back with fix instructions
- Gate 3 issues -> REJECT or FIX (depending on severity)
- Gate 4 issues -> REJECT, create follow-up task

---

## Part 8: Daily Operating Loop

### Morning (Opus, 15-20 min)

1. **Context load:** session briefing, build state, git status, priorities
2. **Triage:** What broke overnight? (Hermes reports, build state) Fix blockers first.
3. **Plan the day:** Identify 3-5 tasks from product blueprint or backlog
4. **Decompose:** Break each task into Codex-sized packets using the delegation tree
5. **Dispatch batch 1:** Send 2-3 parallel Codex tasks (non-overlapping domains)

### Midday (Opus, 10-15 min per review cycle)

6. **Receive Codex results:** Read task reports
7. **Gate 1-2:** Run mechanical + compliance checks (Haiku assist)
8. **Gate 3:** Read diffs for quality issues
9. **Merge or reject:** Good work merges to main. Bad work gets a narrower fix task.
10. **Dispatch batch 2:** Next set of parallel tasks (if any)
11. **Sonnet QA:** Send merged work to qa-tester for UI verification

### Afternoon (Opus, 10-15 min per review cycle)

12. **Review batch 2 results**
13. **Handle escalations:** Intervene on anything that hit strike 2
14. **Integration verification:** Run `tsc` + `next build` on main after all merges
15. **Dispatch any final tasks** (cleanup, docs, test gaps)

### End of Day (Opus, 5-10 min)

16. **Final build verification:** `tsc` + `next build` must pass on main
17. **Session digest:** Gemma drafts, Opus reviews
18. **Commit and push:** All work on GitHub
19. **Update priorities:** Adjust tomorrow's plan based on what shipped

### Token Budget Per Day

| Agent  | Daily target                                     | What it covers                   |
| ------ | ------------------------------------------------ | -------------------------------- |
| Opus   | 3-4 short sessions (plan, review, review, close) | ~40 min active reasoning         |
| Codex  | 6-10 task packets                                | Primary implementation volume    |
| Sonnet | 2-3 QA/review sessions                           | QA testing + pre-review scanning |
| Haiku  | 4-6 scans                                        | Compliance + diff scanning       |
| Gemma  | Unlimited                                        | Drafts, summaries, reformats     |

---

## Part 9: What NOT to Delegate

### Never Delegate to Codex

1. **Schema changes to `schema.ts`** (cross-table FK dependencies, Opus must reason about data model)
2. **Auth/session/MFA logic** (security-critical, requires full system understanding)
3. **Payment/Stripe integration** (financial data, compliance, idempotency)
4. **Middleware changes** (affects every request, blast radius too high)
5. **Cross-module state machines** (event lifecycle FSM, quote transitions, ledger entries)
6. **CLAUDE.md, hooks, or agent config changes** (meta-system, governs all agents)
7. **Data migrations on production tables** (risk of data loss)
8. **Changes to more than 3 lib modules in one task** (scope too wide, collision risk)
9. **Anything involving immutable tables** (ledger_entries, event_transitions, quote_state_transitions)

### Never Delegate to Sonnet

1. Architecture decisions (use Opus)
2. Spec writing (use Opus)
3. Multi-module refactors (use Codex with Opus plan)
4. Production data mutations (Opus only)

### Never Delegate to Haiku

1. Anything requiring judgment or context
2. Code that ships without review
3. Debugging (cannot form hypotheses)

### Never Delegate to Gemma

1. Anything requiring project-specific reasoning
2. Security-sensitive code review
3. Multi-file code generation
4. Architecture or design decisions

---

## Part 10: Final Recommendation for May 5th

### The Shift

**Before (current):** Opus does everything. 70% Anthropic burn in 48 hours. Unsustainable.

**After (new model):** Opus is the brain, Codex is the hands. Opus thinks for ~40 min/day, Codex executes for hours.

### Concrete Steps for May 5th

1. **Morning:** Opus loads context, reviews product blueprint, identifies top 3-5 tasks for the day.

2. **Decompose:** Each task becomes 1-3 Codex task packets using the template in Part 5. Write them as files in `docs/codex-tasks/` (or paste directly into Codex).

3. **Dispatch:** Send first batch (2-3 non-overlapping tasks) to Codex. Each in its own branch.

4. **While Codex works:** Opus does zero implementation. Opus can do spec writing, architecture planning for tomorrow, or nothing.

5. **Review:** When Codex finishes, Opus runs the verification checklist (Part 7). Merge good work, reject bad work with a focused fix task.

6. **Repeat:** Dispatch batch 2. Review. Dispatch batch 3 if time allows.

7. **QA:** After merges, send Sonnet to QA test the integrated result.

8. **Close:** Session digest (Gemma draft), commit, push.

### Expected Impact

| Metric                    | Before                         | After                                      |
| ------------------------- | ------------------------------ | ------------------------------------------ |
| Opus tokens/day           | ~80% of daily budget           | ~30% of daily budget                       |
| Implementation throughput | Limited by Opus context window | 6-10 Codex tasks/day                       |
| Regression risk           | Single agent, no isolation     | Branch isolation + verification gates      |
| Context freshness         | Bloated single session         | Clean task packets, fresh context per task |
| Cost efficiency           | Opus doing Haiku-tier work     | Each tier does its tier                    |

### What Could Go Wrong

1. **Codex misunderstands the task:** Mitigate with precise task templates. First few days, be extra detailed in specs.
2. **Merge conflicts between parallel tasks:** Mitigate with strict file-boundary rules. Start with 2 parallel, scale to 3 after gaining confidence.
3. **Codex violates CLAUDE.md rules:** Mitigate with Haiku compliance scan before Opus review. Add CLAUDE.md rules to every task brief header.
4. **Over-delegation:** If Opus spends more time writing task briefs than it would spend doing the work, the task is too small to delegate. Just do it.
5. **Under-delegation:** If Opus catches itself writing a component, stop. Decompose and dispatch.

### Rule of Thumb

> **If the task requires knowing WHY, Opus does it.**
> **If the task requires knowing WHAT (and the what is defined), delegate it.**

---

## Appendix A: Existing Agent Configs to Update

The current agent configs in `.claude/agents/` were designed for a Sonnet-primary workflow. Updates needed:

| Agent          | Current State            | Needed Change                                                                                                              |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `haiku-worker` | Read-only mechanical     | Good as-is. Expand usage for diff scanning.                                                                                |
| `opus-advisor` | Advisory role for Sonnet | Repurpose: Opus IS the primary now, not an advisor. This agent becomes unnecessary when Opus is the main session.          |
| `qa-tester`    | Sonnet-based QA          | Change model to Haiku for basic checks; keep Sonnet for complex flows. Or keep as Sonnet since QA needs moderate judgment. |

New agent config needed:

- **codex-dispatcher:** A structured task template generator that Opus can use to quickly format Codex task packets. Could be a skill rather than an agent.

## Appendix B: Codex-Specific Considerations

### Codex Strengths (Leverage These)

- Fresh context per task (no session bloat)
- Good at following explicit instructions
- Can run tests and report results
- Works well with defined file boundaries
- Multiple tasks can run in parallel

### Codex Limitations (Mitigate These)

- No persistent memory between tasks
- Cannot ask clarifying questions mid-task
- May not understand ChefFlow-specific domain rules without explicit inclusion
- Cannot access external services (Ollama, Pi, etc.)
- Limited context about cross-module dependencies

### Mitigation Strategy

- Include relevant CLAUDE.md excerpts in every task brief
- Include relevant schema excerpts when the task touches DB
- Specify exact import paths for shared utilities
- Include example code from similar existing implementations ("pattern file: lib/events/actions.ts, follow the same auth + tenant pattern")
- Test verification must be automatable (no "look at the screen and check")

---

## Appendix C: Emergency Overrides

Sometimes the pipeline breaks. Here's when to break the rules:

| Situation                                       | Override                                           |
| ----------------------------------------------- | -------------------------------------------------- |
| Production is down                              | Opus fixes immediately, no delegation              |
| David needs something in < 30 min               | Opus does it, skip the pipeline                    |
| Codex is unavailable (quota, outage)            | Fall back to Opus + Sonnet subagents               |
| A task turns out to be 5x bigger than estimated | Opus re-decomposes, does not let Codex struggle    |
| Merge conflict cascade                          | Stop all parallel work, Opus resolves sequentially |
| 3-strike rule hit                               | Opus intervenes directly at strike 2               |
