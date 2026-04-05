# ChefFlow V1 - Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

---

> **🚨 STOP - READ THESE TWO BLOCKS BEFORE DOING ANYTHING 🚨**

> **BLOCK 1 - DO YOUR OWN WORK, TEST YOUR OWN WORK, FIX YOUR OWN BUGS**
>
> **NEVER** tell the developer to "check the website," "verify this works," "let me know if it looks right," or "you may want to test." You have a Playwright browser. You have an agent test account (`.auth/agent.json`). You have screenshots. **USE THEM.** After writing code: sign in, navigate, screenshot, verify. If it's broken: fix it yourself, verify the fix, then report it's done. The developer is NOT your QA team. If you CAN test it, you MUST test it. If you find a bug, you MUST fix it - don't report it back.
>
> **NEVER** wait for the developer to tell you the obvious next step. If you know what comes next, DO IT. If a task has a clear continuation, CONTINUE. Don't pause, don't ask "what would you like me to do next?" - just do the work. The developer is paying per token. Every unnecessary back-and-forth is their money wasted on nothing.
>
> **NEVER** generate padded, hedging, verbose responses when a short one works. Don't add caveats. Don't restate what you're about to do - just do it. Don't offer multiple options when one is clearly correct. Be direct. Be brief. Do the work.
>
> **NEVER** tell the developer to restart something. You have Bash. If the dev server needs restarting, kill the process and start it. If Ollama needs restarting, run `ollama serve`. If a service is down, check why and fix it. The ONLY exception is if you literally cannot do it (e.g., a physical power cycle, or a process owned by a different user). "Please restart the dev server" when you have `bash` access is laziness. Just run the command.

> **BLOCK 2 - READ THIS ENTIRE FILE BEFORE STARTING WORK**
>
> This document contains rules that will prevent you from making expensive mistakes. Every section exists because an agent already made that mistake and it cost real money. Skimming or skipping sections = repeating those mistakes. Read it all. Follow it all.

---

## Quick Reference

- **Product Blueprint:** `docs/product-blueprint.md` is THE finish line. V1 scope, progress bar, exit criteria. Read it. Update it when you complete features.
- **Project Map:** `project-map/` is the browsable product mirror. 20 files in 4 folders (chef-os, consumer-os, public, infrastructure). Update the relevant file when you build or change features.
- **Definition of done:** a feature is only done when it is verified in the real UI, honest about failure, and protected against drift. See `docs/definition-of-done.md`
- **Interface philosophy:** all UI work must comply with `docs/specs/universal-interface-philosophy.md`. Mandatory read for all builder agents before any UI implementation.

- **Stack:** Next.js · PostgreSQL (Drizzle ORM via postgres.js) · Auth.js v5 · Stripe · Local FS storage · SSE realtime
- **Data safety first:** all migrations are additive, all destructive ops require explicit approval
- **End every session:** commit everything → push the feature branch → write a session digest → update this file if new rules were found
- **Cloud AI:** production AI routes through a cloud Ollama-compatible endpoint (OLLAMA_BASE_URL). Gemini is used only for non-PII tasks. Conversation content is never stored server-side.
- **Never:** run `drizzle-kit push` without explicit user approval

---

## PROMPT PIPELINE

The developer sends prompts through a refinement pipeline before they reach Claude Code. Prompts are well-formulated and intentional. Treat them at face value. Never second-guess the developer's intent or assume the prompt means something other than what it says.

### NO EM DASHES (ABSOLUTE RULE - ZERO TOLERANCE)

**Never use em dashes ( -) anywhere. Not in code, not in UI text, not in emails, not in AI responses, not in comments, not in docs that users see. NOWHERE.**

Em dashes are the #1 tell that text was written by AI. Using them destroys credibility instantly. Real people don't write with em dashes. AI does. We are not going to look like AI.

**What to use instead:**

- A comma, period, or semicolon (restructure the sentence)
- Parentheses (for asides)
- A colon (for explanations)
- Two separate sentences
- A hyphen with spaces ( - ) if you absolutely need a break

**Enforcement:**

- Every piece of text Claude generates (UI copy, emails, Remy responses, notifications, error messages) must be em-dash-free
- When editing existing files, replace any em dashes you encounter
- This applies to ALL agent output: Claude Code, Remy, Gustav, any AI in the system

