# ChefFlow V1 — Project Rules

This file is read by Claude Code at the start of every conversation. These rules are mandatory.

---

> **🚨 STOP — Pushing to `main` = deploying to Vercel = spending real money.**
> **NEVER push to `main`, merge to `main`, or trigger a Vercel deployment** unless the developer explicitly says "push everything" / "merge to main" / "deploy."
> Feature branch pushes (`git push origin feature/...`) are always safe — Vercel ignores them, $0.
> **If you are unsure whether you should push to main: you should not.**

---

## Quick Reference

- **Stack:** Next.js · Supabase · Stripe — multi-tenant private chef platform
- **Data safety first:** all migrations additive, all destructive ops require explicit approval
- **End every session:** commit → push feature branch → update this file if new rules found
- **Private AI:** client data stays local via Ollama only — never Gemini, never cloud LLMs
- **Never:** merge to `main`, deploy to Vercel, or run `supabase db push` without explicit approval
- **Project map:** see `docs/PROJECT-MAP.md` for what exists and where — check before exploring

---

## VOICE-TO-TEXT INPUT

Developer uses **voice-to-text for almost all input.** Messages will have run-on sentences, missing punctuation, wrong words that sound right. Parse for intent, not grammar. Never ask about formatting. Never correct spelling.

**Common mishearings:** `shuffle`, `shovel`, `shove`, `Lowe's`, `Chevelle`, `chef flow`, `Chef Flo`, `sheflo`, `cheflo` → all mean **ChefFlow**. `cloud MD`, `clawed` → `CLAUDE.md`.

| Where        | Name Used                             |
| ------------ | ------------------------------------- |
| App/UI       | `ChefFlow`                            |
| Email sender | `CheFlow`                             |
| package.json | `chefflow`                            |
| Domain       | `cheflowhq.com` / `app.cheflowhq.com` |
| Folder       | `CFv1`                                |
| Tagline      | `Ops for Artists`                     |

---

## ANTI-LOOP RULE (MANDATORY)

**3-Strike Rule:** If the same problem fails 3 times → **STOP and report to the user.**

