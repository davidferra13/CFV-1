# ChefFlow V1 - Project Rules

@docs/autonomous-delivery-contract.md
@AGENTS.md

This file is read by Claude Code at the start of every conversation. ChefFlow-specific rules here and in `AGENTS.md` override generic user-level default-stack assumptions. These rules are mandatory.

---

> **CORE MANDATES**
>
> 1. **Test your own work.** Playwright + agent account (`.auth/agent.json`). After writing code: sign in, navigate, screenshot, verify. If broken, fix it.
> 2. **Keep moving.** If you know the next step, do it. No unnecessary back-and-forth.
> 3. **Be terse.** No caveats, no restating, no multiple options when one is right.
> 4. **Use the canonical app server.** Reuse `http://localhost:3100` for ChefFlow app work. If it is stale or broken, restart it. Do not start duplicate app servers on random ports.
> 5. **FIX WITHIN SCOPE, THEN REPORT CLEARLY.** Repair normal defects that are inside the authorized task, verify the repair, and state what changed. Read-only/diagnostic requests stay read-only, and genuine external or owner-only blockers are reported precisely.
> 6. **Act, don't ask.** If you can determine the answer from context, code, memory, or prior conversations, act. Only ask about irreversible actions, ambiguous product decisions, or unspecified scope.
> 7. **DELEGATE IN ONE ORDER.** Use Codex first for clear spec-following implementation. Use `chefflow-builder` when ChefFlow-specific project context matters, `haiku-worker` only for mechanical low-judgment work, and `opus-advisor` only for hard strategic decisions. The main session may implement tiny fixes (< 20 lines) or debugging that requires conversation context. Parallelize only non-overlapping work.
> 8. **SHIP THE RESULT.** An explicit build, fix, implement, proceed, do it, keep building, or ship request includes verification, a task-scoped commit, push, production deployment for website/runtime work, and live verification. The build queue tracks the work; it does not pause it. When the shared approval broker is present, consequential pushes/deploys/merges must route through it and may not bypass its authority; existing standing authorization should be reused so the user is not asked twice.

---

## MODEL STRATEGY (4-Tier System)

| Tier         | Model         | Agent/Tool        | Cost      | Purpose                                              |
| ------------ | ------------- | ----------------- | --------- | ---------------------------------------------------- |
| **Local**    | Gemma 4 (e4b) | `ollama-delegate` | $0        | Mechanical bulk work. Drafts, boilerplate, summaries |
| **Codex**    | Codex CLI     | `codex exec`      | Flat-rate | Spec-following builds, tests, UI, single-concern     |
| **Worker**   | Haiku (`haiku`) | `haiku-worker`    | Low       | Judgment-light Claude agent tasks                    |
| **Executor** | Opus (`opus`) | (main session)    | Included/quota | Normal high-judgment Claude work                 |
| **Advisor**  | Opus (`opus`) | `opus-advisor`    | Premium reasoning | Hard decisions only                          |

### MODEL SELECTION

Agent tool calls can use `model: "haiku"` (cheap/mechanical), `model: "sonnet"` (balanced), or `model: "opus"` (complex). **Default bias: Codex first** for any spec-following work. Only escalate to Haiku/Opus agents when judgment needed. Prefer direct Grep/Glob/Read over spawning agents for simple lookups.

### CODEX DISPATCH (PRIMARY BUILD TIER)

Codex handles bulk of build work. Invoke via `/dispatch` skill or directly:

- `codex exec "Read [spec-path] and execute it. [constraints]"`
- One task per invocation (git isolation)
- Always reference spec file, scope constraints, and done-when criteria
- Sequential dispatch (Codex handles one at a time)
- Codex-safe: single-concern, spec-following, tests, UI polish, migrations, mechanical wiring
- Opus-only: multi-system integration, security, architecture, debugging without repro steps

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

**3-Strike Strategy Switch:** If the same approach fails 3 times, stop repeating that approach, preserve the evidence, and switch strategy or isolate the failing layer. Continue toward verified closure unless there is a genuine owner-only or external blocker. Forward progress (error A fixed, new error B) is not a strike.

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

Three behaviors are hook-enforced:

- **Context-load** on the first tool call (`context-load-guard.sh`)
- **Compliance check** after every Edit/Write (`compliance-guard.sh`)
- **Review reminder** before git commit (`commit-guard.sh`)

**Wiring audit is a required closeout gate, not a hook.** Run `/wiring-audit` after builds when relevant; the native regression firewall also runs its wiring checks.

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
4. `memory/project_current_priorities.md` if it exists
5. `git log --oneline -10` + `git status --short`
6. Last entry in `docs/session-log.md`
7. MemPalace search if available
8. Check MEMORY.md for relevant memories

