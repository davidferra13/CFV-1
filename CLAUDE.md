# ChefFlow V1 - Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

---

> **CORE MANDATES**
>
> 1. **Test your own work.** Playwright + agent account (`.auth/agent.json`). After writing code: sign in, navigate, screenshot, verify. If broken, fix it.
> 2. **Keep moving.** If you know the next step, do it. No unnecessary back-and-forth.
> 3. **Be terse.** No caveats, no restating, no multiple options when one is right.
> 4. **Start dead things, don't kill live things.** Dead server? Start it. Running server? Don't kill it.
> 5. **FIX IT, DON'T REPORT IT.** Broken/dirty/unhealthy = fix it silently. Never report without fixing.
> 6. **Act, don't ask.** If you can determine the answer from context, code, memory, or prior conversations, act. Only ask about irreversible actions, ambiguous product decisions, or unspecified scope.

---

## MODEL STRATEGY (4-Tier System)

| Tier         | Model         | Agent/Tool        | Cost      | Purpose                                              |
| ------------ | ------------- | ----------------- | --------- | ---------------------------------------------------- |
| **Local**    | Gemma 4 (e4b) | `ollama-delegate` | $0        | Mechanical bulk work. Drafts, boilerplate, summaries |
| **Worker**   | Haiku 4.5     | `haiku-worker`    | Cheap     | Judgment-light Claude agent tasks                    |
| **Executor** | Opus 4.6      | (main session)    | Standard  | All normal work. Default                             |
| **Advisor**  | Opus 4.6      | `opus-advisor`    | Expensive | Hard decisions only                                  |

### SONNET BAN (ABSOLUTE)

**EVERY `Agent` tool call MUST include `model: "haiku"` or `model: "opus"`.** Omitting it defaults to Sonnet, which drains a separate token bucket. Prefer direct Grep/Glob/Read over spawning agents.

### LOCAL DELEGATION

Before Haiku, consider `ollama-delegate` MCP tools ($0). Delegate mechanical work (drafts, boilerplate, summaries, reformatting). Don't delegate multi-file reasoning, architecture, debugging, or security-sensitive code.

---

## Quick Reference

- **Product Blueprint:** `docs/product-blueprint.md` (V1 scope, progress, exit criteria)
- **Project Map:** `project-map/` (browsable product mirror, update when building)
- **Definition of done:** `docs/definition-of-done.md`
- **Interface philosophy:** `docs/specs/universal-interface-philosophy.md` (mandatory for UI work)
- **Surface grammar:** `docs/specs/surface-grammar-governance.md` (declare mode before layout)
- **Stack:** Next.js, PostgreSQL (Drizzle/postgres.js), Auth.js v5, Stripe, Local FS, SSE
- **Cloud AI:** single Ollama-compatible endpoint (Gemma 4). No second provider.

---

## PROMPT PIPELINE

The developer is a chef, not an engineer. He describes what he wants in business/product language ("I want to copy an old dinner and start fresh"), not engineering terms ("build a server action in lib/chef"). Claude translates intent into technical implementation. Never ask for file paths, component names, or technical clarification. Figure it out.

### NO EM DASHES (ABSOLUTE, HOOK-ENFORCED)

Never use em dashes. Use commas, semicolons, parentheses, colons, or separate sentences. `compliance-guard.sh` hook checks every Edit/Write automatically.

### NO "OpenClaw" IN PUBLIC SURFACES (ABSOLUTE, HOOK-ENFORCED)

Forbidden in UI, errors, emails, localStorage, metadata. Use "system" or "engine". Allowed in internal code, docs, DB schema, file paths. `compliance-guard.sh` hook checks automatically.

---

## ANTI-LOOP RULE (MANDATORY)

**3-Strike Rule:** Same approach fails 3 times = STOP. Commit partial progress, report, let user decide. Forward progress (error A fixed, new error B) is not a strike.

---

## DATA SAFETY (HIGHEST PRIORITY)

Live production app with real client data. Data loss is unacceptable.

### Database Migrations

- **NEVER** `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE` without warning, explaining data loss, and getting approval
- **NEVER** modify column types or rename columns without explaining risk and getting approval
- All migrations **additive by default**. Explain in plain English before writing. Show full SQL.
- Glob `database/migrations/*.sql` for timestamp; pick strictly higher than highest existing
- **NEVER** run `drizzle-kit push` without explicit approval
- Remind user to back up before applying migrations

### Server Actions & Queries

- Never `.delete()` on production tables without approval
- Respect immutability on `ledger_entries`, `event_transitions`, `quote_state_transitions`

---

## ZERO HALLUCINATION RULE (MANDATORY)

1. **Never show success without confirmation.** `startTransition`/optimistic updates MUST have `try/catch` with rollback + toast on failure.
2. **Never hide failure as zero.** Failed loads show error states, not `$0.00` or empty arrays.
3. **Never render non-functional features as functional.** No no-op buttons, no `return { success: true }` on no-ops.

