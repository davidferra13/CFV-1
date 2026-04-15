# Task: Webhook - /api/webhooks/email/inbound (Cloudflare Email Routing)

## Description

Build webhook endpoint that receives inbound emails from Cloudflare Email Routing, logs them, stages unknown senders, and begins client matching pipeline.

## Endpoint

`POST /api/webhooks/email/inbound`

## Request Format (Cloudflare Email Routing)

```json
{
  "from": "sender@example.com",
  "to": "support@cheflowhq.com",
  "subject": "Request for catering",
  "text": "Hello, I'd like to book a chef...",
  "html": "<p>Hello...</p>",
  "timestamp": 1705123456,
  "message_id": "abc123@cloudflare"
}
```

## Processing Logic

1. Validate Cloudflare signature (if available; otherwise accept)
2. Insert into `inbound_email_log` with `processing_status = 'pending'`
3. Extract chef recipient (hard-coded mapping or from `to:` domain)
4. Attempt to match sender to existing client
5. If no match: create staged record with reason "unknown_sender"
6. Log outcome to `inbound_email_log`
7. Return 200 (webhook must succeed to Cloudflare)

## Files

- `app/api/webhooks/email/inbound/route.ts`

## Dependencies

- `lib/email/inbound-processor.ts` (core matching + staging logic)
- Staging creation logic in lib/staging (TBD)

## Notes

- No auth required (webhook from Cloudflare)
- Must handle errors gracefully (always return 200 to Cloudflare)
- Errors logged to `inbound_email_log.error_message`
