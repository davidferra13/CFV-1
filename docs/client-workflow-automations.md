# Client-Facing Workflow Automations

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## What Was Built

A multi-step workflow automation engine tied to ChefFlow's 8-state event FSM. Inspired by HoneyBook's Automations 2.0 and Perfect Venue's stage-triggered emails.

## Architecture

The workflow system is layered on top of the existing automation infrastructure:

```
Existing (unchanged):
  automation_rules      - Single-step trigger-action rules
  automated_sequences   - Email drip campaigns (birthday, dormant, etc.)
  chef_automation_settings - Per-chef toggles for built-in automations

New:
  workflow_templates    - Multi-step workflow blueprints
  workflow_steps        - Ordered steps with delays, conditions, actions
  workflow_executions   - Per-entity enrollment tracking
  workflow_execution_log - Immutable audit trail
```

## Database Tables

Migration: `supabase/migrations/20260330000095_client_workflow_automations.sql`

- **workflow_templates**: Reusable workflow blueprints with trigger type and config
- **workflow_steps**: Individual steps (delay, condition, action) within a workflow
- **workflow_executions**: Tracks which workflows are running for which entities
- **workflow_execution_log**: Immutable audit trail of each step executed

All tables have RLS policies for chef + service_role access.

## Trigger Types

| Trigger               | When It Fires                        |
| --------------------- | ------------------------------------ |
| `event_stage_changed` | Event transitions between FSM states |
| `inquiry_created`     | New inquiry is created               |
| `quote_sent`          | Quote/proposal sent to client        |
| `quote_viewed`        | Client views the proposal            |
| `contract_signed`     | Client signs contract                |
| `payment_received`    | Stripe webhook confirms payment      |
| `days_before_event`   | Cron fires at 7, 2, 1 day milestones |
| `days_after_event`    | Cron fires after event completion    |

## Action Types

| Action                  | What It Does                                        |
| ----------------------- | --------------------------------------------------- |
| `send_email`            | Creates a draft email (chef reviews before sending) |
| `create_task`           | Adds a chef todo                                    |
| `create_notification`   | Push notification to chef                           |
| `update_event_status`   | Transition event FSM (system transition)            |
| `send_feedback_request` | Creates and sends a post-event survey               |
| `send_payment_reminder` | Drafts a payment reminder email                     |

## Condition Types

| Condition          | What It Checks                       |
| ------------------ | ------------------------------------ |
| `quote_accepted`   | Has client accepted the quote?       |
| `contract_signed`  | Has client signed the contract?      |
| `payment_complete` | Is event fully paid?                 |
| `has_responded`    | Has client sent any inbound message? |

All conditions support `negate: true` to invert the check.

## Default Workflows (4)

1. **New Inquiry Follow-Up**: Welcome email immediately, follow-up if no response in 3 days
2. **Proposal Follow-Up**: Reminder after 2 days, final follow-up + task after 7 days
3. **Pre-Event Reminders**: "Looking forward" at 7 days, payment reminder at 2 days (if unpaid), confirmation at 1 day
4. **Post-Event Follow-Up**: Thank you (1 day), feedback request (3 days), rebook outreach (14 days)

## Files Created

| File                                   | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `lib/automations/workflow-engine.ts`   | Core engine: trigger processing, step execution, cron sweep |
| `lib/automations/workflow-types.ts`    | Type definitions for all workflow entities                  |
| `lib/automations/workflow-utils.ts`    | Shared utilities (template interpolation)                   |
| `lib/automations/default-workflows.ts` | Default workflow definitions + seeder                       |
| `lib/automations/workflow-actions.ts`  | Server actions for CRUD, listing, seeding                   |

## Integration Points

- **Event transitions** (`lib/events/transitions.ts`): Fires `event_stage_changed` trigger, cancels active workflows on event cancellation
- **Inquiry creation** (`lib/inquiries/actions.ts`): Fires `inquiry_created` trigger
- **Quote sending** (`lib/quotes/actions.ts`): Fires `quote_sent` trigger
- **Cron job** (`app/api/scheduled/automations/route.ts`): Processes delayed steps, fires `days_before_event` triggers

## Key Design Decisions

1. **Emails are drafted, not auto-sent.** AI Policy compliance: all outbound communication requires chef approval. The workflow creates draft messages and notifies the chef to review.

2. **Deduplication via UNIQUE constraint.** A workflow can only be enrolled once per entity (template_id + entity_id). Prevents double-enrollments from retries or race conditions.

3. **Non-blocking throughout.** All workflow processing is wrapped in try/catch. A workflow failure never breaks the main operation (event transition, inquiry creation, etc.).

4. **System workflows are undeletable.** Default workflows are marked `is_system: true`. Chefs can deactivate them but not delete them. Custom workflows can be fully deleted.

5. **Immediate execution for zero-delay steps.** Steps with `delay_hours: 0` execute immediately in the same request. Steps with delays are scheduled and picked up by the cron sweep.
