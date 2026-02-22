# ChefFlow V1 — Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

---

> **🚨 STOP — READ THIS BEFORE DOING ANYTHING 🚨**
>
> **Pushing to `main` = deploying to Vercel = spending real money.**
>
> **You are NEVER allowed to push to `main`, merge to `main`, or trigger a Vercel deployment. EVER. Not "just this once," not "to test," not for any reason. The ONLY exception is if the developer explicitly says "push everything" or "merge to main" or "deploy." No other phrasing counts.**
>
> **Feature branch pushes (`git push origin feature/...`) are always safe — Vercel ignores them, they cost $0. Do those freely.**
>
> **If you are unsure whether you should push to main: you should not.**

---

## Quick Reference

- **Stack:** Next.js · Supabase · Stripe — multi-tenant private chef platform
- **Data safety first:** all migrations are additive, all destructive ops require explicit approval
- **End every session:** commit everything → push the feature branch → update this file if new rules were found
- **Private AI:** client data stays local via Ollama only — never Gemini, never cloud LLMs
- **Never:** merge to `main`, deploy to Vercel, or run `supabase db push` without explicit user approval

---

## VOICE-TO-TEXT INPUT (READ THIS — IT AFFECTS EVERY MESSAGE)

The developer uses **voice-to-text for almost all input** — on phone, on desktop, even while at the computer. This means:

- **Messages will have weird formatting.** Run-on sentences, missing periods, random punctuation in wrong places, repeated phrases ("and how the and how everything"), sentence fragments — this is all normal.
- **Words may be wrong but sound right.** Voice-to-text mishears things. "cloud MD" = `CLAUDE.md`. "cloud folder" = `.claude/` folder. Read phonetically when something doesn't make sense.
- **Capitalization, grammar, and structure will be inconsistent.** Don't assume the developer is being vague or unclear — the intent is usually obvious if you read for meaning instead of literal words.
- **Never ask for clarification on formatting.** If the message is a messy run-on but the intent is clear, just do the thing. Only ask for clarification when you genuinely cannot determine what they want.
- **Never correct the developer's grammar or spelling.** Just understand it and move on.

### Common Voice-to-Text Mishearings

The app name **"ChefFlow"** is constantly misheard by voice-to-text. If any of these words appear and don't make sense in context, the developer is saying **ChefFlow**:

`shuffle`, `shovel`, `shove`, `Lowe's`, `Chevelle`, `chef flow`, `Chef Flo`, `chef low`, `sheflo`, `cheflo`

This list is not exhaustive — voice-to-text invents new mishearings regularly. If a word appears that makes no sense but sounds vaguely like "ChefFlow," it's ChefFlow.

Similarly, `CLAUDE.md` gets misheard as `cloud MD`, `cloud folder`, `clawed`, etc.

**Rule: Parse for intent, not for grammar. The meaning is always there — the punctuation isn't.**

### Brand Names — What Things Are Currently Called

Different names are used in different places. This is intentional — don't "fix" one to match another.

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

## ANTI-LOOP RULE (MANDATORY — READ THIS)

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

**The test: "Am I making forward progress or am I going in circles?"** If you're seeing the same errors come back, undoing your own fixes, or re-trying commands you know failed — you're looping. If each attempt moves you closer to the goal or reveals new information — you're working.

### What "STOP" Means

1. **Do not make another attempt at the thing that's failing**
2. **Commit whatever work you've done so far** (partial progress is better than lost progress)
3. **Report clearly:** what you were trying to do, what failed, what you tried, and what the error was
4. **Let the user decide** the next step
5. **Continue working on OTHER tasks** if you have them — stopping on one problem doesn't mean stopping everything

### Why This Exists

Without this rule, an agent that hits a tricky error will loop for 30–60+ minutes, burning hundreds of thousands of tokens, and often making the code worse with each iteration. The developer loses real money ($10–50+ per loop incident) and gets a worse result than if the agent had just stopped and asked for help after the second failure. The goal is not to limit agents — it's to redirect effort from futile repetition into asking for help.

---

## DATA SAFETY (HIGHEST PRIORITY)

These rules exist because this is a **live production app with real client data**. Data loss is unacceptable.

### Database Migrations

- **NEVER** write a migration containing `DROP TABLE`, `DROP COLUMN`, `DELETE`, or `TRUNCATE` without:
  1. Explicitly warning the user in plain language
  2. Explaining exactly what data would be lost
  3. Getting explicit approval before writing the file
- **NEVER** modify an existing column's type or rename a column without explaining the risk first and getting approval.
- All migrations must be **additive by default** — add tables, add columns, add indexes, add constraints. Removing or altering existing structures requires explicit approval.
- Before creating any migration file, **explain in plain English** what it will do to the database.
- **Show the user the full SQL** before writing the migration file.
- Remind the user to **back up their database** before applying migrations with real data.
- **NEVER** run `supabase db push` or apply migrations without explicit user approval.
- **Before every `supabase db push`**, remind the user to run a backup first:

  ```bash
  supabase db dump --linked > backup-$(date +%Y%m%d).sql
  ```

