# ChefFlow V1 - Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

---

> **🚨 CORE MANDATES 🚨**
>
> 1. **Test your own work.** You have Playwright + agent account (`.auth/agent.json`). After writing code: sign in, navigate, screenshot, verify. If broken, fix it. Never ask the developer to verify.
> 2. **Keep moving.** If you know the next step, do it. No unnecessary back-and-forth.
> 3. **Be terse.** No caveats, no restating, no multiple options when one is right.
> 4. **Start dead things, don't kill live things.** Dead server? Start it. Running server? Don't kill it - say "restart when ready."

---

## MODEL STRATEGY (4-Tier System - READ THIS)

**Default model for this project is Opus 4.6.** This is configured in `.claude/settings.json` (`"model": "opus"`). The Max $200/mo plan bills against a token budget. Tier selection is cost discipline, not preference.

**The 4-tier model:**

| Tier         | Model         | Agent/Tool        | Cost      | Purpose                                              |
| ------------ | ------------- | ----------------- | --------- | ---------------------------------------------------- |
| **Local**    | Gemma 4 (e4b) | `ollama-delegate` | $0        | Mechanical bulk work. Drafts, boilerplate, summaries |
| **Worker**   | Haiku 4.5     | `haiku-worker`    | Cheap     | Judgment-light Claude agent tasks                    |
| **Executor** | Opus 4.6      | (main session)    | Standard  | All normal work. Default                             |
| **Advisor**  | Opus 4.6      | `opus-advisor`    | Expensive | Hard decisions only. Most expensive                  |

### LOCAL DELEGATION (PREFERRED FOR MECHANICAL TASKS)

**Before using Haiku for a mechanical task, consider if `ollama-delegate` MCP tools can do it for $0.** The `delegate`, `delegate_code`, `delegate_summarize`, and `delegate_extract` tools route to local Gemma 4 via Ollama. Claude stays the orchestrator and verifies all delegated output.

**Delegate when:** drafting text, generating boilerplate, commit messages, doc sections, compliance scanning, reformatting, summarizing files, extracting structured data, simple code generation.

**Don't delegate when:** multi-file reasoning, architecture decisions, complex debugging, tasks needing tool access or codebase context, security-sensitive code, anything where bad output costs more time than tokens saved.

**Rule of thumb:** if the task is mechanical and you can verify the result in <10 seconds, delegate it.

Requires: Ollama running locally (`ollama serve`). If Ollama is down, fall back to Haiku or do it directly.

### SONNET BAN (ABSOLUTE)

**EVERY `Agent` tool call MUST include `model: "haiku"` or `model: "opus"`.** Omitting it defaults to Sonnet, which drains a separate token bucket and has locked the developer out before. Prefer direct Grep/Glob/Read over spawning agents.

**Haiku** (`model: "haiku"`): judgment-light Claude agent tasks that need tool access (file scanning, compliance checks with codebase context). For tasks that don't need Claude tools, use `ollama-delegate` instead (free).

**Opus Advisor** (`model: "opus"`, `subagent_type: "opus-advisor"`): last resort for hard decisions (architecture tradeoffs, security design, stuck after 2+ failed fixes). Tell it to use extended thinking.

---

## Quick Reference

- **Product Blueprint:** `docs/product-blueprint.md` is THE finish line. V1 scope, progress bar, exit criteria. Read it. Update it when you complete features.
- **Project Map:** `project-map/` is the browsable product mirror. 20 files in 4 folders (chef-os, consumer-os, public, infrastructure). Update the relevant file when you build or change features.
- **Definition of done:** a feature is only done when it is verified in the real UI, honest about failure, and protected against drift. See `docs/definition-of-done.md`
- **Interface philosophy:** all UI work must comply with `docs/specs/universal-interface-philosophy.md`. Mandatory read for all builder agents before any UI implementation.

- **Stack:** Next.js · PostgreSQL (Drizzle ORM via postgres.js) · Auth.js v5 · Stripe · Local FS storage · SSE realtime
- **Data safety first:** all migrations are additive, all destructive ops require explicit approval
- **End every session:** commit everything → push the feature branch → write a session digest → update this file if new rules were found
- **Cloud AI:** all AI routes through a single Ollama-compatible endpoint (OLLAMA_BASE_URL, Gemma 4). No second provider. Conversation content is never stored server-side.
- **Never:** run `drizzle-kit push` without explicit user approval

