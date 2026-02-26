# Webhook Event Audit Log

## What Was Added

| File                                                    | Purpose                     |
| ------------------------------------------------------- | --------------------------- |
| `supabase/migrations/20260306000003_webhook_events.sql` | `webhook_events` table      |
| `lib/webhooks/audit-log.ts`                             | `logWebhookEvent()` utility |
| `app/api/webhooks/stripe/route.ts`                      | Audit log wired             |
| `app/api/webhooks/resend/route.ts`                      | Audit log wired             |
| `app/api/webhooks/wix/route.ts`                         | Audit log wired             |

## The Problem

Before this change, there was no central record of which webhooks fired and what happened. If a payment was processed incorrectly, you could look in:

- The Stripe dashboard (useful, but external)
- The Supabase ledger table (shows what was written, not what triggered it)
- Server logs (ephemeral, no structured search)

But there was no structured, queryable, tenant-correlated record of "event X fired at time Y and produced result Z."

## What Is Logged

Each call to `logWebhookEvent()` inserts one row:

```
provider           | 'stripe'
event_type         | 'payment_intent.succeeded'
provider_event_id  | 'evt_3Ox...'     ← Stripe's own event ID
status             | 'processed'
result             | { eventId: '...', tenantId: '...', ledgerEntryId: '...' }
payload_size_bytes | 4832
received_at        | 2026-03-06T18:34:22Z
```

**What is NOT stored:** The full webhook payload. Payloads can contain PII (customer names, email addresses, card last-4 digits). We store only the metadata needed to trace an issue. For full payload inspection, use the Stripe dashboard (for Stripe events) or the `wix_submissions` table (for Wix events).

## Provider Coverage

| Provider | Event Logged                    | When                                     |
| -------- | ------------------------------- | ---------------------------------------- |
| Stripe   | All event types                 | Immediately after signature verification |
| Resend   | `email.opened`, `email.clicked` | After DB update (success or failure)     |
| Wix      | `form_submission`               | After submission stored                  |
| Generic  | Not yet wired                   | —                                        |

## Auto-Cleanup

The `webhook_events` table auto-purges rows older than 90 days via an INSERT trigger. Stripe's own dashboard covers longer history if needed.

## Querying the Audit Log

```sql
-- All Stripe payment events in the last 24 hours
SELECT provider_event_id, event_type, status, received_at
FROM webhook_events
WHERE provider = 'stripe' AND received_at > now() - interval '24 hours'
ORDER BY received_at DESC;

-- All failed webhooks
SELECT * FROM webhook_events
WHERE status = 'failed'
ORDER BY received_at DESC;

-- Find a specific Stripe event
SELECT * FROM webhook_events
WHERE provider_event_id = 'evt_3Ox...';
```

## Wiring Additional Handlers

```typescript
import { logWebhookEvent } from '@/lib/webhooks/audit-log'

// On success:
await logWebhookEvent({
  provider: 'my-provider',
  eventType: event.type,
  providerEventId: event.id,
  status: 'processed',
  result: { what: 'happened' },
  payloadSizeBytes: body.length,
})

// On failure:
await logWebhookEvent({
  provider: 'my-provider',
  eventType: event.type,
  providerEventId: event.id,
  status: 'failed',
  errorText: error.message,
  payloadSizeBytes: body.length,
})
```

`logWebhookEvent()` is always fire-and-forget — it never throws.