### Migration Timestamp Collisions (CRITICAL — Multi-Agent Safety)

- **Before creating ANY migration file**, you MUST run `glob supabase/migrations/*.sql` to see all existing migration files.
- Pick a timestamp that is **strictly higher** than the highest existing one. For example, if the highest is `20260221000002`, your new file must be `20260221000003` or later.
- **NEVER** reuse or guess a timestamp. Always check first.
- This rule exists because multiple Claude Code agents may run concurrently. Without checking, two agents can generate the same timestamp, causing migration collisions that corrupt the schema.

### Server Actions & Queries

- Never write a `.delete()` query on production tables without explicit approval.
- Respect existing immutability triggers — never attempt to circumvent the immutability on `ledger_entries`, `event_transitions`, or `quote_state_transitions`.

---

## SELF-MAINTAINING DOCUMENT (READ THIS FIRST)

This document must stay current. Claude is responsible for keeping it updated — the developer should never have to ask.

### When to update this file

Update `CLAUDE.md` immediately whenever any of the following happen:

- A pattern or rule gets established during a session (e.g. "always use X", "never do Y")
- The developer has to ask Claude for the same thing more than once — that's a missing rule
- A new architectural decision is made that affects how future agents should behave
- A bug or mistake is traced back to a missing or unclear rule
- A new file location, migration, or system component is added that agents need to know about

**Do not wait to be asked.** If something belongs in this document, add it in the same session it was discovered.

### How to update

1. Edit `CLAUDE.md` directly with the new rule in the appropriate section
2. Also update `memory/MEMORY.md` if the rule belongs in persistent memory
3. Commit both files with a clear message like `docs(rules): add X rule`
4. Push — this is part of the standard session close-out

---

## STANDARD SESSION CLOSE-OUT (run at the end of every session)

These steps run automatically at the end of every session, whether or not the developer asks. No exceptions.

1. **Stage all changes** — `git add` every file that was modified or created
2. **Commit** — clear, descriptive commit message
3. **Push the current branch** — `git push origin <current-branch>` → GitHub backup, costs $0, Vercel ignores it
4. **Update this file** — if any new patterns, rules, or decisions were made this session, add them now
5. **Report** — tell the developer what was committed and pushed

**What this prevents:** Work existing only on the local machine. If the machine is wiped, stolen, or corrupted, everything on GitHub is safe. The database is already off-machine (Supabase). Code must be too.

---

## DEVELOPMENT WORKFLOW

### Before Making Changes

- **Explain what you're about to do in plain terms** before making changes, especially for anything touching the database, authentication, or financial logic.
- When in doubt, **ask — don't assume**.

### Documentation

- **Always create a follow-up `.md` document for every code change.** Every implementation should have a reflecting document that explains what changed, why, and how it connects to the system. No code-only changes.

### Git Workflow

- Use **feature branches** for new work, not direct commits to `main`.
- Branch naming: `feature/description` or `fix/description`.
- **NEVER** merge to `main` or deploy to Vercel unless the user explicitly says so.
- **ALWAYS `git push` the current branch to GitHub at the end of every session.** This is the off-machine backup. Do not wait to be asked.
- Pushing feature branches is **always safe** — `vercel.json` has `ignoreCommand` set so Vercel only builds when code is pushed to `main`. Feature branch pushes cost $0.
- `git commit` + `git push origin <current-branch>` is the default. Merging to `main` is not.

### Feature Close-Out (run when user asks to close out a feature)

Run these in order — stop and report any failure before continuing:

1. `npx tsc --noEmit --skipLibCheck` → must exit 0
2. `npx next build --no-lint` → must exit 0
3. `git add` relevant files + `git commit` with a clear message
4. `git push origin <current-branch>` — push the feature branch to GitHub (backup, $0 cost, Vercel ignores it)
5. Confirm branch is clean and ready — do **NOT** merge to `main` or deploy to Vercel

### Health Checks (run before merging to main)

- `npx tsc --noEmit --skipLibCheck` → must exit 0, zero errors
- `npx next build --no-lint` → must exit 0
- All work committed and pushed to the feature branch on GitHub
- `types/database.ts` current with remote schema
- Only after all of the above: merge to `main` with explicit user approval

### Agent Testing Account — Use It

A persistent agent account exists for programmatic testing. **Use it proactively** — don't ask the developer to manually test things you can verify yourself.