---

## PROMPT PIPELINE

The developer sends prompts through a refinement pipeline before they reach Claude Code. Prompts are well-formulated and intentional. Treat them at face value. Never second-guess the developer's intent or assume the prompt means something other than what it says.

### NO EM DASHES (ABSOLUTE)

**Never use em dashes anywhere.** Use commas, semicolons, parentheses, colons, or separate sentences instead. Replace em dashes when editing existing files. Automated check: `bash scripts/compliance-scan.sh`.

### NO "OpenClaw" IN PUBLIC SURFACES (ABSOLUTE)

**"OpenClaw" is forbidden from all user-facing surfaces** (UI, errors, emails, localStorage, metadata). Use "system", "engine", or nothing instead. Allowed only in: internal code (variables, imports, comments), internal docs, DB schema names, file paths. Automated check: `bash scripts/compliance-scan.sh`.

### Brand Names - What Things Are Currently Called

Different names are used in different places. This is intentional - don't "fix" one to match another.

| Where                  | Name Used           |
| ---------------------- | ------------------- |
| App / UI / page titles | `ChefFlow`          |
| PWA manifest           | `ChefFlow`          |
| Email sender name      | `CheFlow`           |
| package.json           | `chefflow`          |
| Live domain            | `cheflowhq.com`     |
| App subdomain          | `app.cheflowhq.com` |
| Project folder         | `CFv1`              |
| Tagline                | `Ops for Artists`   |

---

## ANTI-LOOP RULE (MANDATORY)

**3-Strike Rule:** If the same approach fails 3 times, STOP. Commit partial progress, report what failed and what you tried, let the user decide. Continue other tasks.

**What counts:** same fix on same error = strike. Forward progress (error A fixed, new error B appears) = not a strike, keep going. The test: "Am I making progress or going in circles?"

---

## DATA SAFETY (HIGHEST PRIORITY)

These rules exist because this is a **live production app with real client data**. Data loss is unacceptable.

### Database Migrations

- **NEVER** write a migration containing `DROP TABLE`, `DROP COLUMN`, `DELETE`, or `TRUNCATE` without:
  1. Explicitly warning the user in plain language
  2. Explaining exactly what data would be lost
  3. Getting explicit approval before writing the file
- **NEVER** modify an existing column's type or rename a column without explaining the risk first and getting approval.
- All migrations must be **additive by default** - add tables, add columns, add indexes, add constraints. Removing or altering existing structures requires explicit approval.
- Before creating any migration file, **explain in plain English** what it will do to the database.
- **Show the user the full SQL** before writing the migration file.
- Remind the user to **back up their database** before applying migrations with real data.
- **NEVER** run `drizzle-kit push` or apply migrations without explicit user approval. Remind user to back up first.

### Migration Timestamp Collisions

Before creating ANY migration file, glob `database/migrations/*.sql` and pick a timestamp strictly higher than the highest existing one. Never reuse or guess.

### Server Actions & Queries

- Never write a `.delete()` query on production tables without explicit approval.
- Respect existing immutability triggers - never attempt to circumvent the immutability on `ledger_entries`, `event_transitions`, or `quote_state_transitions`.

---

## ZERO HALLUCINATION RULE (MANDATORY)

**The app must never display information that isn't true.** Three laws:

1. **Never show success without confirmation.** Every `startTransition`/optimistic update MUST have `try/catch` with rollback + toast on failure.
2. **Never hide failure as zero.** If data fails to load, show an error state, not `$0.00` or empty arrays that look like real data.
3. **Never render non-functional features as functional.** No clickable buttons that do nothing, no `return { success: true }` on no-ops. Hide or gate unfinished features.

**Flag during normal work:** `startTransition` without try/catch, catch blocks returning zeros, empty onClick handlers, hardcoded financial figures, `return { success: true }` on no-ops.

### Cache Invalidation

When you mutate data, bust every cache that reads it. `revalidatePath` does NOT bust `unstable_cache` tags; use `revalidateTag`. When adding a new `unstable_cache` or mutation, search for all related caches and bust them.

