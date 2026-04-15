# Task: Integrations - Twilio Bring-Your-Own Settings Section

## Description

Build settings page allowing chefs to optionally bring their own Twilio credentials for SMS sending (instead of using shared platform account).

## UI Surface

**New section in `/settings/integrations`:**

- Header: "Twilio SMS" with status indicator (Connected / Not Connected)
- If not connected:
  - Text: "Bring your own Twilio account for SMS sending"
  - Link to Twilio signup
  - Form fields:
    - Account SID (text input, masked display)
    - Auth Token (text input, masked display)
    - Verified Phone Number (dropdown from Twilio, or text input)
  - "Connect" button
- If connected:
  - Display: "Using your Twilio account"
  - Phone number: +1XXXXXXXXXX
  - "Test SMS" button (sends test to chef's own phone)
  - "Disconnect" button
  - "Update credentials" link

## Server Actions

- `connectTwilioAccount(accountSid, authToken, phoneNumber)` - validate + store encrypted
- `disconnectTwilioAccount()` - delete credentials
- `testTwilioConnection()` - send test SMS to chef's phone
- `fetchTwilioVerifiedNumbers()` - list verified numbers from Twilio API

## Files

- `app/(chef)/settings/integrations/page.tsx` (modify: add Twilio section)
- `components/settings/twilio-connect-card.tsx` (new)
- `lib/integrations/twilio-actions.ts` (new server actions)
- `lib/integrations/twilio-service.ts` (Twilio API wrapper)

## Database

- `twilio_credentials` table (already in migration task)
- Store encrypted via pgcrypto
- Decrypt on read only when needed for sending

## Dependencies

- `twilio` npm package
- Twilio API credentials (developer has account)
- `pg_trgm` for text search (if listing many accounts)

## Notes

- Validation: connect to Twilio API to verify SID+token before saving
- Test SMS: send to chef's phone (from `chefs.phone_number`)
- Encryption: use `pgp_sym_encrypt` + master key stored in env var
- Fallback: if no custom Twilio, use platform account (existing behavior)
