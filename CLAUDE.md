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

---

## ARCHITECTURE REMINDERS

These are the established patterns. Follow them — don't reinvent.

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

| What | Where |
|---|---|
| Event FSM | `lib/events/transitions.ts` |
| Ledger append | `lib/ledger/append.ts` |
| Ledger compute | `lib/ledger/compute.ts` |
| Chef dashboard | `app/(chef)/dashboard/page.tsx` |
| Event form | `components/events/event-form.tsx` |
| Event transitions UI | `components/events/event-transitions.tsx` |
| Schema Layer 1 | `supabase/migrations/20260215000001_layer_1_foundation.sql` |
| Schema Layer 2 | `supabase/migrations/20260215000002_layer_2_inquiry_messaging.sql` |
| Schema Layer 3 | `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql` |
| Schema Layer 4 | `supabase/migrations/20260215000004_layer_4_menus_recipes_costing.sql` |
| Generated types | `types/database.ts` (never edit manually) |

---

## DATABASE

- No local Supabase (no Docker) — use remote with `--linked` flag
- Project ID: `luefkpakzvxcsqroxyhz`
- Cross-layer columns added via `ALTER TABLE` (e.g., Layer 3 adds columns to `clients`)
