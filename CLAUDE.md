# ChefFlow V1 — Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

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
4. Confirm branch is clean and ready — do NOT push or deploy

### Health Checks (run before merging to main)

- `npx tsc --noEmit --skipLibCheck` → must exit 0, zero errors
- `npx next build --no-lint` → must exit 0
- All work committed, no important untracked files
- `types/database.ts` current with remote schema

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

See **`docs/AGENT-WORKFLOW.md`** for the complete step-by-step playbook covering health checks, migration safety, parallel agent rules, and merge procedure. Every agent should read it before starting significant work.

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

---

## DATABASE

- No local Supabase (no Docker) — use remote with `--linked` flag
- Project ID: `luefkpakzvxcsqroxyhz`
- Cross-layer columns added via `ALTER TABLE` (e.g., Layer 3 adds columns to `clients`)
