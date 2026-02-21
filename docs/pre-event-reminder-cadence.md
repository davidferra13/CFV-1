# Pre-Event Confirmation Cadence — 30d & 14d Reminders

## What Changed

Extended the pre-event client reminder system from 3 tiers (7d, 2d, 1d) to 5 tiers (30d, 14d, 7d, 2d, 1d). This gives clients earlier touchpoints so events stay top-of-mind well before the final prep window.

## Files Created

| File                                         | Purpose                                                          |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `lib/email/templates/event-reminder-30d.tsx` | 30-day reminder email template — softer "looking forward" tone   |
| `lib/email/templates/event-reminder-14d.tsx` | 14-day reminder email template — "two weeks out" actionable tone |

## Files Modified

| File                                   | Change                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `lib/email/notifications.ts`           | Added `sendEventReminder30dEmail()` and `sendEventReminder14dEmail()` dispatcher functions + imports                            |
| `app/api/scheduled/lifecycle/route.ts` | Extended Section 5 with 30d/14d thresholds, widened date window from 7 to 30 days, added per-interval opt-out via `settingsKey` |

## Already Done (prior to this implementation)

| What                                                                                                                                                              | Where                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Migration adding `client_reminder_30d_sent_at`, `client_reminder_14d_sent_at` columns to events + `event_reminder_*d_enabled` columns to chef_automation_settings | `supabase/migrations/20260322000026_pre_event_reminder_cadence.sql` |
| Types updated with 5 new `event_reminder_*d_enabled` fields                                                                                                       | `lib/automations/types.ts`                                          |
| Settings schema updated with 5 new fields in Zod schema                                                                                                           | `lib/automations/settings-actions.ts`                               |

## Reminder Cadence

| Days Before | Column (dedup)                | Send Function               | Settings Key                 | Tone                                      |
| ----------- | ----------------------------- | --------------------------- | ---------------------------- | ----------------------------------------- |
| 30          | `client_reminder_30d_sent_at` | `sendEventReminder30dEmail` | `event_reminder_30d_enabled` | Soft — "looking forward to next month"    |
| 14          | `client_reminder_14d_sent_at` | `sendEventReminder14dEmail` | `event_reminder_14d_enabled` | Actionable — "two weeks, review & update" |
| 7           | `client_reminder_7d_sent_at`  | `sendEventPrepareEmail`     | `event_reminder_7d_enabled`  | Prep — checklist, confirm details         |
| 2           | `client_reminder_2d_sent_at`  | `sendEventReminder2dEmail`  | `event_reminder_2d_enabled`  | Final details + calendar add              |
| 1           | `client_reminder_1d_sent_at`  | `sendEventReminderEmail`    | `event_reminder_1d_enabled`  | Tomorrow — last-minute info               |

## Opt-Out Levels

Three levels of opt-out, checked in order:

1. **Chef global** — `client_event_reminders_enabled = false` skips all reminders for that tenant
2. **Chef per-interval** — `event_reminder_30d_enabled`, `event_reminder_14d_enabled`, etc. toggle individual tiers
3. **Client level** — `automated_emails_enabled = false` on the client record skips that client

## Design Decisions

- **30d template omits arrival time and special requests** — too early for those operational details. Only shows date, guest count, and location.
- **14d template includes serve time and special requests** — close enough to the event that these are meaningful and actionable.
- **Both templates include a CTA button** linking to the client portal event page.
- **The cron sends only the most urgent threshold per run** (`break` after first send), same as the existing 7d/2d/1d pattern. The cron runs daily, so each tier fires on its correct day.
- **Per-interval opt-out** is checked _after_ the dedup check — if the interval is disabled, we skip it silently (no `break`), allowing the next-most-urgent interval to fire if applicable.

## How It Connects

The lifecycle cron (`/api/scheduled/lifecycle`) runs on a Vercel Cron schedule. Section 5 now queries events up to 30 days out (previously 7 days) and iterates through all 5 reminder thresholds. The `reminderThresholds5` array is ordered from most-distant to most-urgent. For each event, the loop finds the first applicable unsent reminder and dispatches it.
