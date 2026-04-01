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

- **Definition of done:** a feature is only done when it is verified in the real UI, honest about failure, and protected against drift. See `docs/definition-of-done.md`

- **Stack:** Next.js · PostgreSQL (Drizzle ORM via postgres.js) · Auth.js v5 · Stripe · Local FS storage · SSE realtime
- **Data safety first:** all migrations are additive, all destructive ops require explicit approval
- **End every session:** commit everything → push the feature branch → update this file if new rules were found
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

### How to update

1. Edit `CLAUDE.md` directly with the new rule in the appropriate section
2. Also update `memory/MEMORY.md` if the rule belongs in persistent memory
3. Commit both files with a clear message like `docs(rules): add X rule`
4. Push - this is part of the standard session close-out

---

## "SHIP IT" - THE ONE COMMAND (READ THIS)

When the developer says **"ship it"** (or any variation: "ship", "send it", "push everything", "make it live"), do ALL of the following - no confirmation needed, no questions asked:

1. **`git add`** all modified and created files
2. **`git commit`** with a clear, descriptive message
3. **`git push origin <current-branch>`** to GitHub ($0)
4. **Report** what was committed and pushed

The developer should never have to ask for these steps separately. "Ship it" = the full chain, every time.

---

## "RUN SOAK" - SOFTWARE AGING PIPELINE

When the developer says **"run soak"** (or any variation: "soak test", "soak it", "run the soak tests", "check for leaks"), do ALL of the following:

1. **useEffect cleanup audit** - scan all components for missing cleanup returns, leaked event listeners, unclosed PostgreSQL subscriptions, intervals/timeouts without `clearTimeout`/`clearInterval`
2. **Fix every issue** the audit finds
3. **Run `npm run test:soak:quick`** (dev server must be on port 3100 - ask user to start it if needed)
4. **If any test fails** - read the report, diagnose the root cause, fix it, and re-run until all 3 soak tests pass
5. **Commit everything** when done

**What the soak tests measure:** JS heap memory, DOM node count, console errors, and cycle time across 100+ repeated navigation loops. Uses Chrome DevTools Protocol (CDP) for precise measurements. Fails if memory > 3× baseline, DOM nodes > 2× baseline, any console errors, or cycle time > 2× baseline.

**Full docs:** `docs/soak-testing.md`

---

## STANDARD SESSION CLOSE-OUT (run at the end of every session)

These steps run automatically at the end of every session, whether or not the developer asks. No exceptions.

1. **Stage all changes** - `git add` every file that was modified or created
2. **Commit** - clear, descriptive commit message
3. **Push the current branch** - `git push origin <current-branch>` (GitHub backup, $0)
4. **Update this file** - if any new patterns, rules, or decisions were made this session, add them now
5. **Report** - tell the developer what was committed and pushed

**What this prevents:** Work existing only on the local machine. If the machine is wiped, stolen, or corrupted, everything on GitHub is safe.

---

## FEATURE LOOKUP (How to Find What You're Looking For)

When the developer describes a feature, page, or UI element by what it does (not by file path), your FIRST step is to look it up in `docs/app-complete-audit.md`. This is the master registry of every page, route, button, tab, form, modal, and component in the app. It maps plain-English descriptions to exact routes, components, and file paths.

**Do not guess file paths. Do not search the codebase blindly. Read the audit first.**

