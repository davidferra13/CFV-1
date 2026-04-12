# Platform Observability

This layer defines a single developer-facing event taxonomy for product activity, conversions, auth signals, and system failures.

## Channels

- Real-time alerts: high-signal events only. These are deduped and rate-limited by `alert_dedupe_key` plus the taxonomy-defined dedupe window.
- Daily digest: the primary developer reporting channel. Built from the same stored event stream over the last 24 hours in `America/New_York`.

## Recipients

- All platform observability emails go to developer-only recipients via `getDeveloperNotificationRecipients()`.
- This intentionally avoids broader admin and business notification lists.

## Severity

- `info`: routine activity, digest-first.
- `important`: growth, conversion, and notable engagement signals.
- `critical`: system failures and user-impacting errors. Eligible for immediate alerts.

## Taxonomy Groups

- `account`: chef and client registrations.
- `subscription`: Stay Updated and beta waitlist growth.
- `auth`: successful sign-ins and rate-limited auth activity.
- `feature`: tracked private-surface usage such as quote views, proposal views, document downloads, and payment-page visits.
- `input`: user-generated submissions such as contact forms and inquiry budget disclosure.
- `conversion`: public inquiry submissions and auto-conversion into draft events.
- `system`: cron failures and reported client-side exceptions.

## Current Bindings

- Auth:
  - `account.chef_signed_up`
  - `account.client_signed_up`
  - `auth.sign_in_succeeded`
  - `auth.sign_in_rate_limited`
- Public acquisition and subscriptions:
  - `subscription.stay_updated_subscribed`
  - `subscription.beta_waitlist_joined`
  - `input.contact_form_submitted`
  - `conversion.public_inquiry_submitted`
  - `input.public_inquiry_budget_provided`
  - `conversion.public_inquiry_converted_to_draft_event`
- Private engagement:
  - every tracked `activity_events` type is mapped into a `feature.*` platform observability event
- System health:
  - `system.client_error_reported`
  - `system.cron_job_failed`

## Storage

- Table: `platform_observability_events`
- Key fields:
  - `event_key`
  - `severity`
  - `source`
  - `scope`
  - `summary`
  - `metadata`
  - `occurred_at`
  - `realtime_alert_status`
  - `realtime_alert_sent_at`
  - `alert_dedupe_key`

## Event Context

Every persisted event attempts to carry:

- request correlation: `request_id`, `traceparent`, `request_path`, `request_host`, `request_proto`, `edge_request_id`
- client hinting: masked `request_ip_hint`, `user_agent`
- runtime identity: `environment`, `build_surface`, `build_id`, `release`, `vercel_env`, `vercel_region`

## Digest Outputs

The daily developer digest summarizes:

- total tracked events
- new users
- subscription growth
- auth activity
- event-key volume
- feature engagement
- input and conversion volume
- traffic distribution by source, path, and actor
- runtime identity for the current deployment
- critical events
- notable changes versus the prior 24-hour window

## Manual Validation

To send a real validation alert and a real digest email against the current environment:

```bash
npm run smoke:platform-observability
```

This command will:

- create `platform_observability_events` if the table is missing
- emit a single manual validation event through `recordPlatformEvent()`
- send the daily digest through `sendPlatformObservabilityDigest()`
- print the inserted event record and digest send result

To send the daily digest directly without going through a running web server:

```bash
npm run digest:platform-observability
```

To trigger the digest over HTTP instead of direct function invocation:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3100/api/cron/platform-observability-digest
```

## Automation

For this Windows workstation, the daily digest task is implemented in:

- `scripts/scheduled/platform-observability-digest.ps1`

And registered through:

- `scripts/scheduled/register-all-tasks.ps1`

The scheduled task name is:

- `ChefFlow-PlatformObservabilityDigest`

The scheduled task now sends the digest directly from the local codebase, so it does not depend on whichever local Next.js server happens to be running.