### Server Action Quality Checklist

Every new `'use server'` export must have: (1) auth gate, (2) tenant scoping, (3) input validation, (4) error propagation (never silent zero), (5) mutation feedback (`{ success, error? }`), (6) idempotency guards where needed, (7) cache busting, (8) internal-only functions in non-`'use server'` files. Reference: `docs/function-evaluation-surface.md`.

### `@ts-nocheck` = No Exports

Never create `@ts-nocheck` files. Existing ones must not export callable functions. Fix types or remove exports. Automated check: `bash scripts/compliance-scan.sh`.

### Hallucination Scan

Run `bash scripts/hallucination-scan.sh` for the full 7-pattern audit. Report format: `docs/zero-hallucination-audit.md`.

---

## DEFINITION OF DONE

`built` is not `done`. A feature requires: (1) verified in real app, (2) failure handled honestly, (3) automated drift protection, (4) UI matches reality, (5) complies with `docs/specs/universal-interface-philosophy.md`. Full criteria: `docs/definition-of-done.md`.

Tours/onboarding: every step must target a real element. Missing targets fail closed. Visiting a route is not proof of completion.

---

## SELF-MAINTAINING DOCUMENT

Keep this file current. Add new rules when patterns are established or mistakes repeat. Prune when it exceeds ~5,000 words: remove anything Claude already does correctly without instruction. Also update `MEMORY.md` when adding durable context.

---

## WORKFLOW SKILLS (Slash Commands)

These workflows are now available as `/slash-commands`. Type the command name to run the full procedure:

- **`/morning`** - Daily briefing: build state, overnight changes, servers, Pi health, priorities, session continuity. Start your day here.
- **`/status`** - Quick "where am I?" snapshot: branch, uncommitted work, last commit, what was in progress, what's next.
- **`/ship`** - git add + commit + push. The full "ship it" chain. No confirmation needed.
- **`/soak`** - Full software aging pipeline (useEffect audit, fixes, soak tests). Full docs: `docs/soak-testing.md`
- **`/close-session`** - Standard session close-out (stage, commit, push, update session log + build state)
- **`/pre-flight`** - Builder pre-flight check (git status, tsc, next build)
- **`/feature-closeout`** - Feature close-out (tsc, build, commit, push)
- **`/hallucination-scan`** - Zero Hallucination audit (optimistic updates, silent failures, stale cache, etc.)
- **`/debug`** - Systematic 4-phase debugging. No fixes without root cause first. Escalates to opus-advisor after 3 failures.
- **`/tdd`** - Test-Driven Development. RED (failing test) -> GREEN (minimal code) -> REFACTOR. No production code without a failing test first.
- **`/pi`** - Pi health + OpenClaw status. Connectivity, disk, memory, services, recent cron.
- **`/pipeline`** - OpenClaw pricing pipeline audit. Coverage, freshness, targets vs actuals.
- **`/compliance`** - Rule violation scan: em dashes, OpenClaw in UI, ts-nocheck exports.
- **`/backup`** - Back up ChefFlow database (pg_dump). Safe read-only export.
- **`/first-principles`** - Structured reasoning before building. Breaks assumptions, validates approach.
- **`/5-whys`** - Root cause analysis. Keep asking why until real cause surfaces.
- **`/review`** - Code review on uncommitted changes. Quality gate before `/ship`.
- **`/document`** - Auto-update USER_MANUAL.md and app-complete-audit.md after code changes.
- **`/heal-skill`** - Self-repair a skill that failed or produced bad results.

**End every session:** run `/close-session` or `/ship`. Work must be on GitHub before signing off.

---

## POWER TOOLS

All configured in `.claude/mcp.json`. Use them.