**This is not a style preference. This is a hard rule. Em dashes = instant credibility loss.**

### NO "OpenClaw" IN PUBLIC SURFACES (ABSOLUTE RULE - ZERO TOLERANCE)

**"OpenClaw" is forbidden from all user-facing surfaces.** No user (chef, client, or visitor) should ever see or infer this term. Internal tools stay internal.

**Banned surfaces:**

- UI text, labels, headings, descriptions, tooltips
- Error messages, toast notifications, empty states
- Page titles and metadata
- API responses surfaced to frontend
- localStorage keys (use `cf-` prefix instead)
- Embedded content, emails, Remy responses

**What to use instead:**

- Nothing (preferred; just remove the reference)
- "system", "engine", "platform", "price engine", "data engine" (when a noun is needed)

**What is allowed:**

- Internal variable names, type names, function names, import paths (code-only, never rendered)
- Comments and docstrings (developer-only)
- File names in `lib/openclaw/`, `scripts/openclaw-*`, `.openclaw-deploy/`, `.openclaw-build/`
- Internal docs (`docs/specs/`, `docs/research/`)
- Database schema names (`openclaw.*` tables)
- CLAUDE.md itself

**Enforcement:**

- When writing new UI text, error messages, or user-visible strings: never include "OpenClaw"
- When editing existing files: replace any user-visible "OpenClaw" you encounter
- When adding new features that use data from the engine: present outcomes, not tooling
- This applies to admin pages too (browser tab titles, headings, descriptions)

**This is a product boundary, not a cosmetic change.**

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

## ANTI-LOOP RULE (MANDATORY - READ THIS)

**Agents looping for an hour costs real money and produces nothing. These rules are hard stops.**

### The 3-Strike Rule

If you attempt something and it fails, you get **at most 2 more attempts** (3 total). On the 3rd failure, you **STOP and report to the user.** No exceptions.

This applies to ALL repeated actions, not just builds:

| Loop type              | Example                                                                | What to do after 3 failures                                                  |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Fix-retry**          | Fix a type error → build fails → fix again → fails again               | Stop. Report the error and what you tried. Let the user decide.              |
| **Search loops**       | Can't find a file/function → search different paths → still can't find | Stop. Tell the user what you searched for and ask where it is.               |
| **Permission denied**  | Command blocked → tweak command → blocked again                        | Stop. Ask the user to adjust permissions or tell you an alternative.         |
| **API/network**        | External call fails → retry → fails again                              | Stop. Report the failure. Do not retry network calls more than once.         |
| **Install/dependency** | Package install fails → try different version → fails                  | Stop. Report the error.                                                      |
| **Test failures**      | Fix test → run → new failure → fix → run → new failure                 | Stop. You're chasing your tail. Report all failures and let the user assess. |

### What Counts as a "Strike" (and What Doesn't)

**Strikes = repeating the same approach to the same problem:**

- Fix a type error on line 42 → build → same error → fix line 42 differently → build → same error = 3 strikes, stop
- Run `npm install foo` → fails → run `npm install foo` again = 2 strikes immediately (you know it will fail)
- Try to fix error A → it creates error B → fix B → it re-creates A → you're going in circles = stop

**NOT strikes = genuinely different approaches, forward progress, normal work:**

- Fix error A → build → error A gone but new error B on a different file → fix B → build → error C → fix C = this is **normal forward progress**, keep going
- Try approach X → doesn't work → try completely different approach Y → doesn't work → try approach Z = different strategies, keep going (but if Z also fails, stop and report)
- Reading multiple files to understand a problem = not looping, that's research
- Making 10 edits across 10 files for one feature = not looping, that's implementation

**The test: "Am I making forward progress or am I going in circles?"** If you're seeing the same errors come back, undoing your own fixes, or re-trying commands you know failed - you're looping. If each attempt moves you closer to the goal or reveals new information - you're working.

### What "STOP" Means

1. **Do not make another attempt at the thing that's failing**
2. **Commit whatever work you've done so far** (partial progress is better than lost progress)
3. **Report clearly:** what you were trying to do, what failed, what you tried, and what the error was
4. **Let the user decide** the next step
5. **Continue working on OTHER tasks** if you have them - stopping on one problem doesn't mean stopping everything

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
- **NEVER** run `drizzle-kit push` or apply migrations without explicit user approval.
- **Before every `drizzle-kit push`**, remind the user to run a backup first:

  ```bash
  database db dump --linked > backup-$(date +%Y%m%d).sql
  ```

