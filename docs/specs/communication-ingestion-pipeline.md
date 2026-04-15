# Communication Ingestion Pipeline

## Overview

Every inbound communication (email, SMS, any channel) is automatically ingested, stored, classified, and surfaced in the chef's inbox without manual action. The system auto-creates staged clients, inquiries, and event drafts. Chef confirms or dismisses from the triage inbox.

The pipeline operates in four layers: ingestion captures raw signals, staging creates unverified records, system state holds confirmed entities, and AI optionally enhances classification.

## Architecture

Inbound Channel (Email, SMS, Platform) flows to Ingestion Layer (Webhook, OAuth Poller), which writes to communication_signals Table (Immutable Log), then to Staging Pipeline (Extract, Classify, Hydrate), creating Staged Entities (Clients, Inquiries, Events), which surface in Chef Triage Inbox (Confirm or Dismiss), finally reaching System State (Real Data).

Ingestion and staging always work. AI classification is optional and paid. If Ollama is unavailable, regex and heuristic rules classify signals.

## Components

### 1. communication_signals Table Migration

New table to store every inbound communication as an immutable record.

Schema columns:

- id (uuid): Primary key
- chef_id (uuid): FK to chefs(id), not null
- source (enum): email / sms / whatsapp / platform
- raw_body (text): Full message body, never truncated
- raw_headers (jsonb): Email headers, SMS metadata, platform metadata
- sender_email (varchar): Null for SMS/platform
- sender_phone (varchar): Null for email/platform
- sender_name (varchar): Display name if available
- subject (varchar): Email subject or SMS preview
- received_at (timestamptz): When signal arrived
- processed_at (timestamptz): When staging pipeline ran (null until processed)
- signal_status (enum): pending / processed / ignored
- staged_client_id (uuid): FK to clients(id) if created, null otherwise
- staged_inquiry_id (uuid): FK to inquiries(id) if created, null otherwise
- staged_event_id (uuid): FK to events(id) if created, null otherwise
- created_at (timestamptz): Immutable timestamp

Rules:

- Immutable once written. No updates to existing rows.
- Periodic job processes pending signals (staging pipeline runs async).
- No TTL. All signals retained permanently for audit trail.

### 2. Staging Columns on Existing Tables

Add staging flags to clients, inquiries, and events tables.

For clients table:

- ALTER TABLE clients ADD COLUMN is_staged boolean DEFAULT false
- ALTER TABLE clients ADD COLUMN staged_from_signal_id uuid REFERENCES communication_signals(id)
- CREATE INDEX idx_clients_staged ON clients(chef_id, is_staged) WHERE is_staged = true

For inquiries table:

- ALTER TABLE inquiries ADD COLUMN is_staged boolean DEFAULT false
- ALTER TABLE inquiries ADD COLUMN staged_from_signal_id uuid REFERENCES communication_signals(id)
- CREATE INDEX idx_inquiries_staged ON inquiries(chef_id, is_staged) WHERE is_staged = true

For events table:

- ALTER TABLE events ADD COLUMN is_staged boolean DEFAULT false
- ALTER TABLE events ADD COLUMN staged_from_signal_id uuid REFERENCES communication_signals(id)
- CREATE INDEX idx_events_staged ON events(chef_id, is_staged) WHERE is_staged = true

Staged entities never appear in primary lists (events view, client roster) unless explicitly filtered. Confirmation UI updates these flags to false.

### 3. Per-Chef Inbound Email Address

Every chef gets a unique inbound address: {chef-slug}@cheflowhq.com.

Cloudflare Email Routing setup:

- Domain: cheflowhq.com
- Catch-all rule: \*@cheflowhq.com routes to /api/webhooks/email/inbound
- Cloudflare forwards email as JSON webhook payload

Webhook Handler (app/api/webhooks/email/inbound/route.ts):

1. Parses incoming email (Cloudflare email routing format)
2. Extracts: sender email, sender name, subject, body, attachments (metadata only)
3. Derives chef_id from recipient address slug
4. Writes immutable record to communication_signals with source: email, signal_status: pending
5. Triggers staging pipeline (async, background job)
6. Returns 200 OK

No authentication required on webhook (Cloudflare validates sender).

### 4. Email OAuth Connectors

Settings page at /app/(chef)/settings/integrations/email allows chef to connect Gmail and Outlook.

Gmail Integration:

- OAuth2 flow (Google API, scopes: gmail.readonly, gmail.modify)
- Cron job (every 5 min) queries Gmail API for new messages via watch/list
- For each new message: extract headers (from, subject, body), write to communication_signals
- Store OAuth refresh token encrypted per chef in new chef_email_oauth table

