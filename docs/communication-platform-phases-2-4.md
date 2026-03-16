# Communication Platform - Phases 2-4 Implementation

## Overview

Phases 2-4 of the Communication Platform add collaboration, financial automation, and scale features to ChefFlow's communication infrastructure.

## Phase 2: Collaboration Layer

### New Tables
- **response_templates** - Reusable message templates (email/sms/app) with categories, variables, usage tracking
- **menu_revisions** - Version-tracked menu proposals with status workflow (draft > pending_review > approved/rejected)
- **menu_dish_feedback** - Per-dish client feedback on menu revisions (approved/flagged/pending)
- **guest_count_changes** - Audit log for guest count modifications with cost impact tracking
- **payment_milestones** - Per-event payment schedule with status tracking and reminder support

### Server Actions
- `lib/communication/template-actions.ts` - CRUD for response templates, usage tracking
- `lib/communication/menu-revision-actions.ts` - Create/approve/reject menu revisions with auto-versioning
- `lib/communication/guest-change-actions.ts` - Request and approve guest count changes, auto-updates event
- `lib/communication/payment-milestone-actions.ts` - Create milestones, mark paid, send reminders

## Phase 3: Financial Automation

### New Tables
- **follow_up_sequences** - Multi-step automated outreach (post_event/dormant_client/milestone triggers)
- **post_event_surveys** - Structured feedback with 7 rating dimensions, dish-level feedback, review gating

### Server Actions
- `lib/communication/follow-up-actions.ts` - CRUD for sequences, toggle active/inactive, query by trigger
- `lib/communication/survey-actions.ts` - Create surveys, submit responses (token-based, no auth required), aggregate results, request reviews

## Phase 4: Scale Features

### New Tables
- **scheduled_messages** - Send-later queue with status tracking, template integration, context linking
- **automation_rules** - Trigger-based workflow rules (8 trigger events, condition matching, multi-action execution)

### Server Actions
- `lib/communication/scheduled-message-actions.ts` - Schedule, cancel, reschedule messages with validation
- `lib/communication/automation-actions.ts` - CRUD for rules, toggle, execute with non-blocking action handling

## Migration Files
- `20260307000001_communication_collaboration.sql` - Phase 2 tables
- `20260307000002_communication_financial_automation.sql` - Phase 3 tables
- `20260307000003_communication_scale_features.sql` - Phase 4 tables

## Patterns Used
- All tables have RLS enabled with chef-scoped policies
- Client read access via event > client > user_roles join chain
- All monetary amounts in cents (integers)
- Tenant ID derived from session via `requireChef()`, never from request body
- Non-blocking side effects wrapped in try/catch
- Server actions return `{ data, error }` objects (startTransition-compatible)
- No `@ts-nocheck` files

## Automation Rule Trigger Events
- `new_inquiry` - New inquiry received
- `event_confirmed` - Event reaches confirmed status
- `event_completed` - Event marked complete
- `payment_received` - Payment recorded
- `guest_count_changed` - Guest count modified
- `menu_approved` - Menu revision approved
- `survey_completed` - Post-event survey submitted
- `milestone_overdue` - Payment milestone past due date