If build is broken: flag it, fix it. If uncommitted work exists: don't clobber it. Greeting/open-ended first message: invoke `/morning`.

### On End

Run `/close-session`, then complete the autonomous delivery contract. Every completed task must be committed and pushed immediately; website/runtime work must also be deployed and verified live before signing off. Do not wait for the session to end and do not ask for a separate shipping prompt.

---

## DEVELOPMENT WORKFLOW

### TDD-First (Default Build Method)

**All feature work and bug fixes use Test-Driven Development by default.** Write the test first (RED), implement minimum to pass (GREEN), refactor (REFACTOR). Small steps only. This is not optional for new features.

**Why:** AI outrunning its feedback loops produces entropy. TDD forces small, verified steps. Good codebases are testable codebases. Test at module interfaces, not implementation details.

**Skip TDD only for:** pure layout/styling changes, config edits, documentation updates.

### Continuous Verification Loop (MANDATORY)

**Every feature built has a verified test. Every passing test is permanent proof. The system never regresses silently.** Full spec: `docs/specs/continuous-verification-loop.md`

**The loop:** Build it -> Test it -> Passes? -> Mark VERIFIED in blueprint -> Run affected suite -> All green? -> Commit. Failures block progress until fixed.

**Verification states** (used in `docs/test-coverage-blueprint.md`):

- **VERIFIED** = test exists, passes, covers the feature. Done. No retest needed.
- **NEEDS-TEST** = feature exists without a test. Write one before moving on.
- **REGRESSED** = test exists but fails. P0 fix. Blocks all other work.
- **EXEMPT** = pure layout/config, no testable logic. Document why.

**Rules:**

1. New feature = new blueprint entry. Cannot be marked done without VERIFIED status.
2. Never retest what already passes (deterministic tests are permanent proof).
3. Code change to verified feature = re-run its test. Still green? Still VERIFIED.
4. Test failure = REGRESSED. Fix before building anything else.
5. Run focused tests for the owned change, then `npm run regression:firewall` before completion. Failures block the commit/release path.

### Ubiquitous Language (CONTEXT.md)

**`CONTEXT.md` is the canonical domain glossary.** Every domain term has exactly one meaning. Use these terms in code, specs, conversations, and AI prompts. If a term isn't in the glossary, define it there before using it. Updated during `/grill-with-docs` sessions.

### Living Documents

- **`docs/USER_MANUAL.md`** - update when UI/workflow/behavior changes
- **`docs/app-complete-audit.md`** - update when adding/removing/renaming UI elements
- **`docs/test-coverage-blueprint.md`** - update when adding routes/features/tests

### Page X-Ray Pre-Read (MANDATORY)

**Before modifying any route's `page.tsx`, check `docs/xrays/pages/{route-slug}.md` for developer notes and open findings.** If a scan exists, respect its guidance. If no scan exists, note the gap. X-Ray data compounds; ignoring it wastes prior intelligence.

### Post-Build Wire Audit (MANDATORY)

**After every build, run `/wiring-audit` before calling the work done.** This is the umbrella closeout gate for Page X-Ray, Dinner Circles, Universal Rail Intelligence, Priority Queue, Commitment UI, Menu Intelligence, PIE, Client Intelligence, communications, lifecycle, ledger, navigation, Remy, automation, and CIL wiring.

**Native closeout command:** run `npm run regression:firewall` before claiming any code build is done. It runs chef nav audit, wiring audit with a zero weak/orphan route contract, app typecheck, canonical runtime verification, and affected-route probes from `scripts/wiring-audit-results.json`. Use `npm run regression:firewall:full` when slow Sentinel regression proof is required. `build-queue.mjs finish-check` runs this firewall by default.

Required closeout:

1. Run `npm run regression:firewall`.
2. Use `post_build_domain_matrix` to identify the most relevant integration domains for the files that changed.
3. Run `/page-xray` on every affected route from the matrix, using `--delta` for existing pages and `--quick` for new pages.
4. For every high or medium relevance domain, either wire it, prove it is already wired, queue a follow-up, or record a clear N/A reason.
5. Do not mark a build done while a live route, server action, component, Rail profile, Circle hook, Priority Queue action, commitment state, menu/PIE/client intelligence path, notification, lifecycle transition, ledger path, or command/nav entry is obviously missing.
6. Run `/crucible`. Grade B required to mark done. If below B after Crucible's fix pass, address remaining gaps before closeout.

