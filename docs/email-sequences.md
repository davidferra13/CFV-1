# Email Marketing / Nurture Sequences (Feature 5.6)

## Overview

Automated follow-up email sequences for leads and clients. Chefs define trigger-based sequences with timed steps, and clients are enrolled automatically or manually.

## Database Tables

Three new tables (migration `20260401000036_email_sequences.sql`):

- **email_sequences** - Sequence definitions (name, trigger type, active flag). Chef-scoped via `chef_id`.
- **email_sequence_steps** - Ordered steps within a sequence. Each step has a delay (days), subject template, and body template with variable placeholders.
- **email_sequence_enrollments** - Tracks which clients are enrolled in which sequences, their current step, status, and next scheduled send time.

All tables have RLS policies scoped to the chef via `user_roles`.

## Trigger Types

| Trigger | Description |
|---------|-------------|
| `post_inquiry` | Fires after a new inquiry is received |
| `post_event` | Fires after an event completes |
| `post_quote` | Fires after a quote is sent |
| `anniversary` | Fires on the anniversary of a client's first event |
| `dormant_30d` | Fires when a client has been inactive for 30 days |
| `dormant_60d` | Fires when a client has been inactive for 60 days |
| `manual` | Chef manually enrolls clients |

## Template Variables

Templates use deterministic string replacement (no AI). Available variables:

- `{{client_name}}` - Client's full name
- `{{client_email}}` - Client's email address
- `{{chef_name}}` - Chef's business name
- `{{event_date}}` - Relevant event date
- `{{event_type}}` - Type of event
- `{{inquiry_date}}` - Date of the inquiry
- `{{guest_count}}` - Number of guests

## Server Actions

All actions in `lib/email/sequence-actions.ts`:

**Sequence CRUD:** `getSequences`, `getSequence`, `createSequence`, `updateSequence`, `deleteSequence`

**Step management:** `addStep`, `updateStep`, `removeStep`, `reorderSteps`

**Enrollment management:** `enrollClient`, `getEnrollments`, `pauseEnrollment`, `cancelEnrollment`

**Analytics & preview:** `getSequenceStats`, `previewStep`

All actions use `requireChef()` for auth and scope queries with `user.tenantId!`.

## UI Components

- `components/email/sequence-list.tsx` - Grid of sequences with toggle, edit, delete
- `components/email/sequence-builder.tsx` - Full sequence editor with step timeline, drag reorder, inline editing, preview mode
- `components/email/enrollment-manager.tsx` - Enrollment list with status filter, pause/cancel controls

## Architecture Notes

- Template rendering is purely deterministic (string replacement). No AI involved per the "Formula > AI" rule.
- All optimistic UI updates have try/catch with rollback and toast error feedback.
- Enrollment `next_send_at` is calculated from step delay_days at enrollment time. A background processor (not yet implemented) will pick up enrollments where `next_send_at <= now()` and `status = 'active'` to send the emails and advance to the next step.
- Steps cascade-delete when a sequence is deleted. Enrollments also cascade.

## Future Work

- Background email sender (cron or edge function) that processes due enrollments
- Auto-enrollment triggers (hook into inquiry creation, event completion, etc.)
- Email open/click tracking
- A/B testing on subject lines
- Sequence analytics dashboard
