# Task: Gmail - Ingest ALL Inbound into communication_events

## Description

Extend existing Gmail sync to ingest all inbound messages (not just inquiries or existing threads). Stage unknown senders instead of silently discarding them.

## Current State

`lib/gmail/sync-emails.ts` currently filters to:

- Emails containing "inquiry" keywords
- Emails from existing clients
- Emails in active threads

## Changes Required

1. **Expand filter:** Accept ALL inbound emails from external senders
2. **Create communication_event for all:** Insert into `communication_events` with `direction = 'inbound'`
3. **Stage unknown senders:** If sender not in clients table, set `is_staged = true`, `staged_reason = 'unknown_sender'`
4. **Known clients:** Set `is_staged = false`, create linked inquiry if new thread
5. **Log all:** Insert audit entry in `inbound_email_log` with `processing_status = 'matched'` or `'staged'`

## Files

- `lib/gmail/sync-emails.ts` (modify filter + staging logic)
- `lib/email/inbound-processor.ts` (shared matching logic, used by both Gmail + Cloudflare webhook)

## Dependencies

- `communication_events` table with `is_staged` column
- `inbound_email_log` table for audit trail

## Notes

- Gmail API pagination: handle label queries correctly
- Cache results 1 hour (existing pattern)
- Don't re-sync already-processed emails (check `external_message_id`)