Outlook/Microsoft Integration:

- OAuth2 flow (Microsoft Graph API, scopes: mail.read)
- Same polling cadence, same pipeline
- Refresh token stored encrypted per chef

Schema for chef_email_oauth table:

- id (uuid): Primary key
- chef_id (uuid): FK to chefs(id), not null
- provider (enum): gmail / outlook
- oauth_access_token (text): Encrypted (tRPC/viaduct pattern)
- oauth_refresh_token (text): Encrypted
- oauth_expires_at (timestamptz): Token expiry
- enabled (boolean): Chef can toggle off/on
- created_at (timestamptz)
- updated_at (timestamptz)

Credentials always encrypted at rest. Never logged or exposed.

### 5. Twilio Bring-Your-Own

Settings page at /app/(chef)/settings/integrations/sms allows chef to enter Twilio credentials.

Setup:

- Chef enters: Account SID, Auth Token, Phone Number
- Stored encrypted in new chef_sms_credentials table (follows same pattern as email OAuth)
- Chef configures Twilio webhook to point to /api/webhooks/twilio/inbound

Existing webhook handler (app/api/webhooks/twilio/inbound/route.ts):

- Already receives inbound SMS
- Looks up chef by phone number in chef_sms_credentials
- Writes communication_signals record with source: sms
- Triggers staging pipeline

No new webhook needed. Existing Twilio endpoint just needs credential lookup.

Schema for chef_sms_credentials table:

- id (uuid): Primary key
- chef_id (uuid): FK to chefs(id), not null
- phone_number (varchar): Chef's Twilio number
- account_sid (text): Encrypted
- auth_token (text): Encrypted
- enabled (boolean): Chef can toggle off/on
- created_at (timestamptz)
- updated_at (timestamptz)

### 6. Staging Pipeline

Server action in lib/comms/staging-pipeline.ts.

Process (triggered by cron or webhook on new communication_signal):

1. Fetch pending signal: Query communication_signals WHERE signal_status = pending (batch process)

2. Extract sender identity:
   - Email: extract from sender_email, derive sender_name from email headers or raw_body heuristic
   - SMS: extract from raw_headers phone field
   - Platform: extract from raw_headers user metadata

3. Match or create staged client:
   - Query existing clients for matching email or phone (case-insensitive)
   - If found: link staged_client_id to existing client, skip client creation
   - If not found: create new clients record with is_staged: true, email (if email source) or phone (if SMS), populate staged_from_signal_id

4. Classify intent (optional Ollama):
   - If Ollama available: prompt with signal body, extract: intent (inquiry/order/complaint/other), estimated_headcount, estimated_event_date, location, dietary_notes
   - If Ollama unavailable: regex fallback (detect date patterns, numbers, keywords like request, order, event, dinner)
   - Store classification in new communication_signal_classification jsonb column (or separate table)

5. Create staged inquiry (if inquiry intent detected):
   - Create inquiries record: is_staged: true, client_id: staged_client_id, chef_id, subject: signal.subject, initial_message: signal.raw_body, staged_from_signal_id
   - Default status: new (or staged if new enum added)

6. Create staged event (if event signals detected):
   - If classification extracted: estimated_headcount, estimated_event_date, location
   - Create events record: is_staged: true, client_id: staged_client_id, chef_id, headcount: extracted_headcount, event_date: extracted_date, location: extracted_location, status: draft, staged_from_signal_id
   - Event remains draft until confirmed (can be edited before confirmation)

7. Mark signal processed:
   - Update signal_status: processed, processed_at: now()

8. Broadcast to SSE:
   - Call broadcast('communications:{chefId}', { type: 'signal_ingested', signal }) to notify live-connected clients

Error handling:

- If staging fails: log error, mark signal signal_status: ignored, do not block pipeline
- Retry ignored signals on next cron run
- Chef sees signal in raw feed even if staging failed

### 7. Raw Feed Tab in Communication Inbox

Extend existing CommunicationInboxClient component.

New tab: All

- Shows every communication_signal in real-time, unfiltered, chronological (newest first)
- Powered by SSE on communications:{chefId} channel
- Displays per signal:
  - Source badge (email/SMS/platform/etc)
  - Sender name and address (email) or phone (SMS)
  - Subject line (if email) or preview (SMS)
  - Received timestamp, relative (5 min ago)
  - Linked staged entities below (if any): Staged client: John Doe with confirm/dismiss buttons