- **Credentials:** Read from `.auth/agent.json` (or `.env.local`: `AGENT_EMAIL` / `AGENT_PASSWORD`)
- **Sign in:** `POST http://localhost:3100/api/e2e/auth` with `{ "email", "password" }` from the credentials
- **Access:** Chef role + admin access (full app)
- **Setup:** If `.auth/agent.json` doesn't exist, run `npm run agent:setup` first

**When to use it:**

- After implementing a UI change — sign in via Playwright and verify it renders correctly
- When debugging auth, redirects, or page-load issues — sign in and inspect the behavior
- When the user reports something is broken — sign in and reproduce it before guessing at fixes
- During feature close-out — smoke-test the feature in a real browser, not just type-check

**How:**

1. Ensure dev server is running on port 3100 (ask the user to start it if needed)
2. Launch Playwright, POST to `/api/e2e/auth` with agent credentials
3. Navigate, interact, screenshot, and report findings
4. Do NOT sign out (preserves the session for follow-up checks)

**Rule: Verify before reporting.** If you can test something yourself with the agent account, do it. Only ask the developer to manually test when browser interaction is required that Playwright can't handle (e.g., OAuth popups, mobile-specific gestures).

### Full Workflow Reference

**`docs/AGENT-WORKFLOW.md`** — complete step-by-step playbook: health checks, migration safety, parallel agent rules, merge procedure. Covers what to do before, during, and after every session. Read it before starting significant work.

**`docs/AI_POLICY.md`** — governs all AI feature work. AI assists drafting only, never owns canonical state. Hard restrictions: no lifecycle transitions, no ledger writes, no silent automation. All AI output requires chef confirmation before becoming canonical.

**`memory/action-inventory.md`** — 467-action lifecycle across 18 stages from first contact to post-service. Critical for understanding what the system must handle. Chef's irreducible core: creative decisions, physical cooking, relationship moments, final approval on all client-facing comms.

---

## MULTI-AGENT MODE (READ THIS — SAVES REAL MONEY)

This project frequently runs **10+ agents in parallel**. When you are one of many concurrent agents, the following rules are **mandatory and override the Feature Close-Out steps above**.

### How to know you're in multi-agent mode

You are in multi-agent mode if:

- The user's prompt mentions multiple agents, parallel work, or asks you to focus on a specific area/feature only
- You were spawned as a sub-task by another agent
- The prompt does not explicitly ask YOU to run the build

### What to do

1. **Do your assigned work fully** — implement, fix, write the code.
2. **Create the follow-up `.md` doc** as required by project rules.
3. **`git add` and `git commit`** your changes with a clear message.
4. **Report what you changed and stop.**

### What NOT to do — EVER in multi-agent mode

- **DO NOT run `npx tsc --noEmit`** — 10 agents running this simultaneously will fight over the TypeScript compiler and produce false errors.
- **DO NOT run `npx next build`** — concurrent agents corrupt `.next/`, compete for the same port, and every build fails. You will loop forever.
- **DO NOT interact with localhost or the dev server** — another agent may be using it.
- **DO NOT retry a failed build.** If something fails, report it once and stop. Do not loop.
- **DO NOT wait for the build to pass before committing.** Commit your code changes and let the developer run a single clean build after all agents finish.

### Why this rule exists

When 10 agents each try to verify the build, they all fail (`.next/` corruption, port 3100 conflicts, concurrent TypeScript process crashes). Each agent then retries, burning hundreds of tokens in a loop that never resolves. The developer loses time and money. The fix is simple: **agents implement and commit, the developer verifies once at the end.**

### The only time you should run a build

Only run `npx tsc --noEmit --skipLibCheck` or `npx next build --no-lint` if:

- The user explicitly tells YOU (this specific agent) to run the build
- You are the only agent running (single-agent session, user confirmed)

---

## IMPLEMENTATION PATTERNS

These are the four patterns Claude will get wrong without explicit rules.

### 1. Non-Blocking Side Effects

Notifications, emails, activity logs, calendar syncs, and automations are **non-blocking** — if they fail, the main operation still succeeds.

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

// WRONG — this would roll back the whole operation on notification failure
await sendNotification(...)
```

### 2. Tenant ID Comes From Session — Never From Request Body

Always derive `tenant_id` from the authenticated session, never trust input from the client.

```ts
// CORRECT
const user = await requireChef()
const tenantId = user.tenantId! // from session

