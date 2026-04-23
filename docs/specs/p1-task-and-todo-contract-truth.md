# Spec: Task and Todo Contract Truth

> **Status:** verified
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** medium-large (8-12 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Claimed (in-progress) | 2026-04-22 13:58 EDT | Builder (Codex) |        |
| Spike completed       | 2026-04-22 14:28 EDT | Builder (Codex) |        |
| Build completed       | 2026-04-22 15:22 EDT | Builder (Codex) |        |
| Type check passed     | 2026-04-22 15:31 EDT | Builder (Codex) |        |
| Playwright verified   | 2026-04-22 18:05 EDT | Builder (Codex) |        |
| Follow-up closed      | 2026-04-22 20:53 EDT | Builder (Codex) |        |
| Status: verified      | 2026-04-22 18:11 EDT | Builder (Codex) |        |

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

## Current State (Verified After Build)

### Verified structured task system

- `/tasks` is a real chef-facing page backed by `lib/tasks/actions.ts`.
- The `tasks` table supports title, description, due date, due time, priority, status, assignment, recurrence, and completion tracking.
- Morning briefing data already reads from `tasks`.

### Verified lightweight todo system

- `chef_todos` exists as a smaller dashboard-style reminder table with only `text`, `completed`, `completed_at`, `sort_order`, `created_at`, and `created_by`.
- The dashboard todo widget and daily-ops loader use `lib/todos/actions.ts` and this smaller schema.
- Some automations also create lightweight `chef_todos` reminders.

### Verified contract truth

- The dashboard quick-create strip already routes task-oriented creation to `/tasks`.
- `agent.create_todo` now creates structured work through `tasks`, revalidates `/tasks`, and redirects back to the real task board.
- Morning briefing, proactive overdue-task lookups, and Remy task summaries all read structured work from `tasks` with `chef_id` plus real `status`, `due_date`, and `priority` fields.
- Workflow reminder completion stays on `chef_todos`, now using the canonical todo helpers and a reminder-text matcher instead of pretending reminders have structured task columns.
- Remy prompt assembly now labels the structured work section as `TASK LIST`, matching the actual source.
- The `/tasks` create panel now submits through the canonical `createTask()` path from a server-rendered form, so creation no longer depends on the page hydrating before the chef can save work.
- Failed `/tasks` creates now redirect back to the same canonical create URL with a real error message and the chef's draft preserved instead of silently resetting or faking success.

---

## Files to Create

| File                                    | Why It Exists                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/todos/match.ts`                    | Shared reminder-text matching helper so workflow completion can stay on `chef_todos` honestly. |
| `tests/unit/task-todo-contract.test.ts` | Drift guard for the canonical task/reminder split and the failure path on unmatched reminders. |

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/agent-actions/operations-actions.ts`                               | Make `agent.create_todo` follow the canonical contract: structured task requests create records in `tasks`, not malformed `chef_todos` rows. |
| `lib/ai/agent-actions/briefing-actions.ts`                                 | Read actionable overdue work from the canonical structured task source instead of formatting nonexistent `chef_todos` fields.                |
| `lib/ai/agent-actions/proactive-actions.ts`                                | Read overdue structured work from `tasks`, not `chef_todos`.                                                                                 |
| `lib/ai/agent-actions/workflow-actions.ts`                                 | Keep reminder completion on `chef_todos` through the real todo helpers and reminder-text matching.                                           |
| `lib/ai/remy-context.ts`                                                   | Stop selecting nonexistent task fields from `chef_todos`; expose structured tasks and lightweight reminders truthfully.                      |
| `lib/ai/remy-intelligence-actions.ts`                                      | Replace the nonexistent `todos` table query with the canonical structured task source.                                                       |
| `lib/ai/remy-types.ts`                                                     | Update task/todo context typing if needed so the AI contract matches the new source truth.                                                   |
| `app/api/remy/stream/route-prompt-utils.ts`                                | Label the structured Remy work block as tasks instead of todos.                                                                              |
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
- Workflow reminder completion now reuses `getTodos()` plus `toggleTodo()` and fails closed when no reminder text matches.

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

1. Run the focused typecheck against the touched files with a temporary tsconfig.
2. Run `node --test --import tsx tests/unit/task-todo-contract.test.ts`.
3. Verify the failure path: unmatched reminder text returns `null` and workflow completion reports `No open reminders match that description.`
4. Run `graphify update .` after the slice lands.
5. Start an isolated local server and authenticate a seeded chef through `/api/e2e/auth`.
6. Open `/tasks` in Playwright and verify the page renders `Tasks`, `No tasks`, and the `New Task` modal without route or runtime failure.
7. Follow-up closed on 2026-04-22: the canonical `/tasks` create form now persists real `tasks` rows through `createTask()`, survives refresh on the selected date, and keeps the draft open with an honest validation error when creation fails.

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
- This slice is closed. Future task/reminder work should extend the current owners instead of reopening a second contract layer.