### Migration Timestamp Collisions (CRITICAL - Multi-Agent Safety)

- **Before creating ANY migration file**, you MUST run `glob database/migrations/*.sql` to see all existing migration files.
- Pick a timestamp that is **strictly higher** than the highest existing one. For example, if the highest is `20260221000002`, your new file must be `20260221000003` or later.
- **NEVER** reuse or guess a timestamp. Always check first.
- This rule exists because multiple Claude Code agents may run concurrently. Without checking, two agents can generate the same timestamp, causing migration collisions that corrupt the schema.

### Server Actions & Queries

- Never write a `.delete()` query on production tables without explicit approval.
- Respect existing immutability triggers - never attempt to circumvent the immutability on `ledger_entries`, `event_transitions`, or `quote_state_transitions`.

---

## ZERO HALLUCINATION RULE (MANDATORY - READ THIS)

**The app must never display information that isn't true.** Every piece of data a user sees must be real, current, and verified - or explicitly marked as unavailable. Silent lies are worse than visible errors.

This rule exists because a February 2026 audit found 25+ places where the app displayed fake, stale, or unverified information to users as if it were real. **This must never happen again.**

### The Three Laws

**Law 1: Never show success without confirmation.**

Every UI update that assumes a server action succeeded MUST have error handling and rollback. No exceptions.

```tsx
// CORRECT  - rollback on failure
const previous = items
setItems(optimisticUpdate)
startTransition(async () => {
  try {
    await serverAction(...)
  } catch (err) {
    setItems(previous) // rollback
    toast.error('Failed to save')
  }
})

// WRONG  - assumes success, never checks
setItems(optimisticUpdate)
startTransition(async () => {
  await serverAction(...) // no try/catch, no rollback
})
```

**This applies to every `startTransition`, every optimistic update, every client-side state change that calls a server action.** If the server can fail, the UI must handle it.

**Law 2: Never hide failure as zero.**

If data fails to load, show an error state - never substitute zeros, empty arrays, or default values that look like real data.

```tsx
// CORRECT  - user sees that data failed to load
if (fetchFailed) return <DataError message="Could not load revenue data" />

// WRONG  - user sees $0.00 and thinks they have no revenue
if (fetchFailed) return { totalRevenueCents: 0, totalExpenseCents: 0 }
```

A chef seeing "$0.00 revenue" when the database is unreachable will make wrong business decisions. A chef seeing "Could not load data" will refresh the page. **Visible errors are always better than invisible lies.**

**Law 3: Never render a non-functional feature as functional.**

If a button doesn't work, a route isn't implemented, or a feature isn't finished - it must be visibly gated, not silently broken.

| Situation                   | Correct                                        | Wrong                                       |
| --------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Backend not built yet       | Hide the button or show "Coming soon" badge    | Render a clickable button that does nothing |
| Action returns fake success | Don't ship it                                  | `return { success: true }` on a no-op       |
| Data source doesn't exist   | Show "N/A" or "Not available"                  | Show `$0.00` or `0`                         |
| Feature is a placeholder    | Remove from nav/UI or gate behind feature flag | Leave a live route with "coming soon" text  |

### What Agents Must Do (Enforcement)

**When writing new code:**

1. Every `startTransition` or optimistic update MUST have a `try/catch` with rollback and user-visible error feedback (toast, inline error, etc.)
2. Every data fetch MUST distinguish between "no data exists" (show empty state) and "fetch failed" (show error state) - these are NOT the same thing
3. Every button MUST do what it says. If the backend isn't ready, don't render the button. If you must render it, disable it with a tooltip explaining why
4. Every displayed number MUST come from a real data source. Never hardcode financial figures, counts, or metrics. Extract prices/rates to a single shared constant at minimum
5. Demo/sample data MUST be visually distinguished from real data everywhere it appears - badges, labels, or filtered out of production views entirely

**When reviewing existing code:**

If you encounter any of these patterns during normal work, **flag them to the developer immediately:**

