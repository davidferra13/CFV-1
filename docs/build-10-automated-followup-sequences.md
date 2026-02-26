# Build 10: Automated Follow-up Sequences

## What Was Built

A marketing automation module that lets chefs build multi-step follow-up email sequences triggered by client lifecycle events (birthday, dormancy, post-event, or seasonal). Each sequence defines an ordered list of steps: wait N days, then send an email from a template. The sequences page provides a dashboard to manage, activate/deactivate, and preview sequences visually.

## Files Created / Modified

| File                                                             | Role                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `app/(chef)/marketing/sequences/page.tsx`                        | Sequences list page — trigger type, step count, enrollment count, active toggle |
| `lib/marketing/actions.ts`                                       | `listSequences()` — fetches sequences with step and enrollment counts           |
| `lib/followup/sequence-builder-actions.ts`                       | Server actions: create, update, delete sequence and its steps                   |
| `lib/followup/rule-actions.ts`                                   | Server actions: manage followup trigger rules                                   |
| `components/followup/rule-builder.tsx`                           | UI for configuring trigger rules (trigger type, audience filter, conditions)    |
| `components/followup/sequence-timeline.tsx`                      | Visual preview of sequence steps laid out on a time axis                        |
| `supabase/migrations/20260312000004_proposals_and_followups.sql` | Adds `marketing_sequences`, `sequence_steps`, `sequence_enrollments` tables     |

## How It Works

- Migration `20260312000004` creates three tables. `marketing_sequences` stores `(chef_id, name, trigger_type, is_active)`. `sequence_steps` stores `(sequence_id, step_order, wait_days, email_template_id)`. `sequence_enrollments` stores `(sequence_id, client_id, enrolled_at, current_step, status)`. All tables are tenant-scoped by `chef_id`.
- `listSequences()` joins all three tables to return each sequence with its step count and current enrollment count (clients currently progressing through the sequence). This powers the sequences dashboard.
- Trigger types supported: `birthday` (fires N days before client birthday), `dormant_90` (fires when a client has had no event in 90 days), `post_event` (fires N days after an event is marked completed), `seasonal` (fires on a calendar date each year).
- `RuleBuilder` lets the chef pick a trigger type and optionally filter the audience (e.g., "only clients with lifetime spend > $1,000"). `SequenceTimeline` renders a horizontal time axis with labeled markers for each step so the chef can preview the full sequence before activating it.
- When a chef toggles a sequence active, new qualifying clients are enrolled going forward. Existing enrollments continue to the end of the sequence regardless of active status.

## How to Test

1. Navigate to `Marketing → Sequences` as a chef. Confirm the list renders (empty state if no sequences exist).
2. Create a new sequence with trigger type `post_event`, two steps: Day 3 "Thank you" email, Day 14 "Review request" email.
3. Open the sequence — confirm `SequenceTimeline` shows both steps on the correct day markers.
4. Toggle the sequence active. Confirm the active badge updates in the list.
5. Complete a test event for a client — after the trigger fires, confirm an enrollment record is created in `sequence_enrollments`.
6. Use `RuleBuilder` to add an audience filter and confirm the filter condition is saved to the rule record.