### Cache Invalidation

`revalidatePath` does NOT bust `unstable_cache` tags; use `revalidateTag`. Search for all related caches when mutating.

### Server Action Quality Checklist

Every `'use server'` export: (1) auth gate, (2) tenant scoping, (3) input validation, (4) error propagation, (5) mutation feedback, (6) idempotency guards, (7) cache busting, (8) internal-only functions in non-`'use server'` files.

### `@ts-nocheck` = No Exports

Never create `@ts-nocheck` files. Existing ones must not export callable functions.

---

## SKILLS ARE REFLEXES (HOOK-ASSISTED)

Skills auto-fire on context triggers. Three are now hook-enforced (can't be skipped):

- **Context-load** on session start (`context-load-guard.sh`)
- **Compliance check** after every Edit/Write (`compliance-guard.sh`)
- **Review reminder** before git commit (`commit-guard.sh`)

All other skill triggers, autonomous behaviors, and the full skill catalog: `@docs/CLAUDE-SKILLS-REFERENCE.md`

**Skill creation:** If a multi-step workflow repeats 3+ times, create a skill via `/write-a-skill`. Invoke immediately, mention to user.

---

## CODE ORGANIZATION (HOOK-ENFORCED)

`module-guard.sh` fires on every Write. Source files must live in: `app/`, `lib/`, `components/`, `types/`, `database/`, `middleware.ts`, `scripts/`, `tests/`. New lib code in `lib/{domain}/`, components in `components/{domain}/`. Never create loose `.ts` files at project root.

---

## SESSION AWARENESS (HOOK-ENFORCED)

`context-load-guard.sh` fires on first tool call of every session. Claude loads context silently:

1. `bash scripts/session-briefing.sh` then read `docs/.session-briefing.md`
2. Last 3 session digests from `docs/session-digests/`
3. `docs/build-state.md`
4. `memory/project_current_priorities.md`
5. `git log --oneline -10` + `git status --short`
6. Last entry in `docs/session-log.md`
7. MemPalace search if available
8. Check MEMORY.md for relevant memories

If build is broken: flag it, fix it. If uncommitted work exists: don't clobber it. Greeting/open-ended first message: invoke `/morning`.

### On End

Run `/close-session`. Commit + push. Work must be on GitHub before signing off.

---

## DEVELOPMENT WORKFLOW

### TDD-First (Default Build Method)

**All feature work and bug fixes use Test-Driven Development by default.** Write the test first (RED), implement minimum to pass (GREEN), refactor (REFACTOR). Small steps only. This is not optional for new features.

**Why:** AI outrunning its feedback loops produces entropy. TDD forces small, verified steps. Good codebases are testable codebases. Test at module interfaces, not implementation details.

**Skip TDD only for:** pure layout/styling changes, config edits, documentation updates.

### Ubiquitous Language (CONTEXT.md)

**`CONTEXT.md` is the canonical domain glossary.** Every domain term has exactly one meaning. Use these terms in code, specs, conversations, and AI prompts. If a term isn't in the glossary, define it there before using it. Updated during `/grill-with-docs` sessions.

### Living Documents

- **`docs/USER_MANUAL.md`** - update when UI/workflow/behavior changes
- **`docs/app-complete-audit.md`** - update when adding/removing/renaming UI elements

### Commits & Git

- Conventional commits: `feat`, `fix`, `docs`, `chore`, `refactor`
- Push to GitHub at session end. Commit to `main` unless told otherwise.

### Health Checks

- `npx tsc --noEmit --skipLibCheck` + `npx next build --no-lint` must exit 0
- Auth/layout changes: `npm run test:experiential`
- AI/queue changes: `npm run test:stress:ollama`

### Agent Testing

Credentials in `.auth/agent.json`. Sign in via `POST http://localhost:3100/api/e2e/auth`. Full loop: test, find bugs, fix bugs, verify fixes.

---

## ARCHITECTURE & PATTERNS

Full implementation patterns and architecture: `@docs/CLAUDE-ARCHITECTURE.md`
File locations and environment config: `docs/CLAUDE-REFERENCE.md` (read when needed)
Skills, triggers, power tools, brand names: `@docs/CLAUDE-SKILLS-REFERENCE.md`

## graphify

Knowledge graph at `graphify-out/`. Read `GRAPH_REPORT.md` before architecture questions. Run `graphify update .` after modifying code files.

---

## SELF-MAINTAINING DOCUMENT

Keep this file current. Add rules when patterns establish or mistakes repeat. Prune rules Claude follows naturally. Target: under 300 lines. Reference tables go in `docs/CLAUDE-SKILLS-REFERENCE.md` or `docs/CLAUDE-REFERENCE.md`.