// WRONG — attacker can forge this
const tenantId = input.tenantId
```

### 3. Financial State Is Derived, Never Stored

Balances, profit, payment status, and food cost % are **computed from ledger entries** via database views — never written directly to a column.

- Use `event_financial_summary` view for per-event financials
- Use `getTenantFinancialSummary()` for overall totals
- If a number looks wrong, fix the ledger entry — never patch a balance column directly

### 4. UI Component Variants

Only use variants that actually exist — wrong variants fail silently or throw.

| Component  | Allowed variants                                 |
| ---------- | ------------------------------------------------ |
| `<Button>` | `primary`, `secondary`, `danger`, `ghost`        |
| `<Badge>`  | `default`, `success`, `warning`, `error`, `info` |

`outline`, `default` (Button), `warning` (Button), `success` (Button) do **not** exist.

### 5. Tier Assignment (New Features)

Every new feature **MUST** be assigned to a tier and module. This ensures the freemium system stays consistent.

1. **Determine the tier**: Is it part of the irreducible core (inquiries, events, clients, quotes, payments, basic calendar, basic finance, recipes, documents)? → **Free**. Everything else → **Pro**.
2. **Assign a module**: Which module from `lib/billing/modules.ts` does this belong to? If none fits, discuss with the developer first.
3. **Add gating** (Pro features only):
   - Server actions: add `await requirePro('module-slug')` at the top
   - Pages: wrap content in `<UpgradeGate chefId={user.entityId} featureSlug="slug">`
   - Nav items: set `module: 'module-slug'` on the nav config entry
4. **Update the registry**: Add the feature to `lib/billing/pro-features.ts` if it's Pro.
5. **Admin bypass**: Admins (`isAdmin()`) always have full Pro access. `requirePro()` and `<UpgradeGate>` handle this automatically.

---

## ARCHITECTURE REMINDERS

These are the established patterns. Follow them — don't reinvent.

### Private AI — Local Only (NO Exceptions)

**Private data must never leave the local machine.** Any function that handles client PII, financials, allergies, messages, or internal business data uses `parseWithOllama` — not `parseWithAI`.

- `parseWithOllama` now throws `OllamaOfflineError` if Ollama is not running. It **never** falls back to Gemini.
- **Never** add `parseWithAI` as a fallback in any file that calls `parseWithOllama`.
- If Ollama is offline, the feature hard-fails with a clear error. The user sees "Start Ollama to use this feature." Data is not leaked.
- The `OllamaOfflineError` class lives in `lib/ai/ollama-errors.ts` (no `'use server'` — class exports are not allowed in server action files). Import it from there: `import { OllamaOfflineError } from '@/lib/ai/ollama-errors'`. Callers that catch errors **must** re-throw it: `if (err instanceof OllamaOfflineError) throw err`.
- Heuristic/regex fallbacks (no LLM call) are acceptable — they don't send data externally.

Private data categories that must stay local:

- Client names, contact info, dietary restrictions, allergies, messages
- Budget amounts, quotes, payment history, revenue, expenses
- Business analytics, insights, lead scores, pricing history
- Temperature logs, staff data, event operational details

---

### General Architecture

- **Server actions** with `'use server'` for all business logic
- **Role checks** via `requireChef()`, `requireClient()`, `requireAuth()`
- **Tenant scoping** on every database query — no exceptions
- **`user_roles` table** is the single source of truth for role assignment
  - Uses `entity_id` (not `client_id`) and `auth_user_id` (not `user_id`)
- **All monetary amounts in cents** (minor units, integers)
- **Ledger-first financial model** — immutable, append-only, computed balances
- **8-state event FSM:** draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled
- **`types/database.ts`** is auto-generated — never manually edit it

---

## KEY FILE LOCATIONS

| What                 | Where                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| Event FSM            | `lib/events/transitions.ts`                                               |
| Ledger append        | `lib/ledger/append.ts`                                                    |
| Ledger compute       | `lib/ledger/compute.ts`                                                   |
| Chef dashboard       | `app/(chef)/dashboard/page.tsx`                                           |
| Event form           | `components/events/event-form.tsx`                                        |
| Event transitions UI | `components/events/event-transitions.tsx`                                 |
| Schema Layer 1       | `supabase/migrations/20260215000001_layer_1_foundation.sql`               |
| Schema Layer 2       | `supabase/migrations/20260215000002_layer_2_inquiry_messaging.sql`        |
| Schema Layer 3       | `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql` |
| Schema Layer 4       | `supabase/migrations/20260215000004_layer_4_menus_recipes_costing.sql`    |
| Generated types      | `types/database.ts` (never edit manually)                                 |
| Tier resolution      | `lib/billing/tier.ts`                                                     |
| Pro feature registry | `lib/billing/pro-features.ts`                                             |
| Module definitions   | `lib/billing/modules.ts`                                                  |
| Pro enforcement      | `lib/billing/require-pro.ts`                                              |
| Upgrade gate UI      | `components/billing/upgrade-gate.tsx`                                     |
| Module toggle page   | `app/(chef)/settings/modules/page.tsx`                                    |

---

## DATABASE

- No local Supabase (no Docker) — use remote with `--linked` flag
- Project ID: `luefkpakzvxcsqroxyhz`
- Cross-layer columns added via `ALTER TABLE` (e.g., Layer 3 adds columns to `clients`)
