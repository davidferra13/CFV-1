# Email

**What:** Outbound email delivery and inbound delivery-event handling across three separate systems:

- Gmail 1:1/direct human mail
- Transactional platform mail
- Marketing/campaign mail

**Key files:** `lib/email/`, `lib/marketing/actions.ts`, `lib/campaigns/push-dinner-actions.ts`, `app/api/webhooks/resend/route.ts`, `lib/gmail/`
**Status:** SAFE REPLACEMENT-FIRST MIGRATION STARTED

## Current System Split

- **Gmail direct human mail**
  - `lib/gmail/client.ts`
  - `lib/prospecting/pipeline-actions.ts`
  - Purpose: chef-authenticated 1:1 human outreach and reply threading.
  - Migration status: intentionally untouched in this phase.

- **Transactional platform mail**
  - `lib/email/send.ts`
  - Used by auth, notifications, scheduled reminders, contracts, receipts, developer alerts, and other platform-side sends.
  - Active transport: Resend, now routed through the provider boundary.

- **Marketing/campaign mail**
  - `lib/marketing/actions.ts`
  - `lib/campaigns/push-dinner-actions.ts`
  - `app/api/webhooks/resend/route.ts`
  - Purpose: campaign sends, engagement telemetry, bounce/spam state changes, and unsubscribe-linked recipient state.

## Current Resend Coupling Inventory

### Send Paths

- `lib/email/send.ts`
  - Shared transactional wrapper.
  - Still owns suppression checks, retry heuristics, DLQ writes, and circuit-breaker usage.
- `lib/marketing/actions.ts`
  - Campaign sends persist `campaign_recipients.resend_message_id` for webhook reconciliation.
- `lib/campaigns/push-dinner-actions.ts`
  - Marketing-style campaign sends through the same campaign recipient table.
- `lib/admin/email-actions.ts`
  - Admin direct and broadcast emails still use the same live provider, now through the adapter.

### Webhook/Event Handling

- `app/api/webhooks/resend/route.ts`
  - Verifies `RESEND_WEBHOOK_SECRET`.
  - Normalizes supported Resend events.
  - Updates compatibility fields on `campaign_recipients`:
    - `opened_at`
    - `clicked_at`
    - `bounced_at`
    - `spam_at`
  - Logs processing/skips/failures via `lib/webhooks/audit-log`.

### Suppression / Bounce / Complaint Logic

- `lib/email/send.ts`
  - Checks `email_suppressions` before sending.
  - Supports transactional bypass of complaint-only suppressions via `isTransactional`.
  - Hard bounce-like send errors upsert suppressions.
- `app/api/webhooks/resend/route.ts`
  - Bounce and spam-complaint events also upsert `email_suppressions`.

### Retries / Dead-Letter Behavior

- `lib/email/send.ts`
  - Retries once after 1 second on currently-classified transient failures.
  - Writes retryable failures to `email_dead_letter_queue`.
- `app/api/cron/email-retry/route.ts`
  - Advances DLQ state with exponential backoff and developer alerts.
  - Important limitation: this is observability/backoff only today, not full template replay and re-send.

### Analytics / Tracking

- `campaign_recipients.sent_at`, `opened_at`, `clicked_at`, `bounced_at`, `spam_at`, `unsubscribed_at`
- `lib/marketing/actions.ts`
  - Campaign stats and recipient history.
- `lib/analytics/marketing-analytics.ts`
  - Open, click, bounce, spam, and unsubscribe rates.

### Schema / Storage Coupling

- `campaign_recipients.resend_message_id`
  - Still the active production lookup key for Resend webhook reconciliation.
- `email_suppressions`
  - Global suppression state used by transactional mail.
- `email_dead_letter_queue`
  - Retry/observability queue for transient outbound failures.
- `directory_outreach_log.resend_message_id`
  - Existing schema coupling outside this phase's active refactor; no cutover should ignore it.

## Phase 1 Abstraction Added

- `lib/email/provider/types.ts`
  - Defines the outbound provider contract before future abstraction:
    - outbound request shape
    - message kind: `transactional`, `marketing`, `operational`
    - provider send result
    - normalized delivery-event model
    - suppression outcome classification
    - retry classification
    - provider message identity
- `lib/email/provider/resend-adapter.ts`
  - Resend implementation of the outbound provider contract.
- `lib/email/provider/resend-events.ts`
  - Shared Resend webhook signature verification and event normalization.
- `lib/email/provider/index.ts`
  - Provider selection via `EMAIL_TRANSPORT_PROVIDER`.
  - Current safe behavior: defaults and falls back to `resend`.
- Compatibility-preserving callers now use the provider boundary:
  - `lib/email/send.ts`
  - `lib/marketing/actions.ts`
  - `lib/campaigns/push-dinner-actions.ts`
  - `lib/admin/email-actions.ts`

## Intentionally Unchanged In This Phase

- Resend remains the live production transport.
- Gmail direct-send behavior remains separate and unchanged.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET` remain required for the live path.
- `breakers.resend` remains the active circuit breaker for outbound transport.
- `campaign_recipients.resend_message_id` remains the canonical webhook join key.
- Existing webhook-driven recipient updates still land in the same columns.
- No destructive schema changes were made.

## What Is Still Resend-Specific

- Transport implementation and API client.
- Provider message storage in `resend_message_id`.
- Webhook endpoint path and signature format.
- Current retry heuristic definitions.
- Current telemetry columns on `campaign_recipients`.
- Current delivery observability assumptions around Resend event types.

## Cutover Prerequisites Before Any Traffic Move

- Build an in-house adapter that implements the same outbound contract.
- Build equivalent inbound event verification and normalization for the new platform.
- Preserve provider message identity and event-to-row reconciliation.
- Preserve or improve bounce, complaint, and suppression semantics.
- Preserve or improve retry semantics; ideally replace observability-only DLQ behavior with replayable sends.
- Add provider-level observability for send success, queue depth, webhook lag, suppression writes, and reconciliation failures.
- Prove parity with shadow traffic before any selective cutover.
- Keep rollback tested and immediate.

## Rollback Strategy

- Keep `EMAIL_TRANSPORT_PROVIDER=resend` as the safe default.
- For future shadowing or selective cutover, switch traffic only behind the provider flag.
- If the replacement path misbehaves, switch the flag back to `resend` immediately.
- Do not remove Resend webhook handling, `resend_message_id`, or Resend env vars until the replacement path has matching delivery behavior, telemetry, suppression handling, and rollback drills.
