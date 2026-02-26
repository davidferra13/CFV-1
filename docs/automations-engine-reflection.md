# Automations Engine — Phase 3 Reflection

## What Changed

Added a deterministic, chef-authored rule engine. Chefs can create automation rules that fire when specific events occur in the system — new inquiries, status changes, Wix submissions, approaching events, stale conversations.

## Why

Wix provides "Automations" — if/then rules like "when a form is submitted, send me a notification" or "when a client hasn't responded in 3 days, create a follow-up task." ChefFlow now has the same capability, but scoped to the catering workflow: inquiry pipeline events, event lifecycle transitions, and time-based triggers.

## AI Policy Compliance

Automations are **deterministic, chef-authored rules** — not AI decisions. This is a critical distinction:

- Rules are explicit if/then logic the chef defines
- `send_template_message` creates **drafts** that require chef approval before sending — it never auto-sends
- `create_notification` and `create_follow_up_task` are internal actions (no client-facing side effects)
- Litmus test passes: unplug AI → automations still fire because they're deterministic

## Architecture

### Trigger → Condition → Action Pipeline

```
Event Occurs (inquiry created, status changed, etc.)
  └─ evaluateAutomations(tenantId, triggerEvent, context)
      └─ Find active rules matching this trigger
          └─ Evaluate conditions (JSONB, AND logic)
              └─ Execute action (notification, follow-up, draft, note)
                  └─ Log execution (immutable audit trail)
```

### Trigger Points (where evaluateAutomations is called)

| File                                               | Trigger                                                         | When                             |
| -------------------------------------------------- | --------------------------------------------------------------- | -------------------------------- |
| `lib/inquiries/actions.ts` → `createInquiry()`     | `inquiry_created`                                               | Chef manually creates an inquiry |
| `lib/inquiries/actions.ts` → `transitionInquiry()` | `inquiry_status_changed`                                        | Inquiry moves between states     |
| `lib/events/transitions.ts` → `transitionEvent()`  | `event_status_changed`                                          | Event moves between states       |
| `lib/wix/process.ts` → `processWixSubmission()`    | `wix_submission_received`                                       | Wix form processed into inquiry  |
| `app/api/scheduled/automations/route.ts`           | `follow_up_overdue`, `no_response_timeout`, `event_approaching` | Cron (every 15 min)              |

### Condition Evaluation

Conditions are stored as JSONB arrays. Each condition has:

- `field` — dot-path into the context fields (e.g., `status`, `channel`, `days_since_last_contact`)
- `op` — comparison operator (`eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `contains`, `in`)
- `value` — expected value

All conditions are AND-evaluated. Empty conditions array = always match.

### Action Types

| Action                  | What It Does                                          | Client-Facing?  |
| ----------------------- | ----------------------------------------------------- | --------------- |
| `create_notification`   | Creates a chef notification                           | No              |
| `create_follow_up_task` | Sets `follow_up_due_at` on the inquiry                | No              |
| `send_template_message` | Creates a **draft** message + notifies chef to review | No (draft only) |
| `create_internal_note`  | Creates an `internal_note` message on the inquiry     | No              |

### Template Interpolation

Action configs support `{{field_name}}` placeholders that get replaced with context field values at execution time. For example:

```
"New inquiry from {{client_name}} via {{channel}}"
→ "New inquiry from Jane Smith via wix"
```

## Files Created

| File                                                   | Purpose                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `supabase/migrations/20260221000018_automations.sql`   | Schema: `automation_rules` + `automation_executions`        |
| `lib/automations/types.ts`                             | TypeScript types + trigger/action label constants           |
| `lib/automations/conditions.ts`                        | Condition evaluation logic                                  |
| `lib/automations/action-handlers.ts`                   | Per-action execution (notification, follow-up, draft, note) |
| `lib/automations/engine.ts`                            | Core `evaluateAutomations()` function                       |
| `lib/automations/actions.ts`                           | CRUD server actions for rules + execution log queries       |
| `app/api/scheduled/automations/route.ts`               | Cron for time-based triggers (every 15 min)                 |
| `app/(chef)/settings/automations/page.tsx`             | Rule management page (server component)                     |
| `app/(chef)/settings/automations/automations-list.tsx` | Rule list + builder toggle (client component)               |
| `components/automations/rule-builder.tsx`              | Trigger + condition + action form builder                   |
| `components/automations/execution-log.tsx`             | Execution log viewer                                        |

## Files Modified

| File                           | Change                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `lib/inquiries/actions.ts`     | Added `evaluateAutomations()` call in `createInquiry()` and `transitionInquiry()` |
| `lib/events/transitions.ts`    | Added `evaluateAutomations()` call in `transitionEvent()`                         |
| `lib/wix/process.ts`           | Added `evaluateAutomations()` call after Wix submission processing                |
| `app/(chef)/settings/page.tsx` | Added Automations link in Communication section                                   |

## How It Connects

```
Chef Actions (create inquiry, transition status, etc.)
  └─ evaluateAutomations() [non-blocking, try-catch wrapped]
      └─ Query automation_rules WHERE trigger = X AND is_active
          └─ evaluateConditions(rule.conditions, context.fields)
              └─ executeAction(rule, context)
                  └─ INSERT automation_executions (audit log)

Cron Job (every 15 min)
  └─ Query inquiries with overdue follow-ups
  └─ Query inquiries with no response > 3 days
  └─ Query events approaching within 48h
      └─ evaluateAutomations() for each match

Settings UI
  └─ /settings/automations
      └─ Rule list (toggle active/paused, delete)
      └─ Rule builder (trigger, conditions, action)
      └─ Execution log (audit trail)
```

## Non-Blocking Pattern

All `evaluateAutomations()` calls are wrapped in try-catch and use dynamic imports. Failures are logged but never thrown — automation failures must never break the primary action (creating an inquiry, transitioning an event, etc.).

```typescript
try {
  const { evaluateAutomations } = await import('@/lib/automations/engine')
  await evaluateAutomations(tenantId, 'inquiry_created', { ... })
} catch (err) {
  console.error('[createInquiry] Automation evaluation failed (non-blocking):', err)
}
```

## Future Enhancements

- Default seed rules for new chefs (notify on new Wix lead, follow up after 3 days, alert 48h before event)
- Rule templates library (pre-built rules chefs can enable with one click)
- Integration with activity tracking (trigger rules on client portal engagement)
- Webhook action type (POST to external URL for advanced integrations)
- Rate limiting per rule (max fires per hour/day)
