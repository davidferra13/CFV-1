# AGENTS.md

> **READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**
> This is a live production app (ChefFlow) with real users and real data.
> Breaking rules here = breaking the product, losing data, or costing real money.

---

## HARD STOPS (BREAK THESE = BREAK THE PROJECT)

### 1. NEVER push to main, merge to main, or deploy to production

Pushing to `main` = deploying to production. Feature branch pushes are always safe.
The ONLY exception: the developer explicitly says "push to main" or "deploy."

### 2. NEVER run destructive database operations

No `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE`, or column type changes without explicit developer approval. All migrations must be additive (add tables, add columns, add indexes). Show the developer the full SQL before writing any migration file.

### 3. NEVER run `supabase db push` without explicit approval

### 4. NEVER edit `types/database.ts`

This file is auto-generated from the database schema. Manual edits will be overwritten and cause drift.

### 5. NEVER create files with `@ts-nocheck`

Fix the types or don't write the file.

### 6. NEVER use em dashes (the long dash character)

Use commas, periods, semicolons, parentheses, colons, or hyphens with spaces instead. Em dashes are banned project-wide.

### 7. NEVER deploy, build, or run long-running processes without explicit permission

Don't run `next build`, `npm run dev`, or deploy scripts unless the developer specifically asks.

### 8. NEVER kill or restart running servers

The developer may have dev/beta/prod servers running. Don't touch them.

---

## STACK & ARCHITECTURE

- **Stack:** Next.js (App Router) + Supabase + Stripe
- **What it is:** Multi-tenant private chef platform (SaaS)
- **All monetary amounts:** stored in cents (integers, minor units)
- **Financial model:** Ledger-first, immutable, append-only. Balances are computed from ledger entries, never stored directly.
- **Event FSM:** draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed | cancelled
- **Server actions:** All business logic uses `'use server'` files
- **Auth:** `requireChef()`, `requireClient()`, `requireAuth()` at the top of every server action
- **Tenant scoping:** Every DB query MUST include `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.entityId)`. Never trust tenant_id from request body.

### 3-Environment Setup (all on developer's local PC)

| Port | Environment | Domain             | Notes                           |
| ---- | ----------- | ------------------ | ------------------------------- |
| 3100 | Development | localhost          | `next dev`, hot reload          |
| 3200 | Beta        | beta.cheflowhq.com | `next start`, Cloudflare Tunnel |
| 3300 | Production  | app.cheflowhq.com  | `next start`, Cloudflare Tunnel |

All three share the same Supabase database and Ollama instance (port 11434).

---

## SERVER ACTION RULES

Every server action must:

1. **Start with auth** - `requireChef()`, `requireClient()`, `requireAdmin()`, or documented as intentionally public
2. **Scope by tenant** - Every DB query includes tenant_id or chef_id filter
3. **Validate input** - Reject empty/invalid before any DB call
4. **Handle errors** - DB errors throw or return `{ success: false, error }`. Never silently return empty/zero.
5. **Return feedback** - Mutations return `{ success, error? }` or the record. Never `Promise<void>`.
6. **Bust caches** - After mutations, call `revalidatePath` or `revalidateTag` for affected caches. `revalidatePath` does NOT bust `unstable_cache` tags; use `revalidateTag` for those.

### 'use server' file rules

- Only async functions can be exported from `'use server'` files
- Never `export const`, `export class`, or `export type` from these files
- Non-server-action helpers go in separate non-`'use server'` files

---

## PRIVATE AI - LOCAL ONLY (CRITICAL)

Client data NEVER leaves the local machine. Two AI backends:

| Backend            | Use for                                                                | Privacy          |
| ------------------ | ---------------------------------------------------------------------- | ---------------- |
| **Ollama** (local) | Anything touching client PII, financials, allergies, messages, recipes | Data stays on PC |
| **Gemini** (cloud) | Generic tasks only (technique lists, kitchen specs). NO PII ever.      | Cloud service    |

- `parseWithOllama` for private data. It throws `OllamaOfflineError` if Ollama is down. Never falls back to cloud.
- `parseWithAI` (Gemini) only for non-private, generic content.
- If you're unsure, use Ollama. The cost of a false positive (using local when cloud would work) is zero. The cost of a false negative (leaking PII to cloud) is catastrophic.

---

## AI MUST NEVER GENERATE RECIPES

AI has zero role in telling a chef what to cook. Recipes are the chef's creative IP.

- AI can search the chef's own recipe book (`recipe.search`, read-only). That's it.
- No generating, suggesting, drafting, or auto-filling recipes. Ever.
- `agent.create_recipe`, `agent.update_recipe`, `agent.add_ingredient` are permanently restricted.

---

## ZERO HALLUCINATION RULES

The app must never display information that isn't true.

1. **Every optimistic update needs try/catch with rollback.** If a server action fails, the UI must revert and show an error.
2. **Never hide failure as zero.** If data fails to load, show an error state, not `$0.00` or empty arrays.
3. **Never render non-functional features as functional.** If a button doesn't work, hide it or disable it with explanation. No empty onClick handlers.
4. **Every displayed number must come from real data.** Never hardcode financial figures.

---

## UI COMPONENT VARIANTS (USE ONLY THESE)

| Component  | Valid variants                                   |
| ---------- | ------------------------------------------------ |
| `<Button>` | `primary`, `secondary`, `danger`, `ghost`        |
| `<Badge>`  | `default`, `success`, `warning`, `error`, `info` |

`outline`, `default` (Button), `warning` (Button), `success` (Button) do NOT exist. Using them will silently fail.

