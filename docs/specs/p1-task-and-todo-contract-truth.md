# Spec: Task and Todo Contract Truth

> **Status:** built
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** medium-large (8-12 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Operate as a senior systems architect and product engineer inside this repository.
- Determine exactly what exists, what works, what is broken, what is assumed, and what is missing.
- Gap identification: explicitly identify incomplete workflows, UI surfaces that imply functionality but lack backend support, backend logic that has no UI, and data models that are defined but not enforced or used.
- Do not assume the system is complete.
- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.

### Developer Intent

- **Core goal:** stop ChefFlow from mixing up structured tasks, lightweight todos, AI task context, and task navigation so the product has one truthful contract for each.
- **Key constraints:** do not delete the existing dashboard reminder widget blindly, do not invent a brand-new task system, and do not collapse every reminder/automation into one table without preserving intent.
- **Motivation:** the current codebase already has a real `/tasks` system and a real `chef_todos` reminder system, but some route and AI surfaces behave as if there is a third system or as if both tables share the same schema.
- **Success from the developer's perspective:** a builder can say exactly what `/tasks` owns, what `chef_todos` owns, which AI surfaces use which data source, and no route or query points to nonexistent task surfaces or nonexistent columns.

---

## What This Does (Plain English)

This spec makes ChefFlow's task language honest. After it is built, structured operational tasks will consistently flow through the real `tasks` system, lightweight dashboard reminders will stay in `chef_todos` only where that is intentional, and AI / quick-action surfaces will stop pointing to nonexistent routes, nonexistent fields, or nonexistent tables.

---

## Why It Matters

The current repo already has enough task infrastructure to be useful. What is broken is the contract between routes, tables, and AI helpers. That kind of drift produces invisible failures and makes the system feel less complete than it actually is.

---

## Current State (What Already Exists)

### Verified structured task system

- `/tasks` is a real chef-facing page backed by `lib/tasks/actions.ts`.
- The `tasks` table supports title, description, due date, due time, priority, status, assignment, recurrence, and completion tracking.
- Morning briefing data already reads from `tasks`.

### Verified lightweight todo system

- `chef_todos` exists as a smaller dashboard-style reminder table with only `text`, `completed`, `completed_at`, `sort_order`, `created_at`, and `created_by`.
- The dashboard todo widget and daily-ops loader use `lib/todos/actions.ts` and this smaller schema.
- Some automations also create lightweight `chef_todos` reminders.

### Verified contract drift

- `components/dashboard/quick-create-strip.tsx` links to `/todos`, which does not exist.
- `lib/ai/agent-actions/operations-actions.ts` inserts into `chef_todos` after parsing structured fields like `title`, `due_date`, and `priority`.
- `lib/ai/agent-actions/briefing-actions.ts` reads `chef_todos` but formats rows as if they had `title` and `due_date`.
- `lib/ai/remy-context.ts` selects `title, due_date, priority, status` from `chef_todos`, which does not match the schema.
- `lib/ai/remy-intelligence-actions.ts` queries a nonexistent `todos` table.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/dashboard/quick-create-strip.tsx`                              | Point task-oriented quick actions at the real `/tasks` route instead of nonexistent `/todos`.                                                |
| `lib/ai/agent-actions/operations-actions.ts`                               | Make `agent.create_todo` follow the canonical contract: structured task requests create records in `tasks`, not malformed `chef_todos` rows. |
| `lib/ai/agent-actions/briefing-actions.ts`                                 | Read actionable overdue work from the canonical structured task source instead of formatting nonexistent `chef_todos` fields.                |
| `lib/ai/remy-context.ts`                                                   | Stop selecting nonexistent task fields from `chef_todos`; expose structured tasks and lightweight reminders truthfully.                      |
| `lib/ai/remy-intelligence-actions.ts`                                      | Replace the nonexistent `todos` table query with the canonical structured task source.                                                       |
| `lib/ai/remy-types.ts`                                                     | Update task/todo context typing if needed so the AI contract matches the new source truth.                                                   |
| `lib/ai/command-task-descriptions.ts`                                      | Align task-related command copy with the canonical task/reminder distinction if the wording currently over-promises.                         |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Reference this spec as the operator task/todo closure lane.                                                                                  |

Optional only if builder finds the distinction unclear in UI copy:

| File                                        | What to Change                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `app/(chef)/tasks/page.tsx`                 | Clarify page copy if needed so `/tasks` is visibly the structured task home.                          |
| `components/dashboard/chef-todo-widget.tsx` | Adjust copy from generic "task" language to "reminder" or "todo" language only if needed for clarity. |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- This slice is about source-of-truth alignment, not schema expansion.
- Do not add due-date or priority columns to `chef_todos` just to excuse the current drift unless the builder proves that preserving the lightweight reminder model is impossible otherwise.

---

## Data Model

### Canonical distinction

- `tasks`
  - structured operational work
  - supports due dates, priority, status, assignment, recurrence
  - canonical source for AI task intelligence and overdue-action views
- `chef_todos`
  - lightweight personal reminders / checklist items
  - simple dashboard widget and lightweight automation reminders
  - not a full structured task system

### Required invariants

- No route may point to `/todos` as if it is a real standalone task page.
- No query may select `title`, `due_date`, `priority`, or `status` from `chef_todos` unless those fields are actually added first, which this spec does not do.
- No code may query a bare `todos` table unless that table exists, which it does not today.
- AI and briefing surfaces that promise overdue tasks or scheduled work must read from `tasks`.

---

## Server Actions

No brand-new route-level server action is required if the builder can reuse the existing task actions.

| Action / Helper                                 | Auth            | Input                        | Output                   | Side Effects                               |
| ----------------------------------------------- | --------------- | ---------------------------- | ------------------------ | ------------------------------------------ |
| existing `createTask(input)`                    | `requireChef()` | structured task payload      | task row                 | Revalidates `/tasks`                       |
| existing todo helpers in `lib/todos/actions.ts` | `requireChef()` | lightweight reminder payload | todo row / toggle result | Revalidates dashboard / daily-ops surfaces |

Builder note:

- Prefer composing with `createTask()` for structured AI-created work.
- Keep `chef_todos` helpers intact for the dashboard reminder widget unless the builder finds a current broken consumer that requires copy-only clarification.

---

## UI / Component Spec

### Page Layout

- `/tasks` remains the structured task home.
- Dashboard reminder surfaces may remain as a separate lighter layer.
- Quick-create and AI language must not blur those two surfaces into one fake shared contract.

### States

- **Loading:** unchanged.
- **Empty:** `/tasks` and dashboard reminders keep their current empty states, but copy should not imply the other system is empty too.
- **Error:** task/todo fetch failures should stay honest; never show fake overdue counts or task lists built from nonexistent fields.
- **Populated:** structured tasks show due date / priority / status; lightweight reminders show only the smaller reminder schema.

### Interactions

- Clicking the task quick action takes the chef to `/tasks`.
- AI-created structured work should appear on `/tasks` after refresh.
- Morning-briefing and Remy task summaries should describe real structured task records.
- Lightweight dashboard reminders should continue to behave like reminders, not pseudo-tasks with missing metadata.

---

## Edge Cases and Error Handling

| Scenario                                                            | Correct Behavior                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| AI request contains a due date / priority                           | Treat it as a structured task and write through the `tasks` system.                                               |
| AI request is a very lightweight reminder with no scheduling detail | Builder may keep it in `chef_todos` only if the contract stays explicit and typed correctly.                      |
| Existing automation creates `chef_todos` reminders                  | Preserve it for now if it is intentionally lightweight; do not silently migrate without verifying product intent. |
| Dashboard reminder widget is empty but `/tasks` has items           | Keep both truths separate. Do not show fake combined totals.                                                      |
| A helper still expects a `todos` table                              | Replace it with the canonical source or remove the dead assumption in this slice.                                 |

---

## Verification Steps

1. Sign in as a chef user.
2. Click the task quick action from the dashboard quick-create strip.
3. Verify: it opens `/tasks`, not a 404 / nonexistent `/todos` route.
4. Ask the AI assistant to create a dated or prioritized task.
5. Verify: the created item appears in `/tasks` with the expected due date / priority.
6. Trigger the morning-briefing / task-summary flow that previously referenced overdue todos.
7. Verify: task summaries render real structured task data and do not reference missing fields.
8. Exercise the dashboard reminder widget.
9. Verify: lightweight reminders still create, toggle, and delete correctly.
10. Refresh the relevant pages and confirm the task/reminder state persists with no console/runtime errors.

---

## Out of Scope

- Replacing the dashboard reminder widget with the full task board.
- Migrating every existing `chef_todos` automation into `tasks`.
- Large task-management feature expansion such as real-time updates or recurrence redesign.
- Staff task UX beyond preserving existing structured-task correctness.

---

## Notes for Builder Agent

- This spec is about contract truth first, not feature maximization.
- Be strict about the difference between structured tasks and lightweight reminders.
- Search for any additional task-language AI helpers before closing the slice; fix only the ones that participate in the current broken contract.
- If the builder finds that one path still truly needs a `/todos` alias for compatibility, document why before adding it. Do not add compatibility routes casually.
