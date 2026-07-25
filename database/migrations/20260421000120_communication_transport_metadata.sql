-- Extends communication_events with immutable transport metadata so provider/channel
-- ownership and provider thread identifiers do not have to be reconstructed from side logs.
-- Backfills from the existing append-only communication_action_log and legacy email bridge rows.

ALTER TABLE communication_events
  ADD COLUMN IF NOT EXISTS external_thread_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS managed_channel_address TEXT,
  ADD COLUMN IF NOT EXISTS recipient_address TEXT;

CREATE INDEX IF NOT EXISTS idx_comm_events_external_thread
  ON communication_events(tenant_id, source, external_thread_key)
  WHERE external_thread_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_events_provider
  ON communication_events(tenant_id, provider_name, timestamp DESC)
  WHERE provider_name IS NOT NULL;

COMMENT ON COLUMN communication_events.external_thread_key IS
  'Immutable provider thread/conversation id captured on the canonical event itself.';
COMMENT ON COLUMN communication_events.provider_name IS
  'Provider used to receive or send this communication event (gmail, twilio, etc.).';
COMMENT ON COLUMN communication_events.managed_channel_address IS
  'Tenant-owned alias, mailbox, or Twilio number that controlled this communication.';
COMMENT ON COLUMN communication_events.recipient_address IS
  'Transport-level recipient for the event. For inbound events this is usually the managed address; for outbound events it is the client destination.';

WITH latest_ingest AS (
  SELECT
    communication_event_id,
    new_state->>'external_thread_key' AS external_thread_key,
    new_state->>'provider_name' AS provider_name,
    new_state->>'managed_channel_address' AS managed_channel_address,
    new_state->>'recipient_address' AS recipient_address,
    row_number() OVER (
      PARTITION BY communication_event_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM communication_action_log
  WHERE action = 'communication_event_ingested'
    AND communication_event_id IS NOT NULL
),
latest_reply AS (
  SELECT
    communication_event_id,
    new_state->>'external_thread_key' AS external_thread_key,
    new_state->>'provider' AS provider_name,
    new_state->>'managed_channel_address' AS managed_channel_address,
    new_state->>'recipient' AS recipient_address,
    row_number() OVER (
      PARTITION BY communication_event_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM communication_action_log
  WHERE action = 'reply_sent_via_channel'
    AND communication_event_id IS NOT NULL
),
email_bridge AS (
  SELECT
    tenant_id,
    gmail_message_id,
    gmail_thread_id,
    recipient_email
  FROM messages
  WHERE gmail_message_id IS NOT NULL
)
UPDATE communication_events ce
SET
  external_thread_key = COALESCE(
    ce.external_thread_key,
    src.reply_thread_key,
    src.ingest_thread_key,
    src.gmail_thread_id,
    CASE
      WHEN src.thread_key IS NULL THEN NULL
      WHEN src.thread_key LIKE ce.source::text || ':client:%' THEN NULL
      WHEN src.thread_key LIKE ce.source::text || ':email:%' THEN NULL
      WHEN src.thread_key LIKE ce.source::text || ':phone:%' THEN NULL
      WHEN src.thread_key LIKE ce.source::text || ':sender:%' THEN NULL
      WHEN src.thread_key LIKE ce.source::text || ':%'
        THEN substring(src.thread_key FROM char_length(ce.source::text) + 2)
      ELSE NULL
    END
  ),
  provider_name = COALESCE(
    ce.provider_name,
    src.reply_provider_name,
    src.ingest_provider_name,
    CASE
      WHEN ce.source = 'email' AND src.gmail_message_id IS NOT NULL THEN 'gmail'
      ELSE NULL
    END
  ),
  managed_channel_address = COALESCE(
    ce.managed_channel_address,
    src.reply_managed_channel_address,
    src.ingest_managed_channel_address
  ),
  recipient_address = COALESCE(
    ce.recipient_address,
    src.reply_recipient_address,
    src.ingest_recipient_address,
    CASE
      WHEN ce.direction = 'inbound' THEN COALESCE(src.ingest_managed_channel_address, ce.managed_channel_address)
      ELSE src.recipient_email
    END
  )
-- The joins below cannot reference the UPDATE target, so the event is joined inside
-- this subquery and only its resolved columns are exposed to the SET list.
FROM (
  SELECT
    e.id AS event_id,
    ct.external_thread_key AS thread_key,
    li.external_thread_key AS ingest_thread_key,
    li.provider_name AS ingest_provider_name,
    li.managed_channel_address AS ingest_managed_channel_address,
    li.recipient_address AS ingest_recipient_address,
    lr.external_thread_key AS reply_thread_key,
    lr.provider_name AS reply_provider_name,
    lr.managed_channel_address AS reply_managed_channel_address,
    lr.recipient_address AS reply_recipient_address,
    eb.gmail_thread_id,
    eb.gmail_message_id,
    eb.recipient_email
  FROM communication_events e
  JOIN conversation_threads ct
    ON ct.id = e.thread_id
   AND ct.tenant_id = e.tenant_id
  LEFT JOIN latest_ingest li
    ON li.communication_event_id = e.id
   AND li.rn = 1
  LEFT JOIN latest_reply lr
    ON lr.communication_event_id = e.id
   AND lr.rn = 1
  LEFT JOIN email_bridge eb
    ON eb.tenant_id = e.tenant_id
   AND eb.gmail_message_id = e.external_id
) src
WHERE src.event_id = ce.id
  AND (
    ce.external_thread_key IS NULL OR
    ce.provider_name IS NULL OR
    ce.managed_channel_address IS NULL OR
    ce.recipient_address IS NULL
  );

UPDATE communication_events
SET recipient_address = managed_channel_address
WHERE recipient_address IS NULL
  AND direction = 'inbound'
  AND managed_channel_address IS NOT NULL;

UPDATE communication_events
SET provider_name = 'twilio'
WHERE provider_name IS NULL
  AND source IN ('sms', 'whatsapp')
  AND managed_channel_address IS NOT NULL;