- **LSP** - code navigation (go_to_definition, find_references, hover). Use before Grep for "where is X defined?" or "what calls X?"
- **Worktrees** - isolated git worktree for risky experiments or parallel research. No parallel builds.
- **Agent Teams** - bidirectional `SendMessage` between named agents (experimental, enabled in settings.json)
- **CronCreate** - schedule recurring prompts within a session (polling builds, monitoring logs)
- **Playwright MCP** - direct browser control for quick UI verification. Use qa-tester agent for full test suites.
- **GitHub MCP** - create issues, check PRs, read files from other branches (requires `GITHUB_PERSONAL_ACCESS_TOKEN`)
- **Postgres MCP** - read-only DB queries (inspect data, check schema, verify migrations). No writes.
- **MemPalace MCP** - search 535+ indexed conversations. Backlog: `memory/project_mempalace_backlog.md`
- **`/batch`** - parallel worktree agents for large refactors (symbol renames, compliance sweeps). Not for builds.
- **`/security-review`** - scan uncommitted changes for vulnerabilities before committing
- **Session hygiene:** `/context` (start), `/rewind` (before risky ops), `/compact [focus]` (high context), `/btw` (side questions)

---

## FEATURE LOOKUP

**Three-tier lookup:** (1) `project-map/` for orientation, (2) `docs/product-blueprint.md` for scope/progress, (3) `docs/app-complete-audit.md` for exact components. Don't guess file paths; read docs first.

---

## SESSION AWARENESS (MANDATORY)

### On Start

Run `bash scripts/session-briefing.sh` then read `docs/.session-briefing.md`. If build state is broken, fix it before new work.

### On End

Run `bash scripts/session-close.sh` to generate digest template and session log entry. Fill in judgment parts. Update `docs/build-state.md`, `docs/product-blueprint.md`, and relevant `project-map/` file if applicable. Commit everything + push.

---

## AGENT GATES (Skills - Loaded On Demand)

Full gate procedures are available as skills. They load automatically when relevant, or invoke directly:

- **`/planner`** - Full Planner Gate: context loading, deep inspection, developer notes capture, spec validation with cited evidence. Use when writing or reviewing specs.
- **`/builder`** - Full Builder Gate: queue selection, pre-flight checks, spike, continuous verification, final proof, completion rules. Use when implementing features.
- **`/research`** - Full Research Gate: investigation rules, report format, citation requirements. Use when producing research reports.

**Key rule across all gates:** Every claim must cite file paths and line numbers. No citation = not verified.

---

## DEVELOPMENT WORKFLOW

### Before Changes

Explain what you're about to do for DB, auth, or financial changes. When in doubt, ask.

### Living Documents (update incrementally with every change)

- **`docs/USER_MANUAL.md`** - user-facing manual. Update when UI, workflow, or behavior changes. Edit in-place, not append.
- **`docs/app-complete-audit.md`** - master registry of every page/button/form/modal. Update when adding/removing/renaming UI elements. Skip backend-only or styling-only changes.
- **Follow-up `.md`** - every code change needs a reflecting document explaining what, why, and how.

### Commits & Git

- Spec-tied commits: `feat(spec-name): description`. Standard: `feat`, `fix`, `docs`, `chore`, `refactor`.
- Push to GitHub at end of every session. Commit to `main` unless asked for a feature branch.

### Health Checks (before merging to main)

- `npx tsc --noEmit --skipLibCheck` + `npx next build --no-lint` must exit 0
- Auth/layout/navigation changes: `npm run test:experiential` (all 9 suites pass)
- AI/queue changes: `npm run test:stress:ollama` (all 3 variants PRODUCTION READY)
- `types/database.ts` current. Merge to main only with explicit user approval.

### Agent Testing Account

Credentials in `.auth/agent.json`. Sign in via `POST http://localhost:3100/api/e2e/auth`. Chef role + admin. If missing, run `npm run agent:setup`. Test, find bugs, fix bugs, verify fixes. Full loop, no handoffs.

### Reference Docs

- **`docs/AGENT-WORKFLOW.md`** - full playbook (health checks, migration safety, parallel agent rules)
- **`docs/AI_POLICY.md`** - AI assists drafting only, never owns canonical state. Chef's irreducible core: creative decisions, physical cooking, relationship moments, final approval on comms.

---

## IMPLEMENTATION PATTERNS, ARCHITECTURE & REFERENCE

Full implementation patterns and architecture reminders are in this imported file:

- @docs/CLAUDE-ARCHITECTURE.md

File locations, workspace map, and environment config are in `docs/CLAUDE-REFERENCE.md` (read it when you need to look up file paths, not auto-loaded to save tokens).