---

## MONETIZATION MODEL

**All features are free.** No Pro tier, no paywalls, no locked features.

Revenue comes from voluntary supporter contributions (Stripe). Do NOT add:

- `requirePro()` gating to new code
- `<UpgradeGate>` wrappers to new code
- Pro badges, lock icons, or "upgrade to unlock" messaging

---

## NAMING CONVENTIONS

| Where          | Name              |
| -------------- | ----------------- |
| App / UI       | ChefFlow          |
| Email sender   | CheFlow           |
| package.json   | chefflow          |
| Domain         | cheflowhq.com     |
| App subdomain  | app.cheflowhq.com |
| Project folder | CFv1              |
| Tagline        | Ops for Artists   |

Different names in different places is intentional. Don't "fix" one to match another.

### tenant_id vs chef_id

Both reference `chefs(id)`. Historical naming split:

- Core tables (Layers 1-4): `tenant_id`
- Feature tables (Layer 5+): `chef_id`
- New tables: use `chef_id`
  Do NOT rename existing columns.

---

## MIGRATION SAFETY

Before creating ANY migration file:

1. List all existing files in `supabase/migrations/*.sql`
2. Pick a timestamp strictly higher than the highest existing one
3. Never reuse or guess timestamps (multiple agents may run concurrently)
4. Show the developer the full SQL before writing the file
5. All migrations are additive by default

---

## PROSPECTING IS ADMIN-ONLY

Prospecting features must NEVER appear for non-admin users. All prospecting nav items have `adminOnly: true`. All `/prospecting/*` pages have `requireAdmin()`. Any new prospecting UI must be gated behind `isAdmin`.

---

## KEY FILE LOCATIONS

| What                          | Where                             |
| ----------------------------- | --------------------------------- |
| Event FSM                     | `lib/events/transitions.ts`       |
| Ledger append                 | `lib/ledger/append.ts`            |
| Ledger compute                | `lib/ledger/compute.ts`           |
| Generated types (DO NOT EDIT) | `types/database.ts`               |
| AI providers                  | `lib/ai/providers.ts`             |
| AI dispatch                   | `lib/ai/dispatch/`                |
| Remy (AI concierge)           | `components/ai/remy-drawer.tsx`   |
| Billing/tier                  | `lib/billing/tier.ts`             |
| Module definitions            | `lib/billing/modules.ts`          |
| Embed widget                  | `public/embed/chefflow-widget.js` |

---

## GIT WORKFLOW

- Feature branches for all work: `feature/description` or `fix/description`
- Commit and push your feature branch when done
- NEVER merge to main without explicit developer approval
- NEVER force push

---

## ANTI-LOOP RULE

If you try something and it fails 3 times, STOP. Report what you tried and what failed. Let the developer decide. This applies to: build failures, search loops, permission errors, API failures, test failures.

The test: "Am I making forward progress or going in circles?" If you're seeing the same errors come back, stop.

---

## NON-BLOCKING SIDE EFFECTS

Notifications, emails, activity logs, calendar syncs are non-blocking. Always wrap in try/catch. Log failures as warnings. The main operation succeeds regardless.

```ts
// CORRECT
try {
  await sendNotification(...)
} catch (err) {
  console.error('[non-blocking] Notification failed', err)
}

// WRONG - rolls back the whole operation
await sendNotification(...)
```

---

## Persistent Operating Standard

Adopt the standards of a high-performance engineering team:

- Principal Engineer: architecture, boundaries, long-term maintainability
- Staff Engineer: implementation quality, correctness, tradeoffs, integration risk
- Security Engineer: trust boundaries, auth, secrets, injection, abuse paths
- Performance Engineer: latency, hot paths, waste, load behavior
- QA Engineer: test coverage, regression risk, edge cases

Behavior: strict, thorough, skeptical, evidence-driven. No shallow advice. Challenge weak assumptions.

Execution: build real context before concluding. Crawl relevant code paths. Keep scope to the actual task.

Output: findings first, not filler. Prioritize by severity. Concrete fixes, not vague preferences. Exact file references.

Tone: concise, direct, technical. No praise padding. No fake certainty.

---

## Skills

A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills

- `skill-creator`: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. File: `C:/Users/david/.codex/skills/.system/skill-creator/SKILL.md`
- `skill-installer`: Install Codex skills into `$CODEX_HOME/skills` from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo, including private repos. File: `C:/Users/david/.codex/skills/.system/skill-installer/SKILL.md`

### How to use skills

- Discovery: The list above is the skills available in this session. Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill, with `$SkillName` or plain text, or the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing or blocked: If a named skill is not in the list or the path cannot be read, say so briefly and continue with the best fallback.
- How to use a skill:
  1. After deciding to use a skill, open its `SKILL.md`.
  2. Read only enough to follow the workflow.
  3. When `SKILL.md` references relative paths such as `scripts/foo.py`, resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  4. If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request. Do not bulk-load everything.
  5. If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  6. If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  1. If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  2. Announce which skill or skills you're using and why in one short line. If you skip an obvious skill, say why.
- Context hygiene:
  1. Keep context small. Summarize long sections instead of pasting them, and only load extra files when needed.
  2. Avoid deep reference-chasing. Prefer opening only files directly linked from `SKILL.md` unless blocked.
  3. When variants exist such as frameworks, providers, or domains, pick only the relevant reference file or files and note that choice.
- Safety and fallback: If a skill cannot be applied cleanly because of missing files or unclear instructions, state the issue, pick the next-best approach, and continue.
