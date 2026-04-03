# Spec: Survey Public Hardening And Results Scale

> **Status:** queued after phase-1 deploy verification
> **Priority:** P1 (next up)
> **Depends on:** `docs/research/current-builder-start-handoff-2026-04-02.md`, `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`, `docs/specs/p0-survey-passive-voluntary-surfacing.md`, `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                                            | Date             | Agent/Session      | Commit |
| ------------------------------------------------ | ---------------- | ------------------ | ------ |
| Created                                          | 2026-04-02 20:00 | Planner + Strategy |        |
| Status: queued after phase-1 deploy verification | 2026-04-02 20:00 | Planner + Strategy |        |

---

## Developer Notes

### Raw Signal

The developer explicitly asked whether the system could withstand a very large blast, whether submissions would be reliably stored, and where the system would break first. They also asked for devil's-advocate thinking around abuse, brigading, spam, and coordinated negative behavior.

They do not want fake confidence. The current public route works, but they want the builder to harden it in a way that is grounded in the real repo, protects the brand, and gives admin users a usable review surface when response volume grows.

### Developer Intent

- **Core goal:** make the public survey path and admin review surface defensible for broader anonymous distribution, not just warm controlled traffic.
- **Key constraints:** do not weaken production CAPTCHA protections, do not create a bypass that can leak into production, keep raw responses immutable, and do not pretend the current in-memory limiter is enough.
- **Motivation:** large distribution is part of the plan, and the current system has known weak points around distributed abuse, submission-burst proof, and results-table scale.
- **Success from the developer's perspective:** the public path has a distributed abuse boundary and anomaly logging, the builder can run a safe write-path test in a non-production environment, and the admin review surface no longer assumes the response set is small.

---

## What This Does (Plain English)

Adds a real server-side safety layer around public anonymous survey submissions and makes admin review scale beyond the current "load everything into the browser" approach. It also gives the team a safe way to test submission bursts without weakening production defenses.

---

## Why It Matters

Right now the survey path is good enough for controlled launch, but not proven for a very broad anonymous blast. The next builder pass needs to replace hope with explicit safeguards, observable failure signals, and an admin experience that still works when response volume grows.

---

## Files to Create

| File                                                               | Purpose                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `database/migrations/20260402000119_beta_survey_public_events.sql` | Add durable public-submission event logging for rate limits and anomalies      |
| `lib/beta-survey/public-events.ts`                                 | Centralize event logging, recent-count queries, and abuse-summary helpers      |
| `tests/load/scenarios/09-public-survey-submission-staging.js`      | Safe non-production submission-burst scenario using an explicit staging bypass |

---

## Files to Modify

| File                                                                     | What to Change                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/beta-survey/actions.ts`                                             | Move guard logic onto durable event logging, add safe non-production load-test bypass, and add paginated admin results helpers |
| `lib/rateLimit.ts`                                                       | Keep for generic low-risk use elsewhere, but do not leave it as the primary public-survey protection boundary                  |
| `app/(admin)/admin/beta-surveys/[id]/page.tsx`                           | Switch results loading to server-side pagination/search-param model                                                            |
| `app/(admin)/admin/beta-surveys/[id]/results-client.tsx`                 | Render paginated rows and a small public-intake health summary                                                                 |
| `docs/research/survey-readiness-and-outreach-audit-2026-04-02.md`        | Update verified state after hardening is built and tested                                                                      |
| `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md` | Mark phase-3 implementation details complete after verification                                                                |

---

## Database Changes

### New Tables

```sql
CREATE TABLE IF NOT EXISTS beta_survey_public_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES beta_survey_definitions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'accepted',
      'rate_limited',
      'captcha_failed',
      'honeypot_triggered',
      'duplicate_blocked',
      'submission_error'
    )
  ),
  ip_hash text,
  user_agent text,
  source text,
  channel text,
  campaign text,
  wave text,
  launch text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_survey_public_events_survey_created
  ON beta_survey_public_events(survey_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_survey_public_events_type_created
  ON beta_survey_public_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_survey_public_events_ip_created
  ON beta_survey_public_events(ip_hash, created_at DESC);
```

### New Columns on Existing Tables

None.

### Migration Notes

- Confirm `20260402000119_*` does not collide with an existing migration before creating it.
- This table is an operational server-side log. It is not a replacement for `beta_survey_responses`.
- Keep raw survey responses immutable. This event table is for protection and observability, not canonical answers.

---

## Data Model

### Public Event Log

Each public submission attempt should record a durable event row when relevant:

