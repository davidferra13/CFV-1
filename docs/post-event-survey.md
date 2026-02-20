# Post-Event Survey

## What Changed

When an event transitions to `completed`, the system now automatically creates a survey record and emails the client a unique link. The client fills out the survey at `/survey/[token]` (no login required). The chef can view all responses at `/surveys`.

The `/survey/[token]` route previously existed as an empty placeholder. It is now fully implemented.

## Why

Post-event feedback is valuable for chef quality improvement and portfolio building. Clients can grant testimonial consent directly in the form, which feeds into future marketing features.

## How It Works

### Survey Lifecycle

```
Event transitions to 'completed'
  → transitionEvent() in lib/events/transitions.ts
  → createSurveyForEvent(eventId, tenantId) — idempotent
  → sendPostEventSurveyEmail() to client email
Client opens /survey/[token]
  → submitted_at IS NULL → show form
  → submitted_at IS NOT NULL → show thank-you only (idempotent)
Client submits → submitSurvey() sets submitted_at = now()
Chef views /surveys → aggregated stats + per-response cards
```

### Idempotency

The `event_surveys` table has a `UNIQUE(event_id)` constraint. If `createSurveyForEvent` is called twice (e.g., webhook retry), the second call returns the existing token rather than creating a duplicate row.

### Survey Questions

| Field | Type | Required |
|---|---|---|
| `overall_rating` | 1–5 stars | Yes |
| `food_quality_rating` | 1–5 stars | No |
| `communication_rating` | 1–5 stars | No |
| `value_rating` | 1–5 stars | No |
| `would_book_again` | yes / no / maybe | No |
| `highlight_text` | textarea | No |
| `suggestions_text` | textarea | No |
| `testimonial_consent` | checkbox | No |

### Token Security

The survey URL uses the `token` UUID column (not the internal `event_id`). Tokens are UUID v4 (122-bit entropy), safe for use in email links.

### Transition Hook

`lib/events/transitions.ts` triggers survey creation in a non-blocking `try/catch` after the core transition succeeds:

```typescript
if (toStatus === 'completed' && fromStatus === 'in_progress') {
  try {
    const surveyToken = await createSurveyForEvent(eventId, event.tenant_id)
    if (surveyToken && client?.email) {
      await sendPostEventSurveyEmail({ ... })
    }
  } catch (surveyErr) {
    console.error('[transitionEvent] Survey creation failed (non-blocking):', surveyErr)
  }
}
```

A survey failure never blocks or rolls back the event transition itself.

### Middleware

`/survey` was added to `skipAuthPaths` in `middleware.ts` so clients can access the survey form without logging in.

## Key Files

| File | Role |
|---|---|
| `app/survey/[token]/page.tsx` | Server component — loads survey by token, shows form or thank-you |
| `app/survey/[token]/survey-form.tsx` | `'use client'` survey form with star ratings |
| `app/(chef)/surveys/page.tsx` | Chef dashboard: all responses with computed averages |
| `lib/surveys/actions.ts` | `createSurveyForEvent`, `getSurveyByToken`, `submitSurvey`, `getChefSurveys`, `sendClientSurvey` |
| `lib/surveys/survey-utils.ts` | Pure types (`ChefSurveyRow`, `SurveyStats`) + `computeSurveyStats()` |
| `lib/email/templates/post-event-survey.tsx` | React Email template |
| `lib/email/notifications.ts` | `sendPostEventSurveyEmail()` added |
| `lib/events/transitions.ts` | Non-blocking survey hook on `completed` transition |
| `supabase/migrations/20260303000022_event_surveys.sql` | Creates `event_surveys` table, indexes, RLS |

## Database

```sql
CREATE TABLE event_surveys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token                 UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  overall_rating        SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  food_quality_rating   SMALLINT CHECK (food_quality_rating BETWEEN 1 AND 5),
  communication_rating  SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  value_rating          SMALLINT CHECK (value_rating BETWEEN 1 AND 5),
  would_book_again      TEXT CHECK (would_book_again IN ('yes', 'no', 'maybe')),
  highlight_text        TEXT,
  suggestions_text      TEXT,
  testimonial_consent   BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_surveys_one_per_event UNIQUE (event_id)
);
```

## Chef-Triggered Send

The chef can also manually send the survey from the event detail page by calling `sendClientSurvey(eventId)`. This creates the survey if it does not exist and re-sends the email. Useful when the client did not receive the automatic email.
