# Session Digest: Task/Todo Contract Truth Fixes

**Date:** 2026-04-12
**Agent:** Builder (Sonnet 4.6)
**Commits:** a7784a15d

---

## What Was Done

### Context

Continued from a prior session that ran MemPalace mining and found the `p1-task-and-todo-contract-truth.md` spec. That spec documented 5 confirmed live bugs where Remy AI code queried wrong DB tables or nonexistent columns for task/todo data. The prior session fixed 3 of the 5 files before running out of context.

### Fixes Applied (All 5 Files)

**`chef_todos` schema (confirmed):** `id, chef_id, text, completed, completed_at, sort_order, created_at, created_by` - nothing else. No `title`, `due_date`, `priority`, `status`.

**`tasks` schema (confirmed):** `id, chef_id, title, description, due_date, priority, status, notes, ...` - the full structured task table.

1. **`lib/ai/remy-context.ts`** - Was selecting `title, due_date, priority, status` from `chef_todos` (none exist). Fixed to `text, completed, sort_order`. Updated mapping from `t.title` to `t.text`.

2. **`lib/ai/remy-intelligence-actions.ts`** - Was querying `.from('todos')` (table does not exist). Fixed to `.from('tasks')`.

3. **`components/dashboard/quick-create-strip.tsx`** - Todo quick-create button linked to `/todos` (route does not exist). Fixed to `/tasks`.

4. **`lib/ai/agent-actions/briefing-actions.ts`** - Was querying `chef_todos` for "overdue todos" with `id, title, due_date, priority` and `.eq('tenant_id', ...)` scope. None of those columns exist on `chef_todos`. Fixed to `tasks` table with `chef_id` scope.

5. **`lib/ai/agent-actions/operations-actions.ts`** - Was inserting into `chef_todos` with `title, due_date, priority, notes, status, tenant_id`. None of those columns exist on `chef_todos`. Fixed to `tasks` table with correct column names including `chef_id`.

### Spec Updated

`docs/specs/p1-task-and-todo-contract-truth.md` status changed from `ready` to `built`.

---

## Current State

- TSC clean (0 errors) after all 5 fixes
- Remy will no longer silently receive empty todo context
- Remy create-todo action will no longer silently fail on DB insert
- Quick-create strip Todo button now routes to the correct page

---

## What the Next Agent Should Know

- `chef_todos` = lightweight checkbox list. Only: `text, completed, sort_order, chef_id`. No dates, no priority, no status.
- `tasks` = structured task table (due dates, priority, status, assignment). Uses `chef_id` for scoping (not `tenant_id`).
- `/tasks` is the correct route for the task board. `/todos` does not exist.
- The spec `p1-task-and-todo-contract-truth.md` is now `built`. Needs Playwright verification to move to `verified`.
- MemPalace backlog in `memory/project_mempalace_backlog.md` still has ~35 open items from the April 11 sweep.
