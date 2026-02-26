# Phase 1 — Database Reset, Schema Lock & Project Cleanup

**Date:** 2026-02-16
**Phase:** 1 of N
**Status:** Complete

## What Changed

### TASK 1: 8-State Event FSM (Layer 3 Migration)

**File:** `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql`

The `event_status` enum was upgraded from a 4-state model to an 8-state model that matches the master document's full event lifecycle:

| Old (4-state) | New (8-state)        |
| ------------- | -------------------- |
| upcoming      | draft                |
| —             | proposed             |
| —             | accepted             |
| —             | paid                 |
| —             | confirmed            |
| in_progress   | in_progress          |
| completed     | completed            |
| canceled      | cancelled (double-l) |

**Changes made:**

- Replaced `event_status` enum with 8 values: `draft`, `proposed`, `accepted`, `paid`, `confirmed`, `in_progress`, `completed`, `cancelled`
- Updated `validate_event_state_transition()` trigger to enforce the new transition map:
  - `draft` -> `proposed` | `cancelled`
  - `proposed` -> `accepted` | `cancelled`
  - `accepted` -> `paid` | `cancelled`
  - `paid` -> `confirmed` | `cancelled`
  - `confirmed` -> `in_progress` | `cancelled`
  - `in_progress` -> `completed` | `cancelled`
  - `completed` -> terminal (no transitions)
  - `cancelled` -> terminal (no transitions)
- Changed events table default status from `'upcoming'` to `'draft'`
- Fixed `client_financial_summary` view reference from `'canceled'` (single-l) to `'cancelled'` (double-l)
- Updated status column comment to describe the 8-state FSM

**Why:** The 4-state model skipped the entire proposal-acceptance-payment pipeline. Events appeared "out of nowhere" as `upcoming`. The 8-state model captures the real lifecycle from inquiry conversion through execution.

### TASK 2: event_menus Junction Table

**Result:** No action needed. The `event_menus` junction table only existed in the archived old schema (`supabase/migrations/archive/`). The active Layer 4 migration correctly uses `menus.event_id` (nullable FK) for one-menu-per-event with template support.

### TASK 3: Database Reset

**Command:** `npx supabase db reset --linked`

**Issues discovered and fixed during reset:**

1. **Forward-reference in Layer 4:** Tables were defined in wrong order — `components` referenced `recipes` before it was created, `recipe_ingredients` referenced `ingredients` before it was created. Fixed by reordering to: menus -> menu_state_transitions -> dishes -> **recipes** -> **ingredients** -> **recipe_ingredients** -> **components**.

2. **Duplicate index:** Layer 2 created `idx_messages_event`, and Layer 3 tried to recreate it with a WHERE clause. Removed the duplicate from Layer 3.

3. **Missing client columns:** Layer 3 triggers reference `total_payments_received_cents`, `first_event_date`, and `last_event_date` on the `clients` table, but these columns weren't defined in Layer 1. Added them via `ALTER TABLE` in Layer 3's cross-layer additions section.

4. **Wrong column name in RLS policies:** Layer 3 and Layer 4 RLS policies referenced `client_id FROM user_roles` and `user_id`, but the actual columns are `entity_id` and `auth_user_id`. Fixed all occurrences.

**Result:** All 4 migrations applied cleanly with no errors.

### TASK 4: TypeScript Type Regeneration

**Command:** `npx supabase gen types typescript --project-id luefkpakzvxcsqroxyhz > types/database.ts`

**Verified:**

- 23 tables present (all expected tables)
- `event_status` enum has exactly 8 values
- `menus.event_id` exists and is nullable
- No `event_menus` table
- Full menu hierarchy: dishes, components, recipes, recipe_ingredients, ingredients
- All operational tables: inquiries, quotes, expenses, after_action_reviews, messages, response_templates

### TASK 5: Archive Migration Isolation

Confirmed: Only the 4 files directly in `supabase/migrations/` were applied. The `archive/` subdirectory was ignored by the Supabase CLI.

### TASK 6: Documentation Cleanup

- Deleted `docs/archive/` directory (superseded by canonical master documents)
- Deleted 28 top-level MD files (API_REFERENCE.md through VERIFICATION_GUIDE.md)
- Kept: `README.md`, `chefflow-master-document (1).md`
- Kept: 14 files in `docs/` directory for later pruning

## Verification Checklist

- [x] Layer 3 migration has 8-state `event_status` enum
- [x] Layer 3 migration has updated `validate_event_state_transition()` trigger
- [x] Events table defaults to `status = 'draft'`
- [x] No `event_menus` junction table exists in any active migration
- [x] `supabase db reset --linked` completed without errors
- [x] All 4 migrations applied successfully
- [x] `types/database.ts` regenerated from live schema
- [x] Generated types include all 23 tables
- [x] Generated types show 8-state event_status enum
- [x] Generated types show relational menu hierarchy (dishes, components, recipes, ingredients)
- [x] Generated types show NO event_menus junction table
- [x] `docs/archive/` deleted
- [x] Top-level MD files deleted (except README.md and master doc copy)
- [x] App code has expected type errors (will be fixed in Phase 3)

## Connection to System Architecture

This phase establishes the **migration files as the single source of truth** for the database schema. The generated `types/database.ts` is a pure derivative — never manually edited. The 8-state event FSM now aligns the database layer with the application's transition logic in `lib/events/transitions.ts`, eliminating the schema mismatch that was the root cause of this overhaul.

## Additional Fixes (Not Originally Scoped)

These were necessary to get migrations to apply cleanly:

1. **Layer 4 table ordering** — Forward references would have caused migration failure
2. **Missing client columns** — Triggers would have failed at runtime without `total_payments_received_cents`, `first_event_date`, `last_event_date`
3. **RLS column name fixes** — `user_roles.entity_id` vs incorrect `user_roles.client_id`, and `auth_user_id` vs incorrect `user_id`
4. **Duplicate index removal** — `idx_messages_event` created in both Layer 2 and Layer 3
