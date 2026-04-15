# Task: Pipeline - Auto-Create Staged Client + Inquiry from Unknown Senders

## Description

Build the matching pipeline that auto-creates staged client records and inquiries from inbound emails of unknown senders. Chef can later confirm or dismiss the pairing.

## Processing Steps

1. **Extract sender metadata:**
   - Email address
   - Optional: name (from email header `From: "Name" <email@>`)
   - Optional: phone (from email body if present, regex pattern)
   - Optional: event details (parsing email body for dates, guest count, etc.)

2. **Create staged client record:**
   - `first_name`, `last_name` from parsed "Name"
   - `email` from sender
   - `phone_number` (if extracted)
   - `chef_id` (target chef)
   - `is_staged = true`
   - `created_from_email = true` (flag for origin)

3. **Create staged inquiry record:**
   - `chef_id`, `client_id` (staged)
   - `status = 'inquiry'` (not yet qualified)
   - `message_preview` (first 200 chars of email body)
   - `source = 'email_inbound'`
   - Link to `communication_event`

4. **Stage the communication_event:**
   - `is_staged = true`
   - `staged_reason = 'unknown_sender'`
   - `staged_at = now()`
   - `inquiry_id` (link to new inquiry)

## Files

- `lib/email/inbound-processor.ts` (core: matchClientOrStage function)
- `lib/staging/create-staged-inquiry.ts` (new server action)

## Dependencies

- `clients` table `is_staged` column
- `inquiries` table `source` column
- `communication_events` staging columns

## Notes

- Name parsing: split on space, support "FirstName LastName" + "FirstName" fallback
- Phone extraction: regex for US format (123) 456-7890 + 123-456-7890 + 1234567890
- Event parsing: look for keywords (date, "guests", "event", "catering") - optional, best-effort
- All created records have audit trail in `inbound_email_log`