- No filtering. No search. No interpretation. Raw data.
- Positioned as last tab (after Unassigned, Active, etc)

Styling:

- Signal rows in light neutral background to distinguish from primary inbox
- Staged entity pills with STAGED badge and icon
- Confirm button confirms all linked entities (client, inquiry, event) in one action

### 8. Staged Entity Confirmation UI

Staged clients, inquiries, and events surface in existing Unassigned tab with STAGED badge.

Behavior:

- Staged records appear inline with regular records, marked visually (badge, lighter styling, or grouped)
- Confirm button:
  - Updates is_staged: false on client/inquiry/event
  - Entity immediately appears in normal lists and workflows
  - Removes from staging view
- Dismiss button:
  - Soft-delete or archive (new flag: dismissed_from_staging: true on entity)
  - Entity removed from normal views
  - Original communication_signal retained in audit log
  - If inquiry/event, remains visible in raw feed (signal never deleted)

Server actions (lib/comms/confirm-staged-entity.ts):

- confirmStagedEntity(chefId, entityType, entityId): Verify ownership, update is_staged: false, broadcast SSE, return success
- dismissStagedEntity(chefId, entityType, entityId): Verify ownership, set dismissed_from_staging: true, broadcast SSE, return success

## Data Model

### communication_signals

Immutable inbound log. Schema defined in Component 1.

### chef_email_oauth

OAuth credentials for Gmail, Outlook. Schema defined in Component 4.

### chef_sms_credentials

Bring-your-own SMS credentials. Schema defined in Component 5.

### Staging Columns

Added to clients, inquiries, events: is_staged boolean, staged_from_signal_id uuid.

### communication_signal_classification (optional)

If storing classifications, separate table or jsonb column on communication_signals with columns:

- id (uuid)
- signal_id (uuid): FK to communication_signals(id)
- intent (varchar): inquiry / order / complaint / other
- headcount (int): Estimated from signal
- event_date (date): Extracted date (null if unclear)
- location (varchar): Extracted location
- dietary_notes (text): Extracted dietary/allergy info
- confidence (numeric): 0-1 score (Ollama only)
- created_at (timestamptz)

Alternatively, embed as jsonb on communication_signals to keep immutable log complete in one row.

## Build Order

1. Database migrations (communication_signals table, staging columns, OAuth/SMS credential tables)
2. Webhook handler (/api/webhooks/email/inbound)
3. Staging pipeline (lib/comms/staging-pipeline.ts) with regex fallback
4. Cron job to process pending signals every 5 minutes
5. Twilio credential integration (update existing /api/webhooks/twilio/inbound)
6. Email OAuth settings page (/app/(chef)/settings/integrations/email)
7. SMS settings page (/app/(chef)/settings/integrations/sms)
8. Raw feed tab (Communication Inbox All tab with SSE)
9. Staged entity confirmation UI (confirm/dismiss buttons on Unassigned tab)
10. Ollama classification integration (optional, added after step 9)

## Rules

- Ingestion always works. No AI required. Email webhook and SMS webhook operate independently of Ollama.
- Ingestion is complete without Twilio. Email-only setup (per-chef address plus OAuth connectors) is a full ingestion pipeline.
- Remy never gates ingestion. Chat-based triage is optional and future. Ingestion happens regardless of Remy availability.
- Raw feed shows everything unfiltered. No deduplication, no filtering, no interpretation. Every signal visible.
- Staged entities never appear in primary views without confirmation. Clients list shows only confirmed clients. Events list shows only confirmed events. Inquiries list shows only confirmed inquiries.
- All signal data is immutable and permanent. No soft-deletes on communication_signals. Audit trail is complete.
- Credentials encrypted at rest. Email OAuth tokens, SMS auth tokens stored encrypted in database.
- Graceful degradation. If Ollama unavailable, regex fallback classifies. If email OAuth unavailable, per-chef address still works. If SMS credentials missing, email ingestion continues.

## Success Criteria

- Email signals ingested via per-chef address (@cheflowhq.com)
- SMS signals ingested via Twilio webhook with bring-your-own credentials
- OAuth integrations (Gmail, Outlook) poll and ingest new messages
- Staging pipeline creates client, inquiry, event drafts in less than 2 seconds
- Chef confirms 5 signals from raw feed in under 30 seconds (UI responsive)
- Confirmed entity appears in normal lists immediately
- Dismissed entity stays in signal log (immutable)
- All communication_signals rows marked processed within 5 minutes of receipt
- Ollama classification (if enabled) detects date/headcount/location in 80% of signals