### Test Coverage Blueprint Contract

**`docs/test-coverage-blueprint.md` tracks what is tested and what is not.** Both Claude and Codex maintain it.

- **After building a feature:** Add its test status (UNTESTED, PARTIAL, COVERED)
- **Before testing:** Check the blueprint. Never re-test what already passes.
- **End of session:** Run `/test-scan` to reconcile routes vs. tests
- **Critical gaps** in the blueprint are P0 work targets for test authors

### Commits, Push, And Production Delivery

- Conventional commits: `feat`, `fix`, `docs`, `chore`, `refactor`.
- Stage only task-owned files; preserve unrelated dirty work.
- Commit and push each completed, verified task immediately. Do not wait until session end.
- Commit to `main` when the checkout and repository policy permit it; otherwise complete the repository's branch/merge path without leaving verified work stranded.
- Website/runtime changes deploy to the established production target by default, then verify the public domain and deployed revision.
- Documentation-only or non-runtime tooling changes still commit and push, but do not restart production solely to publish inert files.
- A local build, unpushed commit, successful deploy command without live proof, or preview URL is not done.

### Health Checks

- `npx tsc --noEmit --skipLibCheck` + `npx next build --no-lint` must exit 0
- Auth/layout changes: `npm run test:experiential`
- AI/queue changes: `npm run test:stress:ollama`

### Agent Testing

Credentials in `.auth/agent.json`. Sign in via `POST http://localhost:3100/api/e2e/auth`. Full loop: test, find bugs, fix bugs, verify fixes.

### Canonical Dev Server

- ChefFlow app work uses `http://localhost:3100` from `npm run dev`.
- Before starting a server, check whether `3100` is already serving this checkout.
- If `3100` is running, reuse it. Do not start another ChefFlow app server on `3116`, `3135`, `3201`, or any other ad hoc port.
- If `3100` is unhealthy, restart the canonical server instead of creating a second server.
- Alternate ChefFlow app ports require explicit test isolation or an approved separate worktree. State the reason, port, checkout path, and cleanup plan.
- Stop temporary test servers after verification unless the user asks to keep them running.
- Do not touch unrelated external project servers such as the Wix rebuild unless explicitly asked.
- Mission Control, Persona inbox, sync daemons, Playwright MCP, Ollama, and cloudflared are tools, not duplicate app builds. Do not stop them unless the task is specifically about those tools.
- Closeout must name the exact URL verified. Normal app closeout should verify `http://localhost:3100`.

---

## BUILD QUEUE CONTRACT (SHARED WITH CODEX)

**`.agents/build-queue/` is the single source of truth for tracked build work.** Use `node .agents/skills/build-queue/scripts/build-queue.mjs <command>` to inspect or mutate it. `docs/UNIFIED-BUILD-QUEUE.md` is historical and must not receive new queue state.

- **Before building:** run `status`, inspect `active`, `in-flight`, and `blocked`, then check duplicates/overlap.
- **Claiming work:** use the queue CLI (`fire`/preflight flow) so run IDs, ownership, and movement are recorded.
- **After building:** use proof-pack/finish-check and move items through the CLI only after acceptance evidence passes.
- **New work discovered:** use `add`; do not append ad hoc rows to legacy markdown.
- **Blocked/cancelled work:** use `block` or `cancel` with the exact reason.
- **Never rebuild the queue from scratch.** Preserve `.agents/build-queue/events.jsonl` and item history.

---

## ARCHITECTURE & PATTERNS

Full implementation patterns and architecture: `@docs/CLAUDE-ARCHITECTURE.md`
Domain map (265 lib/ domains, categorized): `docs/CLAUDE-DOMAINS.md` (read when placing new code)
Workflow domains (chef daily ops mapped to skills): `docs/CLAUDE-WORKFLOWS.md` (read when task matches a workflow)
File locations and environment config: `docs/CLAUDE-REFERENCE.md` (read when needed)
Skills, triggers, power tools, brand names: `@docs/CLAUDE-SKILLS-REFERENCE.md`

## graphify

If `graphify-out/GRAPH_REPORT.md` exists, read it before architecture questions. Run `graphify update .` only when Graphify is installed and the graph is part of the current task; do not treat missing graph output as a blocker.

---

## SELF-MAINTAINING DOCUMENT

Keep this file current. Add rules when patterns establish or mistakes repeat. Prune rules Claude follows naturally. Target: under 300 lines. Reference tables go in `docs/CLAUDE-SKILLS-REFERENCE.md` or `docs/CLAUDE-REFERENCE.md`.