- A `startTransition` without `try/catch`
- A catch block that returns zero/default values without any UI indicator
- A button with an empty `onClick` or a `// placeholder` comment
- A `return { success: true }` on a function that doesn't actually do anything
- A hardcoded number displayed as if it came from the database
- Demo/sample records with no visual distinction from real data

### Placeholders vs. Hallucinations - Both Require Action

**Hallucination:** The app displays something that is **actively false** - fake success, wrong numbers, fabricated data shown as real. **These must be fixed immediately.**

**Placeholder:** A feature stub, "coming soon" text, a no-op button, or a hardcoded value awaiting real data. **These are not lies, but they must be reported to the developer** so they can decide to ship, hide, or finish them. Never leave a placeholder in the app without the developer knowing it's there.

When you find either during normal work, add it to your session report. Don't wait to be asked.

### Cache Invalidation - Write It, Bust It

**When you mutate data, you MUST invalidate every cache that reads that data.** Stale cache = stale UI = hallucination.

- If a server action writes to the `chefs` table and the layout uses `unstable_cache` with tag `chef-layout-{chefId}`, the action MUST call `revalidateTag('chef-layout-{chefId}')`.
- `revalidatePath` does NOT bust `unstable_cache` tags. You must use `revalidateTag` for tagged caches.
- When adding a new `unstable_cache`, document which mutations should bust it - don't leave it for "later."
- When adding a new mutation on cached data, search for `unstable_cache` and `revalidateTag` in the codebase to find all caches that read the data you're writing. Bust every one.

### Server Action Quality Checklist (Apply to All New Server Actions)

Every new exported `async function` in a `'use server'` file must pass these checks before being committed. Reference: `docs/function-evaluation-surface.md`.

1. **Auth** - Starts with `requireChef()`, `requireClient()`, `requireAdmin()`, or is intentionally public (document why)
2. **Tenant scoping** - Every DB query includes `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.entityId)` as appropriate
3. **Input validation** - Empty/invalid inputs rejected before any DB call (throw or return error, never silently return)
4. **Error propagation** - DB errors throw or return `{ success: false, error }`. Never silently return empty/zero on failure.
5. **Mutation feedback** - Mutations return `{ success, error? }` or the created/updated record. Never `Promise<void>` for mutations.
6. **Idempotency** - State-changing updates use CAS guards (`.eq('status', expectedStatus)`) where double-execution would cause harm
7. **Cache busting** - After mutating data, call `revalidatePath` or `revalidateTag` for every cache that reads the affected data
8. **Non-server-action internals** - Functions called only by other server code (webhooks, workers) go in non-`'use server'` files to prevent direct client invocation

### `@ts-nocheck` Files Must Not Export Callable Actions

Files with `// @ts-nocheck` reference nonexistent tables, use wrong column names, or have unresolved type errors. **They will crash at runtime.** These files must NOT export server actions or functions that other code can import and call.

- If you encounter a `@ts-nocheck` file that exports server actions: either fix the types and remove `@ts-nocheck`, or remove the exports and add a comment explaining why the file is deferred.
- Never create a new file with `@ts-nocheck`. Fix the types or don't write the file.
- When reviewing code, flag any `@ts-nocheck` file that has `export async function` - it's a crash waiting to happen.

### Hallucination Scan - On-Demand Audit

When the developer says **"run hallucination scan"**, **"audit for hallucinations"**, **"check for lies"**, or any variation, run the full Zero Hallucination audit:

1. **Optimistic updates** - search all `startTransition` and `useTransition` calls for missing `try/catch` + rollback
2. **Silent failures** - search for catch blocks that return zero/default/empty without UI feedback
3. **No-op handlers** - search for `onClick` with empty bodies, `// placeholder`, `// TODO`, `return { success: true }` on functions that don't persist
4. **Hardcoded display values** - search for dollar amounts, counts, or metrics that aren't from a query or constant
5. **Stale cache** - check that every `unstable_cache` tag has matching `revalidateTag` calls in all relevant mutations
6. **`@ts-nocheck` exports** - find files with both `@ts-nocheck` and `export` that could crash on call
7. **Demo/sample data visibility** - check that `is_demo` or equivalent flags are consumed by the UI

Report findings in the same format as `docs/zero-hallucination-audit.md`. Update that file with any new findings.

---

## AGGRESSIVE DEFINITION OF DONE

