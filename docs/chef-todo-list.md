# Chef To Do List

## What changed

Added a manual, free-form To Do List widget to the chef dashboard. Chefs can now type in arbitrary tasks, check them off as done, and delete them — independently of the automated Priority Queue or Preparable Work Engine.

## Why

The existing task systems (Preparable Work Engine, Priority Queue) are fully automated — derived from event state and system signals. There was no place for a chef to write down personal tasks like "call supplier", "buy a new whisk", or "follow up with Sarah about her dietary notes". This fills that gap.

## Files created / modified

| File                                                | What                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `supabase/migrations/20260228000004_chef_todos.sql` | New `chef_todos` table with RLS                                             |
| `lib/todos/actions.ts`                              | Server actions: `getTodos`, `createTodo`, `toggleTodo`, `deleteTodo`        |
| `components/dashboard/chef-todo-widget.tsx`         | Interactive client component (add, check, delete)                           |
| `lib/scheduling/types.ts`                           | Added `'todo_list'` to `DASHBOARD_WIDGET_IDS` and `DASHBOARD_WIDGET_LABELS` |
| `app/(chef)/dashboard/page.tsx`                     | Imports widget + fetches todos + renders section                            |

## Database schema

```sql
CREATE TABLE chef_todos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  text         TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 500),
  completed    BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID        NOT NULL REFERENCES auth.users(id)
);
```

- Fully tenant-scoped via `chef_id`
- RLS: chef can only SELECT / INSERT / UPDATE / DELETE their own rows
- Additive migration only — no existing tables modified

## How it works

1. **Dashboard page** fetches `getTodos()` server-side and passes `initialTodos` to the widget.
2. **`ChefTodoWidget`** is a `'use client'` component using `useState` for optimistic updates (React 18 compatible — `useOptimistic` is React 19 only and is not used here).
3. **Add flow**: todo appears immediately with a temp ID; after `createTodo` returns the real database ID, the temp ID is swapped in-place. This ensures subsequent toggle/delete on the same item work correctly.
4. **Toggle/delete**: applied instantly to local state; original snapshot is restored if the server action fails.
5. **Server actions** return `{ success, id? }` and call `revalidatePath('/dashboard')` so stale data is cleared for the next navigation.
6. **Sort order**: incomplete items appear first (sorted by `sort_order` then `created_at`). Completed items sink to the bottom with a strikethrough.

## Widget system integration

`'todo_list'` is a full member of the `DASHBOARD_WIDGET_IDS` array. Chefs can toggle it on/off from the Dashboard Quick Settings panel (the gear icon in the header). It renders after the Hours widget by default.

## What this is NOT

- Not a project management system — no due dates, priorities, or assignments
- Not connected to events — tasks here are personal/manual, not derived from event state
- Not shared with clients