- **Strikes** = same error returning, going in circles, retrying known failures
- **NOT strikes** = different errors on different files (that's forward progress — keep going)
- **The test:** "Am I making forward progress or going in circles?"
- Re-running the exact same failed command = 2 strikes immediately
- On stop: commit partial work, report what failed and what you tried, let user decide
- Stopping on one problem ≠ stopping everything — continue other tasks

---

## DATA SAFETY

- **NEVER** `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE` without warning the user what data would be lost and getting explicit approval
- **NEVER** modify column types or rename columns without explaining risk and getting approval
- All migrations **additive by default**. Show full SQL before writing migration files.
- **NEVER** run `supabase db push` without explicit approval. Remind user to backup first: `supabase db dump --linked > backup-$(date +%Y%m%d).sql`
- **Before creating ANY migration:** run `glob supabase/migrations/*.sql`, pick timestamp strictly higher than the highest existing one. Never reuse/guess.
- Never `.delete()` on production tables without approval
- Never circumvent immutability on `ledger_entries`, `event_transitions`, `quote_state_transitions`

---

## SELF-MAINTAINING DOCUMENT

Update `CLAUDE.md` immediately when: a pattern/rule gets established, developer asks for the same thing twice, new architectural decision made, bug traced to missing rule, new file/migration/component added that agents need to know about. Also update `memory/MEMORY.md` if the rule belongs in persistent memory. Commit both. Do not wait to be asked.

---

## SESSION CLOSE-OUT (every session, no exceptions)

1. `git add` all modified/created files
2. Commit with clear message
3. `git push origin <current-branch>`
4. Update this file if new rules found
5. Report what was committed and pushed

---

## DEVELOPMENT WORKFLOW

- Explain what you're about to do before making changes to database, auth, or financial logic. When in doubt, ask — don't assume.
- **Always create a follow-up `.md` doc** for every code change — no code-only changes
- Feature branches for new work. Branch naming: `feature/description` or `fix/description`
- **NEVER** merge to `main` without explicit user approval

### Feature Close-Out

Run in order — stop and report any failure before continuing:

1. `npx tsc --noEmit --skipLibCheck` → must exit 0
2. `npx next build --no-lint` → must exit 0
3. Commit + push feature branch
4. Do **NOT** merge to `main`

### Health Checks (before merging to main)

- `npx tsc --noEmit --skipLibCheck` → zero errors
- `npx next build --no-lint` → exit 0
- All work committed and pushed
- `types/database.ts` current with remote schema
- Only after all above: merge to `main` with explicit user approval

### Agent Testing Account

Credentials in `.auth/agent.json` (or `.env.local`: `AGENT_EMAIL`/`AGENT_PASSWORD`). If missing, run `npm run agent:setup`. Sign in via `POST http://localhost:3100/api/e2e/auth`. Chef role + admin access. Use proactively to verify UI changes, debug auth/redirects, reproduce bugs. Do NOT sign out (preserves session). Don't ask developer to manually test what you can verify yourself.

### Reference Docs

- **`docs/AGENT-WORKFLOW.md`** — full playbook: health checks, migration safety, parallel agent rules, merge procedure
- **`docs/AI_POLICY.md`** — AI assists drafting only, never owns canonical state, no lifecycle transitions, no ledger writes
- **`docs/PROJECT-MAP.md`** — what's built, where things live, directory structure
- **`memory/action-inventory.md`** — 467-action lifecycle, 18 stages, chef's irreducible core

---

## MULTI-AGENT MODE

You are in multi-agent mode if: user mentions multiple agents/parallel work, you were spawned as a sub-task, or prompt doesn't ask YOU to build.

**Do:** implement fully, write follow-up doc, `git add` + `git commit`, report and stop.

**Never:** run `npx tsc`, run `npx next build`, interact with localhost, retry a failed build, wait for build before committing. Commit code, let developer verify once after all agents finish.

Only run builds if user explicitly tells YOU to, or you're confirmed as the only agent.

A PreToolUse hook (`.claude/hooks/build-guard.sh`) blocks builds when `.multi-agent-lock` exists.

---

## IMPLEMENTATION PATTERNS

### 1. Non-Blocking Side Effects

Notifications, emails, activity logs, calendar syncs = **non-blocking**. Always `try/catch`, log failures as warnings, never throw. Main transaction commits regardless.

### 2. Tenant ID From Session Only

```ts
const user = await requireChef()
const tenantId = user.tenantId! // CORRECT — from session, never from request body
```

### 3. Financial State Is Derived, Never Stored

Balances, profit, payment status = **computed from ledger entries** via `event_financial_summary` view. Never write directly to a balance column. Fix the ledger entry instead.

### 4. UI Component Variants

| Component  | Allowed variants                                 |
| ---------- | ------------------------------------------------ |
| `<Button>` | `primary`, `secondary`, `danger`, `ghost`        |
| `<Badge>`  | `default`, `success`, `warning`, `error`, `info` |

No `outline`, no `default` (Button), no `warning`/`success`/`error` (Button).

### 5. Typography

- **Body text:** Inter (sans-serif) — `font-sans` class, loaded via `next/font/google`
- **Page headings (h1):** DM Serif Display (serif) — applied globally via `globals.css`, also available as `font-display` Tailwind class
- **Brand name "ChefFlow":** Always `font-display` (serif) in nav, headers, footers
- **Never** use `font-display` on body text, form labels, nav items, table data, or badges

### 6. Brand Color Tokens

CSS custom properties exist in `:root` for non-Tailwind contexts (FullCalendar, etc.):
`--brand-50`, `--brand-400`, `--brand-500`, `--brand-600`

Motion tokens: `--ease-spring`, `--ease-bounce`, `--duration-fast/normal/slow/enter/exit`

Favicon/PWA icons use gradient `#eda86b` → `#d47530` (brand-400 → brand-600). Never navy/dark backgrounds.

---

## ARCHITECTURE

- **Server actions** with `'use server'` for all business logic
- **Role checks:** `requireChef()`, `requireClient()`, `requireAuth()`
- **Tenant scoping** on every query — no exceptions
- **`user_roles`** table: uses `entity_id` (not `client_id`) and `auth_user_id` (not `user_id`)
- **All monetary amounts in cents** (integers)
- **Ledger-first:** immutable, append-only, computed balances
- **8-state FSM:** draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled
- **`types/database.ts`** is auto-generated — never manually edit

### Private AI — Local Only (NO Exceptions)

**Private data must never leave the local machine.** `parseWithOllama` = local Ollama only. Never falls back to Gemini. **Never** add `parseWithAI` as a fallback in any file that calls `parseWithOllama`. If offline → throws `OllamaOfflineError` (from `lib/ai/ollama-errors.ts` — no `'use server'`, class exports not allowed in server action files). Import: `import { OllamaOfflineError } from '@/lib/ai/ollama-errors'`. Callers must re-throw: `if (err instanceof OllamaOfflineError) throw err`. Heuristic/regex fallbacks OK.

Private data categories (must stay local): client PII, dietary restrictions, allergies, messages, budget/quotes/payment history, business analytics, lead scores, pricing history, temp logs, staff data, event operational details.

---

## KEY FILE LOCATIONS

| What                  | Where                                                 |
| --------------------- | ----------------------------------------------------- |
| Event FSM             | `lib/events/transitions.ts`                           |
| Ledger append/compute | `lib/ledger/append.ts`, `lib/ledger/compute.ts`       |
| Chef dashboard        | `app/(chef)/dashboard/page.tsx`                       |
| Event form            | `components/events/event-form.tsx`                    |
| Event transitions UI  | `components/events/event-transitions.tsx`             |
| Schema Layers 1–4     | `supabase/migrations/20260215000001` through `000004` |
| Generated types       | `types/database.ts` (never edit)                      |

---

## DATABASE

- No local Supabase (no Docker) — use remote with `--linked` flag
- Project ID: `luefkpakzvxcsqroxyhz`
- Cross-layer columns added via `ALTER TABLE`