`docs/definition-of-done.md` is the repo-wide quality bar. Agents must follow it by default.

Hard rule: `built` is not `done`.

A feature is not done unless all of the following are true:

- It was verified in the real app after implementation.
- It handles failure honestly instead of faking success or falling back to misleading UI.
- It has automated protection against likely drift points.
- The visible UI, copy, guidance, and progress states match reality exactly.
- It complies with the Universal Interface Philosophy (`docs/specs/universal-interface-philosophy.md`): anti-pattern checklist (Section 11), cognitive load limits (Section 6), five mandatory states (Section 7), and one primary action per screen (Section 5).

Special rule for onboarding, tours, and guided overlays:

- Every configured step must point to a real element that exists on the actual page.
- Missing targets must fail closed for the team, not degrade into fake guidance for the user.
- Visiting a route is not proof that a user completed the step.
- A tour is not done without an automated target-existence check and a full manual walkthrough pass.

If the system can quietly lie, drift, or mark progress complete without proof, it is not done.

---

## SELF-MAINTAINING DOCUMENT

This document must stay current. Claude is responsible for keeping it updated - the developer should never have to ask.

### When to update this file

Update `CLAUDE.md` immediately whenever any of the following happen:

- A pattern or rule gets established during a session (e.g. "always use X", "never do Y")
- The developer has to ask Claude for the same thing more than once - that's a missing rule
- A new architectural decision is made that affects how future agents should behave
- A bug or mistake is traced back to a missing or unclear rule
- A new file location, migration, or system component is added that agents need to know about

**Do not wait to be asked.** If something belongs in this document, add it in the same session it was discovered.

### When to prune this file

**Monthly (or when the file exceeds ~5,000 words):** Review every rule and ask: "Would Claude make this mistake without this instruction?" If Claude already does something correctly on its own, the instruction is noise. Remove it. Every unnecessary line dilutes the ones that matter.

**Alternative:** Run this prompt: "Update my CLAUDE.md to remove anything that's no longer needed, contradictory, duplicate information, or unnecessary bloat impacting effectiveness."

### How to update

1. Edit `CLAUDE.md` directly with the new rule in the appropriate section
2. Also update `MEMORY.md` if the rule belongs in persistent memory. `MEMORY.md` at the repo root is the canonical durable memory file. The `memory/` directory is for project-scoped briefs, runtime notes, and working memory artifacts.
3. Commit both files with a clear message like `docs(rules): add X rule`
4. Push - this is part of the standard session close-out

---

## WORKFLOW SKILLS (Slash Commands)

These workflows are now available as `/slash-commands`. Type the command name to run the full procedure:

- **`/ship`** - git add + commit + push. The full "ship it" chain. No confirmation needed.
- **`/soak`** - Full software aging pipeline (useEffect audit, fixes, soak tests). Full docs: `docs/soak-testing.md`
- **`/close-session`** - Standard session close-out (stage, commit, push, update session log + build state)
- **`/pre-flight`** - Builder pre-flight check (git status, tsc, next build)
- **`/feature-closeout`** - Feature close-out (tsc, build, commit, push)
- **`/hallucination-scan`** - Zero Hallucination audit (optimistic updates, silent failures, stale cache, etc.)

**End every session:** run `/close-session` or `/ship`. Work must be on GitHub before signing off.

---

## FEATURE LOOKUP (How to Find What You're Looking For)

**Three-tier lookup, in order:**

1. **`project-map/`** - Quick orientation. Browse the folder like Google Drive. Each file is a short card describing one product area (routes, files, status, open items). Start here for "what does this area do?"
2. **`docs/product-blueprint.md`** - V1 scope, progress, exit criteria, queue, known issues. Start here for "is this done?" or "what's next?"
3. **`docs/app-complete-audit.md`** - Deep dive. 265 pages mapped with every button, tab, form, modal, and component. Start here for "what exact component renders this?"

When the developer describes a feature by what it does (not by file path), check the project map first, then the audit if you need implementation details.

**Do not guess file paths. Do not search the codebase blindly. Read the docs first.**

**Developer:** you don't need to know file names. Describe what you want in plain English. The agent will look it up. Examples of valid prompts:

- "The widget on the dashboard that shows today's schedule"
- "The page where I manage staff members"
- "The form for creating a new quote"
- "The settings page for email"

---