1. Open `docs/app-complete-audit.md` and search for keywords from the developer's description
2. Find the matching section (it's organized by feature area: Dashboard, Events, Clients, etc.)
3. Get the route, component name, and related files from that section
4. Now you know exactly what you're working with

If the audit doesn't cover it, then search the codebase. But the audit covers ~265 pages and should be your first stop.

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

1. **Read `docs/session-log.md`** - read the last 5 entries. Know what just happened.
2. **Read `docs/build-state.md`** - know whether the app is green or broken right now.
3. **If build state is broken:** STOP. Do not start new work on a broken foundation. Report what's broken and fix it first, or ask the developer for direction.
4. **Log your arrival** - append an entry to `docs/session-log.md`:
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
2. **Update `docs/build-state.md`** if you ran a build or type check.
3. **Commit the session log update** with your other commits.

---

## PLANNER GATE (Spec Agents - MANDATORY)

**Every spec agent must pass this gate before a spec is marked "ready." No exceptions.**

This gate exists because agents hallucinate specs. They skim 3 files, make assumptions about the rest, and write confident-sounding plans that break during implementation. This gate forces evidence-based planning.

**Canonical prompts live in `docs/specs/README.md`.**

### Step 1: Load Context

1. **Read `CLAUDE.md`** (this file) cover to cover.
2. **Read `docs/specs/_TEMPLATE.md`** for the required spec format.
3. **Read `docs/session-log.md`** (last 5 entries) and `docs/build-state.md`.
4. **Look up affected pages in `docs/app-complete-audit.md`** so you know what you're touching.

### Step 2: Deep Inspection

1. **Scope the inspection** - read every file in the directories this feature touches. Follow import chains 2 levels deep from the entry point. Read the schema for every table this feature queries. Do NOT claim you "inspected the codebase" after reading 3 files.
2. **Produce a current-state summary** - before writing the spec, output a plain-English summary of what exists today in the areas this feature touches. Include file paths, current behavior, and data flow. **This summary is for the developer to review.** If they spot errors, the spec hasn't been started yet, so nothing is wasted. This is the single highest-ROI human checkpoint.

### Step 3: Capture Developer Notes (CRITICAL)

**The developer's conversation IS the spec's origin. Preserve it.**

During the conversation with the developer, you MUST capture their words and intent into the spec's `## Developer Notes` section. This is not optional. The developer is often working in voice-to-text mode, pouring out high-signal context that will be lost forever if you don't capture it.

Capture two things:

1. **Raw Signal** - the developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why."
2. **Developer Intent** - translate their words into clear system-level requirements, constraints, and behaviors. What were they actually trying to achieve beneath what they said?

A spec without Developer Notes is incomplete. A builder reading a spec without Developer Notes is building blind.

### Step 4: Write the Spec

Use `docs/specs/_TEMPLATE.md`. Fill in every section. The spec must include:

- **Timeline table** with creation timestamp
- **Developer Notes** section (from Step 3)
- All technical sections per the template

### Step 5: Spec Validation (Evidence Required)

Answer every item below. **Each answer must cite specific file paths and line numbers you read.** If you cannot cite a file, you did not verify it.

1. **What exists today that this touches?** Files, routes, schemas, components, server actions. Cite line numbers.
2. **What exactly changes?** Add / modify / remove at the file + data level. Be surgical.
3. **What assumptions are you making?** For each: verified (you read the code) or unverified (you're guessing)? If unverified, verify it now or flag it.
4. **Where will this most likely break?** Top 2-3 failure points with reasoning.
5. **What is underspecified?** What could cause a builder to guess? Eliminate it or flag it.
6. **What dependencies or prerequisites exist?** Migrations, other specs, config changes.
7. **What existing logic could this conflict with?** Shared components, shared server actions, shared DB tables.
8. **What is the end-to-end data flow?** User action -> server action -> DB write -> UI update. No gaps.
9. **What is the correct implementation order?** Migration first? Schema first? Component first? Be explicit.
10. **What are the exact success criteria?** These become the builder's verification steps.
11. **What are the non-negotiable constraints?** Auth, tenant scoping, privacy boundary, financial rules.
12. **What should NOT be touched?** Explicitly fence off adjacent code.
13. **Is this the simplest complete version?** If not, cut scope now.
14. **If implemented exactly as written, what would still be wrong?** Be honest.

### Final Check (Must Answer Explicitly)

> Is this spec production-ready, or am I proceeding with uncertainty?
> If uncertain: where specifically, and what would resolve it?

If uncertain on anything that affects correctness, the spec is NOT ready. Resolve it or flag it for the developer.

**Self-enforcement:** You must run Spec Validation and Final Check ON YOUR OWN before telling the developer the spec is ready. If you say "ready" without cited evidence for every question, you have failed the gate.

---

## BUILDER GATE (Execution Agents - MANDATORY)

**Every builder agent must pass this gate before marking work complete. No exceptions.**

This gate exists because agents say "done" when they mean "it compiled." Building code is not the same as shipping a working feature. This gate forces real testing, real evidence, and real accountability.

**Canonical prompts live in `docs/specs/README.md`.**

### Queue Selection (How Builders Pick What to Build)

Builder agents are queue-aware. They do not wait to be told what to build:

1. **Scan** every file in `docs/specs/`. Collect all specs with status `ready`.
2. **Filter** out any spec whose "Depends on" references a spec that is NOT `verified` or `built`.
3. **Sort** by priority: P0 first, then P1, P2, P3.
4. **Pick the first one.** That is the build target.
5. **Claim it** immediately: change status to `in-progress`, set "Built by" to your session, add a Timeline entry, commit the claim. This prevents double-picking.
6. If no buildable specs remain, report "Queue empty" and stop.

If the developer says "Build [specific spec or plain English]," skip the queue and build that. The rest of the gate still applies.

### Pre-Flight Check (MANDATORY - Before Writing Any Code)

**You do not build on a broken foundation. Verify the app works BEFORE you touch anything.**

1. **`git status`** - is the repo clean? If there are uncommitted changes from a prior agent, stop and report.
2. **`npx tsc --noEmit --skipLibCheck`** - must exit 0. If it fails, the app is already broken. Do not proceed. Report what's broken.
3. **`npx next build --no-lint`** - must exit 0. Skip ONLY if `.multi-agent-lock` exists. If it fails, stop and report.

**If any pre-flight check fails:** you are NOT allowed to write code. Fix the existing break first, or report it to the developer. Never stack new code on top of broken code.

### Spike (Before Writing Implementation Code)

1. **Read `CLAUDE.md`** (this file) cover to cover.
2. **Read the spec** you're implementing. Read the **Developer Notes** section carefully - understand the WHY, not just the WHAT.
3. **Look up affected pages in `docs/app-complete-audit.md`**.
4. **Read every file the spec names.** Not skim. Read. Understand conditional paths, validation, state management.
5. **Spike report** - before writing implementation code, report:
   - "I read these files: [list with line counts]"
   - "The spec is accurate about: [what matches]"
   - "The spec is wrong or incomplete about: [what doesn't match reality]"
   - "Developer intent from the notes: [summary of what the developer actually wants]"
   - If the spec is wrong: **STOP. Do not improvise.** Update the spec with corrections, then continue.

### Build Phase (Continuous Verification)

- Implement exactly what the spec defines. No unapproved additions.
- No "while I'm here" refactors. No bonus features.
- If you discover something the spec didn't anticipate: stop, update the spec, then continue.

**After every significant change (new file, major edit, or completing a logical unit):**

Run `npx tsc --noEmit --skipLibCheck`. If it fails, fix it NOW before touching another file. Do not accumulate type errors. Catch regressions the moment they happen, not at the end.

### Final Verification (Proof Required - Not Descriptions of Proof)

**You are not allowed to mark this complete without executing these steps and showing the output.**

1. **Type check:** `npx tsc --noEmit --skipLibCheck`. Paste output. Must exit 0.
2. **Build check:** `npx next build --no-lint`. Paste output. Must exit 0. Skip if `.multi-agent-lock` exists.
3. **Playwright verification:** Sign in with agent credentials (`.auth/agent.json`). Navigate to the feature. Execute the full user flow. Take screenshots. Paste screenshots. If Playwright literally cannot test this (rare), explain exactly why.
4. **Edge cases tested:** List each edge case from the spec. For each: what you did, what happened (not what "would" happen).
5. **Regression check:** List every page/component that imports or shares code with your changes. Verify at least one still works. If the feature touches auth/layout/navigation, run `npm run test:experiential`.
6. **Before vs after:** Show what changed. Screenshots, data output, or behavioral comparison.

### Final Check (Must Answer Explicitly)

> If this were handed to a real user right now:
> What is most likely to be broken, incomplete, or misleading?

If the answer is anything other than "nothing," fix it before marking complete.

### Completion Rules

- If any verification step fails: fix it, re-verify, then proceed.
- If you discover a regression: fix it before finishing.
- If you've hit 3 failures on the same issue: stop and report (Anti-Loop Rule).
- Update the spec's Timeline table with build + verification timestamps.
- Update the spec status to `verified` only after all verification passes.
- Update `docs/app-complete-audit.md` if any UI changed.
- Update `docs/build-state.md` with the new green state and commit hash.
- Commit with message format: `feat|fix(spec-name): description`.
- Push.

**Self-enforcement:** You must run every verification step and the Final Check ON YOUR OWN before telling the developer the build is complete. If you say "done" without pasted typecheck output, build output, and Playwright screenshots, you have failed the gate.

### Continuous Mode

In continuous mode, after completing one spec the agent loops back to Queue Selection and picks the next buildable spec. This continues until the queue is empty. If the Anti-Loop rule triggers on a spec, set its status back to `ready` with a note about what failed, then move to the next spec. One bad spec does not block the queue.

---

## RESEARCH GATE (Research Agents - MANDATORY)

**Research agents investigate questions and produce written reports. They do NOT write code. They do NOT write specs. They write findings.**

This gate exists because agents mix research with implementation. A research agent's only job is to understand and document. Someone else builds.

### Step 1: Load Context

1. Read `CLAUDE.md` (this file) cover to cover.
2. Read `docs/session-log.md` (last 5 entries) and `docs/build-state.md`.

### Step 2: Understand the Question

Restate what you're investigating in one sentence. If vague, make your interpretation explicit and confirm with the developer.

### Step 3: Capture Developer Notes

Same as Planner Gate Step 3. If the developer explained WHY they want this researched, capture their words and intent into the report's `## Origin Context` section. The developer's reasoning is part of the deliverable.

### Step 4: Investigate

Read actual code. Follow import chains. Trace data flows. Check database schemas. Read existing docs. Search for patterns.

**Rules:**

- Every claim cites a file path and line number. No citation = not verified.
- Follow the trail at least 2 levels deep.
- If external context is needed, use web search.
- **Do NOT make code changes, even "small fixes."** Flag issues in the report; a builder handles them.
- Anti-Loop Rule applies. 3 failed search strategies = document the gap and move on.

### Step 5: Write the Report

Create `docs/research/[topic-name].md`:

```markdown
# Research: [Topic]

> **Date:** YYYY-MM-DD
> **Question:** [the question investigated]
> **Status:** complete | partial (explain what's missing)

## Origin Context

[Developer's words and intent that prompted this research. Why they asked. What they're trying to solve. Faithful to what they said.]

## Summary

[2-3 sentence answer. Lead with the conclusion.]

## Detailed Findings

[Organized by sub-topic. Every finding cites file:line. Code snippets where they clarify. Tables for comparisons.]

## Gaps and Unknowns

[What you couldn't determine. What needs runtime testing, DB queries, or developer input.]

## Recommendations

[Action items tagged as: "quick fix," "needs a spec," or "needs discussion."]
```

### Step 6: Report Back

Tell the developer: report name, 2-3 sentence summary, how many gaps remain. Commit with `docs(research): [topic name]` and push.

**Self-enforcement:** No "research is done" without a written report in `docs/research/`. The report is the deliverable.

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

---

## IMPLEMENTATION PATTERNS

These are the patterns Claude will get wrong without explicit rules.

### 0. AI Must NEVER Generate Recipes (ABSOLUTE - NO EXCEPTIONS)

**AI (Remy, Ollama, any LLM) must never create, generate, fabricate, hallucinate, draft, suggest, or pull recipes from anywhere.** Not from the internet, not from its training data, not as a suggestion, not as a draft, not with chef approval, not in any tier, not ever.

AI has **zero role** in telling a chef what to cook or how to cook it. Recipes are the chef's creative work and intellectual property.

**The ONLY thing AI can do with recipes:**

- **Search the chef's own recipe book** (`recipe.search`) - read-only lookup of recipes the chef already entered manually. That's it.

**Everything else is banned:**

- Generate or fabricate a recipe from scratch
- Pull or suggest recipes from the internet or training data
- Create recipe instructions, methods, or ingredient lists
- Draft recipe content for chef review
- Add or modify ingredients via AI
- Suggest "what to make" or "what to cook"
- Auto-fill recipe fields from natural language descriptions

`agent.create_recipe`, `agent.update_recipe`, and `agent.add_ingredient` are **permanently restricted** in `lib/ai/agent-actions/restricted-actions.ts`. The input validation layer (`lib/ai/remy-input-validation.ts`) also blocks recipe generation intent before it reaches the LLM.

**Recipes are entered manually on the recipe form. Period.**

### 0b. Formula > AI - Always (HIGHEST PRIORITY PATTERN)

**If deterministic code (math, logic, database queries, conditional checks) can produce the correct result, ALWAYS use it over AI.** AI (Remy/Ollama) is the fallback, never the default.

A formula returns the same correct answer every single time, instantly, for free. AI returns a _probably_ correct answer, slower, using compute resources, and might hallucinate. There is no contest when both can do the job.

| Use deterministic code when...                            | Use AI (Remy) only when...                         |
| --------------------------------------------------------- | -------------------------------------------------- |
| The calculation is math                                   | Unstructured text needs to become structured data  |
| The logic is a simple condition (`if X < Y → alert`)      | A human would need judgment to interpret the input |
| Data is already structured (DB columns, CSV, form inputs) | The input format is unpredictable                  |
| Correctness matters more than convenience                 | Convenience matters and a wrong answer is harmless |
| It needs to work offline, instantly, zero compute cost    | The feature already requires Ollama to be running  |

**This applies retroactively.** If any existing feature uses Remy/Ollama for something a formula could handle, swap it out. AI stays where it genuinely earns its place: understanding natural language, generating draft text, interpreting unstructured input. Everywhere else, math and logic win.

### 0c. Prospecting Is Admin-Only (PERMANENT)

**Prospecting is exclusively an admin feature. It must NEVER appear in a non-admin user's portal - no nav links, no sidebar items, no dashboard widgets, no shortcuts. Ever.**

- **Nav config:** All prospecting nav items in `nav-config.tsx` have `adminOnly: true`. The sidebar (`chef-nav.tsx`) filters these out for non-admin users.
- **Dashboard:** The `ProspectingWidget` on the dashboard is gated behind `isAdmin()`.
- **Pages:** All `/prospecting/*` pages already have `requireAdmin()` - if a non-admin somehow navigates there, they get redirected.
- **If you add any new prospecting-related UI** (link, button, widget, shortcut), it MUST be gated behind `isAdmin` / `adminOnly`. No exceptions.

### 1. Non-Blocking Side Effects

Notifications, emails, activity logs, calendar syncs, and automations are **non-blocking** - if they fail, the main operation still succeeds.

- Always wrap side effects in `try/catch`
- Log failures as warnings, never throw
- The main transaction commits regardless

```ts
// CORRECT
try {
  await sendNotification(...)
} catch (err) {
  console.error('[non-blocking] Notification failed', err)
}

// WRONG  - this would roll back the whole operation on notification failure
await sendNotification(...)
```

### 2. Tenant ID Comes From Session - Never From Request Body

Always derive `tenant_id` from the authenticated session, never trust input from the client.

```ts
// CORRECT
const user = await requireChef()
const tenantId = user.tenantId! // from session

// WRONG  - attacker can forge this
const tenantId = input.tenantId
```

### 2b. tenant_id vs chef_id Naming Convention

Both `tenant_id` and `chef_id` reference `chefs(id)` and serve the same purpose (scoping data to one chef). The naming split is historical:

- **Core tables (Layers 1-4):** Use `tenant_id` (events, clients, quotes, recipes, menus, ledger_entries, ingredients, conversations, documents, etc.)
- **Feature tables (Layer 5+):** Use `chef_id` (gmail_sync_status, chef_todos, staff_members, contracts, equipment_inventory, chef_network tables, availability_waitlist, etc.)
- **New tables going forward:** Use `chef_id` (more descriptive since the tenant IS a chef)

Do NOT rename existing columns. Just use the correct name for whichever table you're querying.

### 3. Financial State Is Derived, Never Stored

Balances, profit, payment status, and food cost % are **computed from ledger entries** via database views - never written directly to a column.

- Use `event_financial_summary` view for per-event financials
- Use `getTenantFinancialSummary()` for overall totals
- If a number looks wrong, fix the ledger entry - never patch a balance column directly

### 4. UI Component Variants

Only use variants that actually exist - wrong variants fail silently or throw.

| Component  | Allowed variants                                 |
| ---------- | ------------------------------------------------ |
| `<Button>` | `primary`, `secondary`, `danger`, `ghost`        |
| `<Badge>`  | `default`, `success`, `warning`, `error`, `info` |

`outline`, `default` (Button), `warning` (Button), `success` (Button) do **not** exist.

### 5. Remy Chat Widget - Drag/Resize Corners Are Sacred

**The Remy concierge widget (`components/public/remy-concierge-widget.tsx`) MUST always have working drag-to-resize on all edges AND all four corners.** This is a permanent, non-negotiable rule.

- **Corner handles**: 16px hit area (`h-4 w-4`), z-index **higher** than edge handles (z-30 vs z-20).
- **Edge handles**: inset from corners (`left-4 right-4` / `top-4 bottom-4`) so they never overlap or block corner grabs.
- **Never** shrink corner hit areas, lower their z-index, or remove them.
- **Never** let edge handles extend into the corner zone.
- If refactoring the widget, preserve this resize architecture exactly.

### 6. Monetization Model (UPDATED March 2026)

**All features are free.** There is no Pro tier, no paywalls, no locked features.

Revenue comes from **voluntary supporter contributions** (Stripe checkout, cancel anytime). The billing page (`/settings/billing`) is now a "Support ChefFlow" page.

**For new features:**

1. **Assign a module** in `lib/billing/modules.ts` (all modules are `tier: 'free'`).
2. **Do NOT add `requirePro()` gating.** The function still exists (as a pass-through for auth) but should not be added to new code.
3. **Do NOT wrap content in `<UpgradeGate>`.** The component still exists (as a pass-through) but should not be added to new code.
4. **Do NOT add Pro badges, lock icons, or "upgrade to unlock" messaging anywhere in the UI.**
5. Community features are always free and ungated. Community growth is the priority.

**What still exists (for legacy compatibility):**

- `requirePro()` in `lib/billing/require-pro.ts` - now just calls `requireChef()`, never blocks
- `<UpgradeGate>` in `components/billing/upgrade-gate.tsx` - now just renders children
- `PRO_FEATURES` registry in `lib/billing/pro-features.ts` - retained for reference only
- Stripe subscription flow - used for voluntary supporter contributions

### 7. No Forced Onboarding Gates in Chef Layout (PERMANENT)

**Never add a redirect gate or full-page blocker to `app/(chef)/layout.tsx` that prevents navigation based on onboarding status, archetype selection, or profile completeness.** Onboarding is opt-in, never forced.

- No `redirect('/onboarding')` in the layout. Ever.
- No full-page component returns (like `<ArchetypeSelector />`) that replace the normal page render.
- The onboarding banner on the dashboard is the ONLY nudge. It is dismissible and non-blocking.
- Users must be able to freely navigate the entire app immediately after authentication.
- This rule exists because the forced redirect was added, "fixed," and re-added multiple times. It trapped users (including the developer) on the onboarding page and made the app unusable.

---

## ARCHITECTURE REMINDERS

These are the established patterns. Follow them - don't reinvent.

### Cloud AI Runtime (Production)

**Production AI uses a cloud Ollama-compatible endpoint.** Any function that handles client PII, financials, allergies, messages, or internal business data uses `parseWithOllama` - not `parseWithAI` (Gemini).

- `parseWithOllama` routes through `OLLAMA_BASE_URL` (cloud endpoint in production, localhost fallback in dev).
- `parseWithOllama` throws `OllamaOfflineError` if the runtime is unreachable. It **never** falls back to Gemini.
- **Never** add `parseWithAI` as a fallback in any file that calls `parseWithOllama`.
- If the AI runtime is unavailable, the feature hard-fails with a provider-agnostic error message. Data is not leaked.
- The `OllamaOfflineError` class lives in `lib/ai/ollama-errors.ts` (no `'use server'` - class exports are not allowed in server action files). Import it from there: `import { OllamaOfflineError } from '@/lib/ai/ollama-errors'`. Callers that catch errors **must** re-throw it: `if (err instanceof OllamaOfflineError) throw err`.
- Heuristic/regex fallbacks (no LLM call) are acceptable.
- Production has NO silent fallback to a local machine. If the cloud runtime is down, the product fails clearly.

Private data categories that route through the Ollama-compatible runtime (never Gemini):

- Client names, contact info, dietary restrictions, allergies, messages
- Budget amounts, quotes, payment history, revenue, expenses
- Business analytics, insights, lead scores, pricing history
- Temperature logs, staff data, event operational details

### Gemini/Ollama Boundary

Two AI backends, each with a clear purpose. Do not cross the boundary.

| Backend                       | Purpose                                              | Privacy                         |
| ----------------------------- | ---------------------------------------------------- | ------------------------------- |
| **Ollama-compat (cloud/dev)** | Private data (client PII, financials, allergies)     | Conversation content not stored |
| **Gemini**                    | Generic cloud tasks (technique lists, kitchen specs) | No PII allowed                  |

| File                                                        | AI Backend | Why                                                    |
| ----------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `lib/ai/gemini-service.ts`                                  | **Gemini** | Generic tasks, technique lists, kitchen specs (no PII) |
| `lib/ai/campaign-outreach.ts` (`draftCampaignConcept` only) | **Gemini** | Generic themes/occasions (no client data)              |
| `lib/ai/campaign-outreach.ts` (`draftPersonalizedOutreach`) | **Ollama** | Client names, dietary prefs, event history             |
| `lib/ai/parse-recipe.ts`                                    | **Ollama** | Chef IP (recipe text)                                  |
| `lib/ai/parse-brain-dump.ts`                                | **Ollama** | Client names, notes, recipes                           |
| `lib/ai/aar-generator.ts`                                   | **Ollama** | Client names, financials, temp logs                    |
| `lib/ai/contingency-ai.ts`                                  | **Ollama** | Location, dietary restrictions, allergies              |
| `lib/ai/grocery-consolidation.ts`                           | **Ollama** | Dietary restrictions, allergies, guest count           |
| `lib/ai/equipment-depreciation-explainer.ts`                | **Ollama** | Equipment prices, depreciation schedules               |
| `lib/ai/chef-bio.ts`                                        | **Ollama** | Chef name, business name, event history                |
| `lib/ai/contract-generator.ts`                              | **Ollama** | Client PII, event details, pricing                     |
| `lib/ai/remy-actions.ts`                                    | **Ollama** | All client/chef conversational data                    |

**Rule:** If a new AI file handles ANY private data category listed above, it MUST use `parseWithOllama`. No exceptions. Gemini is a separate cloud service; private data must not route through it.

---

### General Architecture

- **Server actions** with `'use server'` for all business logic
- **Database:** PostgreSQL via postgres.js (direct TCP, no PostgREST). Compatibility shim in `lib/db/compat.ts` provides PostgreSQL-like `.from().select().eq()` API backed by raw SQL
- **Auth:** Auth.js v5 (credentials + Google OAuth). Session via JWT. Config in `lib/auth/auth-config.ts`
- **Storage:** Local filesystem (`./storage/{bucket}/{path}`). Signed URLs via HMAC-SHA256. API routes serve files at `/api/storage/`
- **Realtime:** Server-Sent Events (SSE) with in-memory EventEmitter bus. `useSSE()` hook for client components. Server actions call `broadcast()` after mutations
- **Role checks** via `requireChef()`, `requireClient()`, `requireAuth()`
- **Tenant scoping** on every database query - no exceptions
- **`user_roles` table** is the single source of truth for role assignment
  - Uses `entity_id` (not `client_id`) and `auth_user_id` (not `user_id`)
- **All monetary amounts in cents** (minor units, integers)
- **Ledger-first financial model** - immutable, append-only, computed balances
- **8-state event FSM:** draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed | cancelled
- **`types/database.ts`** is auto-generated - never manually edit it
- **Embeddable widget** - `/embed/*` routes are public (no auth), use inline styles (no Tailwind), and have relaxed CSP (`frame-ancestors *`). The widget script (`public/embed/chefflow-widget.js`) is self-contained vanilla JS. See `docs/embeddable-widget.md`.
- **database SDK** is in devDependencies only (used by scripts and tests, not production code)

---

## KEY FILE LOCATIONS

| What                   | Where                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Event FSM              | `lib/events/transitions.ts`                                                        |
| Ledger append          | `lib/ledger/append.ts`                                                             |
| Ledger compute         | `lib/ledger/compute.ts`                                                            |
| Chef dashboard         | `app/(chef)/dashboard/page.tsx`                                                    |
| Event form             | `components/events/event-form.tsx`                                                 |
| Event transitions UI   | `components/events/event-transitions.tsx`                                          |
| DB connection          | `lib/db/index.ts` (Drizzle + postgres.js)                                          |
| DB compat shim         | `lib/db/compat.ts` (PostgreSQL-like API over raw SQL)                              |
| DB schema (gen)        | `lib/db/schema/` (auto-introspected, do not edit)                                  |
| Drizzle config         | `drizzle.config.ts`                                                                |
| Auth config            | `lib/auth/auth-config.ts` (Auth.js v5 providers + callbacks)                       |
| Auth route handler     | `app/api/auth/[...nextauth]/route.ts`                                              |
| Storage module         | `lib/storage/index.ts` (upload, download, signed URLs)                             |
| Storage API (signed)   | `app/api/storage/[...path]/route.ts`                                               |
| Storage API (public)   | `app/api/storage/public/[...path]/route.ts`                                        |
| SSE server bus         | `lib/realtime/sse-server.ts` (EventEmitter, broadcast, presence)                   |
| SSE client hook        | `lib/realtime/sse-client.ts` (useSSE, useSSEPresence)                              |
| SSE broadcast helpers  | `lib/realtime/broadcast.ts` (broadcastInsert/Update/Delete/Typing)                 |
| SSE endpoint           | `app/api/realtime/[channel]/route.ts`                                              |
| Schema Layer 1         | `database/migrations/20260215000001_layer_1_foundation.sql`                        |
| Schema Layer 2         | `database/migrations/20260215000002_layer_2_inquiry_messaging.sql`                 |
| Schema Layer 3         | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql`          |
| Schema Layer 4         | `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql`             |
| Generated types        | `types/database.ts` (never edit manually)                                          |
| Scripts PostgreSQL lib | `scripts/lib/database.mjs` (shared factory for .mjs scripts)                       |
| Tier resolution        | `lib/billing/tier.ts`                                                              |
| Pro feature registry   | `lib/billing/pro-features.ts`                                                      |
| Module definitions     | `lib/billing/modules.ts`                                                           |
| Pro enforcement        | `lib/billing/require-pro.ts`                                                       |
| Upgrade gate UI        | `components/billing/upgrade-gate.tsx`                                              |
| Module toggle page     | `app/(chef)/settings/modules/page.tsx`                                             |
| Embed widget script    | `public/embed/chefflow-widget.js`                                                  |
| Embed API route        | `app/api/embed/inquiry/route.ts`                                                   |
| Embed form page        | `app/embed/inquiry/[chefId]/page.tsx`                                              |
| Embed form component   | `components/embed/embed-inquiry-form.tsx`                                          |
| Embed settings page    | `app/(chef)/settings/embed/page.tsx`                                               |
| AI providers config    | `lib/ai/providers.ts`                                                              |
| AI dispatch layer      | `lib/ai/dispatch/` (classifier, privacy gate, routing table, router, cost tracker) |
| AI model governance    | `docs/ai-model-governance.md` **(canonical routing policy)**                       |
| AI routing audit       | `scripts/audit-model-routing.ts` (detects direct provider imports)                 |
| App audit (living)     | `docs/app-complete-audit.md` **(update when UI changes)**                          |
| Remy reference         | `docs/remy-complete-reference.md` **(read this instead of re-scanning Remy)**      |
| Research reports       | `docs/research/` (research agent output, not specs, not code)                      |
| Agent prompts          | `docs/specs/README.md` (canonical prompts for planner, builder, research agents)   |
| Session log            | `docs/session-log.md` (running log of what each agent did, read on startup)        |
| Build state            | `docs/build-state.md` (last known green build, read before building)               |
| Spec template          | `docs/specs/_TEMPLATE.md` (Timeline + Developer Notes + all sections)              |
| Definition of done     | `docs/definition-of-done.md` (verified, honest, resilient against drift)           |
| MC Manual panel        | `scripts/launcher/index.html` (panel-manual, live codebase scanner)                |
| MC Codebase scanner    | `scripts/launcher/server.mjs` (`scanCodebase()`, `GET /api/manual/scan`)           |
| MC File watcher        | `scripts/launcher/server.mjs` (`initFileWatcher()`, `GET /api/activity/summary`)   |
| Experiential tests     | `tests/experiential/` (blank screen detection, cross-boundary UX verification)     |
| Experiential config    | `playwright.experiential.config.ts`                                                |
| Experiential docs      | `docs/experiential-verification.md`                                                |
| System behavior map    | `docs/system-behavior-map.md` (full runtime behavior audit, March 2026)            |
| OpenClaw sync (all)    | `scripts/openclaw-pull/sync-all.mjs` (full pipeline: pull + normalize + prices)    |
| OpenClaw pull          | `scripts/openclaw-pull/pull.mjs` (Pi SQLite -> openclaw.\* tables)                 |
| OpenClaw normalize     | `scripts/openclaw-pull/sync-normalization.mjs` (norm map + ingredient aliases)     |
| OpenClaw price sync    | `scripts/run-openclaw-sync.mjs` (Pi API -> ingredient_price_history)               |
| Pipeline audit         | `scripts/pipeline-audit.mjs` (current state vs targets)                            |
| Price resolution       | `lib/pricing/resolve-price.ts` (10-tier fallback chain)                            |

---

## SINGLE ENVIRONMENT

One directory. Two servers. Zero fragmentation.

```text
C:\Users\david\Documents\CFv1\    (THE app, the only copy)
localhost:3100                     (dev server: npm run dev, hot reload for coding)
localhost:3000                     (prod server: npm run prod, compiled build, fast)
app.cheflowhq.com                 (Cloudflare Tunnel -> localhost:3000)
```

- **Dev:** `npm run dev` (port 3100, hot reload, your coding window)
- **Prod:** `npm run prod` (port 3000, optimized build, what clients see via app.cheflowhq.com)
- **Build only:** `npm run build` (compile without starting)
- **Ship workflow:** commit + push + rebuild prod (`npm run prod`)
- **Ollama:** `localhost:11434` (local AI, all private data processing)
- **Database:** Remote PostgreSQL via postgres.js (direct TCP)

There are no beta/staging/prod directories. There is one copy of the app. The prod server is just the compiled version of whatever is in this folder.

---

## DATABASE

- **Local PostgreSQL** via Docker container (`chefflow_postgres` on port 54322)
- **Connection:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Start:** `docker compose up -d`
- **Init (first time):** `bash scripts/init-local-db.sh` (creates stubs, applies migrations, seeds demo accounts)
- **Full docs:** `docs/local-database-setup.md`
- Cross-layer columns added via `ALTER TABLE` (e.g., Layer 3 adds columns to `clients`)
- Supabase compatibility stubs (auth schema, roles, storage schema) allow original migrations to run on vanilla PostgreSQL
- **No cloud database dependency.** Everything runs locally.
