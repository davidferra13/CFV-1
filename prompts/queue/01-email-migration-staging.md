# Task: Migration - Staging Columns + Twilio Credentials Table + Inbound Email

## Description

Add database schema support for email staging pipeline, Twilio phone credential management, and inbound email webhook handling.

## Schema Changes

1. **Add staging columns to `communication_events`:**
   - `is_staged` (boolean, default false)
   - `staged_at` (timestamp, nullable)
   - `staged_reason` (text, nullable) - "unknown_sender" | "auto_matched" | "requires_approval"

2. **Add `twilio_credentials` table:**
   - `id` (uuid, PK)
   - `chef_id` (uuid, FK -> chefs)
   - `account_sid` (text, encrypted)
   - `auth_token` (text, encrypted)
   - `phone_number` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

3. **Add `inbound_email_log` table (audit trail):**
   - `id` (uuid, PK)
   - `chef_id` (uuid, FK -> chefs, nullable - unknown senders)
   - `from_email` (text)
   - `subject` (text)
   - `body` (text)
   - `received_at` (timestamp)
   - `processed` (boolean, default false)
   - `processing_status` (text) - "pending" | "matched" | "staged" | "error"
   - `error_message` (text, nullable)

## Files

- `database/migrations/20260414000001_email_staging_twilio.sql`

## Notes

- Use migration timestamp `20260414000001` (after existing migrations)
- Encryption: use `pgcrypto` extension (CREATE EXTENSION IF NOT EXISTS pgcrypto)
- All `chef_id` refs use cascading deletes
- Index on `communication_events(is_staged, staged_at)` for quick filtering