- `accepted`
- `rate_limited`
- `captcha_failed`
- `honeypot_triggered`
- `duplicate_blocked` if the builder adds a duplicate suppression rule
- `submission_error`

`ip_hash` should be a one-way hash, not a raw stored IP string.

Suggested metadata keys:

- request host
- user-agent fragment
- survey slug
- response id if accepted
- rejection reason if blocked

### Admin Results

The admin review surface should stop assuming the full response set fits comfortably in one client payload.

Minimum target:

- server-side page size, default `50`
- server-side filters for role, source, and wave
- total count
- next/previous page navigation
- small public-intake health summary from `beta_survey_public_events`

---

## Server Actions

| Action                                   | Auth             | Input                                                                                                   | Output                                                                                                                  | Side Effects |
| ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| `getBetaSurveyResultsPage(input)`        | `requireAdmin()` | `{ surveyId: string; page?: number; pageSize?: number; role?: string; source?: string; wave?: string }` | `{ responses: BetaSurveyResponse[]; totalCount: number; page: number; pageSize: number }`                               | None         |
| `getBetaSurveyPublicEventSummary(input)` | `requireAdmin()` | `{ surveyId: string; days?: number }`                                                                   | `{ accepted: number; rateLimited: number; captchaFailed: number; honeypotTriggered: number; submissionErrors: number }` | None         |

Internal helper functions to add:

- `logBetaSurveyPublicEvent(...)`
- `countRecentBetaSurveyPublicEvents(...)`
- `hashBetaSurveyIp(...)`

Implementation rule:

- `guardPublicSurveySubmission(...)` must receive survey identity context before it decides on rate limiting and event logging.
- Logging should happen for both accepted and rejected attempts where practical.

---

## UI / Component Spec

### Admin Results Page

- Keep the existing results page shell and filters.
- Replace the full-array assumption with paginated rows.
- Add a small summary card above the table showing recent public intake health:
  - accepted
  - rate limited
  - CAPTCHA failed
  - honeypot triggered
  - submission errors

### States

- **Loading:** preserve current page shell while the new page/filter state loads.
- **Empty:** show `No responses yet.` for the table and a clear `No public-intake events yet.` message for the summary card.
- **Error:** if the public-event summary fails, do not break the whole results page; show a contained unavailable state for that panel.
- **Populated:** table rows, filters, counts, and public-intake health summary all render without loading the full dataset client-side.

### Interactions

- Pagination should be URL/search-param based so page refreshes and admin sharing work cleanly.
- CSV export can remain whole-survey in this pass if it still completes reliably; the main requirement is to stop the on-screen review table from assuming full in-memory response sets.

---

## Edge Cases and Error Handling

| Scenario                                              | Correct Behavior                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Production env missing real Turnstile config          | Public submissions fail closed, not open                                         |
| Non-production load-test bypass env is absent         | Submission-burst scenario cannot run; no hidden bypass behavior                  |
| Load-test bypass secret is wrong                      | Request is rejected; no acceptance without explicit staging authorization        |
| Public-event log insert fails after accepted response | Keep the survey response if already stored; log the event failure server-side    |
| Summary panel query fails                             | Results table still renders; summary card shows unavailable state                |
| Large response set exists                             | Admin review still loads page 1 quickly and can navigate without client collapse |

---

## Verification Steps

1. Apply the new migration in a non-production environment.
2. Confirm accepted public submissions create `accepted` event rows.
3. Trigger a blocked request path, such as missing CAPTCHA, and confirm a rejection event row is created.
4. Enable the staging-only submission-burst bypass in a non-production environment.
5. Run `tests/load/scenarios/09-public-survey-submission-staging.js` against that environment and confirm:
   - requests are accepted or intentionally throttled as designed
   - no production-only protections are weakened
6. Open the admin survey results page and confirm:
   - results are paginated
   - filters still work
   - the public-intake health summary renders
7. Re-disable or omit the staging bypass in production configuration and confirm no bypass path exists there.

---

## Out of Scope

- public, chef, or client passive surfacing
- survey question UX changes
- outreach sender-domain provisioning
- replacing CSV export with a fully asynchronous export pipeline

---

## Notes for Builder Agent

- Reuse real repo patterns instead of inventing a new safety stack:
  - the kiosk API shows a DB-count-based abuse boundary
  - the Remy abuse log shows a durable incident-log pattern
- The safe submission-burst test must be explicitly non-production. Do not add a convenience bypass that can accidentally survive into production.
- Keep the event log operational and sparse. It is meant to support rate limiting, anomaly visibility, and admin diagnostics, not to become a second response table.