## SESSION AWARENESS (EVERY AGENT - MANDATORY)

**Every agent (planner, builder, research) must do these things at the start and end of every session. No exceptions.**

This exists because agents operate blind. Without session awareness, an agent has no idea what the last agent did, whether the build is broken, or what files are hot. This causes regressions, wasted work, and collisions.

### On Session Start (Before Doing Anything Else)

1. **Read `docs/product-blueprint.md`** - know the V1 scope, progress, exit criteria, and known issues.
2. **Read the last 3 files in `docs/session-digests/`** - know what previous agents discussed and decided.
3. **Read `docs/build-state.md`** - know whether the app is green or broken right now.
4. **If build state is broken:** STOP. Do not start new work on a broken foundation. Report what's broken and fix it first, or ask the developer for direction.
5. **Log your arrival** - append an entry to `docs/session-log.md`:
   ```
   ## YYYY-MM-DD HH:MM EST
   - Agent: [Planner | Builder | Research | General]
   - Task: [what you're here to do]
   - Status: started
   - Build state on arrival: [green | broken] (commit [hash])
   ```

### On Session End (Before Signing Off)

1. **Log your departure** - append to `docs/session-log.md`:
   ```
   ## YYYY-MM-DD HH:MM EST
   - Agent: [type]
   - Task: [what you did]
   - Status: completed | partial | blocked
   - Files touched: [list every file you modified]
   - Commits: [commit hashes]
   - Build state on departure: [green | broken]
   - Notes: [anything the next agent needs to know]
   ```
2. **Write a session digest** to `docs/session-digests/` (see format in `docs/session-digests/README.md`). Capture: what was discussed, what changed, decisions made, unresolved items, context for next agent.
3. **Update `docs/build-state.md`** if you ran a build or type check.
4. **Update `docs/product-blueprint.md`** if you completed work that affects any feature checkbox or progress percentage.
5. **Update the relevant `project-map/` file** if you built, changed, or broke something in that area.
6. **Commit the session log, digest, and doc updates** with your other commits.

---

## AGENT GATES (Skills - Loaded On Demand)

Full gate procedures are available as skills. They load automatically when relevant, or invoke directly:

- **`/planner`** - Full Planner Gate: context loading, deep inspection, developer notes capture, spec validation with cited evidence. Use when writing or reviewing specs.
- **`/builder`** - Full Builder Gate: queue selection, pre-flight checks, spike, continuous verification, final proof, completion rules. Use when implementing features.
- **`/research`** - Full Research Gate: investigation rules, report format, citation requirements. Use when producing research reports.

**Key rule across all gates:** Every claim must cite file paths and line numbers. No citation = not verified.

---

## DEVELOPMENT WORKFLOW

### Before Making Changes

- **Explain what you're about to do in plain terms** before making changes, especially for anything touching the database, authentication, or financial logic.
- When in doubt, **ask - don't assume**.

### Documentation

- **Always create a follow-up `.md` document for every code change.** Every implementation should have a reflecting document that explains what changed, why, and how it connects to the system. No code-only changes.

### Commit Message Convention

All commits tied to a spec must reference the spec name in the commit message:

```
feat(spec-name): description
fix(spec-name): description
```

This creates traceability from git history back to the spec that drove the work. For non-spec work, use standard prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`.

### Living App Audit - `docs/app-complete-audit.md` (MANDATORY)

This file is the **master registry of every page, button, tab, form, modal, overlay, and navigation path** in ChefFlow. It must always reflect the current state of the app.

**When to update it:**

- You **add a new page** → add its entry (route, what it shows, every button/form/tab on it)
- You **add or remove a button, tab, link, modal, or form field** on any page → update that page's section
- You **rename or move a page** → update the route and any cross-references
- You **add a new feature** (panel, widget, overlay, AI feature) → document it under the relevant page
- You **delete or disable a feature** → remove or mark it in the audit

**How to update it:**

- Find the relevant section by page name
- Add/edit/remove the specific element - keep the same format as surrounding entries
- If adding a whole new page, add it under the correct section heading with the same structure (route, what's displayed, buttons, forms, tabs, modals, navigation)

**When NOT to update it:**

- Pure backend changes (new server action, migration, refactored logic) that don't change what the user sees or clicks - skip it
- Styling-only changes (color, font, spacing) - skip it

**This rule exists because:** a full re-audit of ~265 pages takes an entire session and costs real money. Keeping this file current incrementally is free. The developer relies on this as their "ultimate manual" for understanding what the app does.

### Git Workflow

- **ALWAYS `git push` to GitHub at the end of every session.** This is the off-machine backup. Do not wait to be asked.
- Pushing to `main` is fine. Commit directly to `main` unless the developer asks for a feature branch.

### Feature Close-Out (run when user asks to close out a feature)

Run these in order - stop and report any failure before continuing:

1. `npx tsc --noEmit --skipLibCheck` → must exit 0
2. `npx next build --no-lint` → must exit 0
3. `git add` relevant files + `git commit` with a clear message
4. `git push origin <current-branch>` - push the feature branch to GitHub (backup, $0 cost)
5. Confirm branch is clean and ready - do **NOT** merge to `main` or deploy to production

### Health Checks (run before merging to main)

- `npx tsc --noEmit --skipLibCheck` → must exit 0, zero errors
- `npx next build --no-lint` → must exit 0
- **Experiential verification** (if any auth, layout, loading, or navigation changes):
  - `npm run test:experiential` → all 9 suites must pass
  - Catches blank screens, missing loading states, broken cross-boundary transitions
  - Full docs: `docs/experiential-verification.md`
- **Stress test AI queue** (if any AI/queue changes):
  - `npm run test:stress:ollama` - basic load → must show PRODUCTION READY
  - `npm run test:stress:ollama:high` - high load → must show PRODUCTION READY
  - `npm run test:stress:ollama:failure` - failure recovery → must show PRODUCTION READY
  - Full docs: `docs/ollama-stress-testing.md`
- All work committed and pushed to the feature branch on GitHub
- `types/database.ts` current with remote schema
- Only after all of the above: merge to `main` with explicit user approval

### Agent Testing Account - Details (see BLOCK 2 above for the mandate)

There are **two admin accounts**:

1. **Developer's account** - theirs, for their own use. Don't touch it.
2. **Agent account** - YOURS. Use it every time you need to see, test, or verify anything in the app.

- **Credentials:** Read from `.auth/agent.json` (or `.env.local`: `AGENT_EMAIL` / `AGENT_PASSWORD`)
- **Sign in:** `POST http://localhost:3100/api/e2e/auth` with `{ "email", "password" }` from the credentials
- **Access:** Chef role + admin access (full app)
- **Setup:** If `.auth/agent.json` doesn't exist, run `npm run agent:setup` first

**The full loop - test AND fix:**

1. Ensure dev server is running on port 3100 (ask the user to start it if needed)
2. Launch Playwright, sign in with your agent credentials
3. Navigate to the relevant page, interact, take screenshots
4. If something is broken - **fix it right now.** You have the code and the browser. Close the loop.
5. After fixing, sign in again and verify the fix actually works
6. Only report back when it's DONE and WORKING

**Never say any of these:**

- "Please verify X on the website" - YOU verify it
- "Can you check if this looks correct?" - YOU check it
- "Let me know if the fix works" - YOU test if it works
- "You may want to test..." - YOU test it

**The only exception:** Playwright literally cannot do it (OAuth popups, mobile-specific gestures, native device features). Everything else - you handle it end to end.

### Full Workflow Reference

**`docs/AGENT-WORKFLOW.md`** - complete step-by-step playbook: health checks, migration safety, parallel agent rules, merge procedure. Covers what to do before, during, and after every session. Read it before starting significant work.

**`docs/AI_POLICY.md`** - governs all AI feature work. AI assists drafting only, never owns canonical state. Hard restrictions: no lifecycle transitions, no ledger writes, no silent automation. All AI output requires chef confirmation before becoming canonical.

**Chef's irreducible core:** creative decisions, physical cooking, relationship moments, final approval on all client-facing comms.

---

## IMPLEMENTATION PATTERNS, ARCHITECTURE & REFERENCE

Full implementation patterns, architecture reminders, file locations, workspace map, environment config, and database setup are in these imported files:

- @docs/CLAUDE-ARCHITECTURE.md
- @docs/CLAUDE-REFERENCE.md

These files are loaded on demand when Claude works with relevant code. They contain all the detailed tables and patterns that were previously inline here.
