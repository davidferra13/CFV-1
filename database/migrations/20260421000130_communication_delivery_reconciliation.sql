-- Normalizes provider delivery lifecycle back into the canonical communication
-- model so current state no longer has to be reconstructed from action-log replay.

DO $$ BEGIN
  CREATE TYPE communication_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE communication_events
  ADD COLUMN IF NOT EXISTS provider_delivery_status communication_delivery_status,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_error_code TEXT,
  ADD COLUMN IF NOT EXISTS provider_error_message TEXT;

ALTER TABLE conversation_threads
  ADD COLUMN IF NOT EXISTS latest_outbound_event_id UUID REFERENCES communication_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS latest_outbound_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_outbound_delivery_status communication_delivery_status,
  ADD COLUMN IF NOT EXISTS latest_outbound_provider_status TEXT,
  ADD COLUMN IF NOT EXISTS latest_outbound_status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_outbound_error_code TEXT,
  ADD COLUMN IF NOT EXISTS latest_outbound_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_comm_events_delivery_status
  ON communication_events(tenant_id, provider_delivery_status, provider_status_updated_at DESC)
  WHERE provider_delivery_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_threads_latest_outbound_delivery
  ON conversation_threads(tenant_id, latest_outbound_delivery_status, latest_outbound_status_updated_at DESC)
  WHERE latest_outbound_delivery_status IS NOT NULL;

COMMENT ON COLUMN communication_events.provider_delivery_status IS
  'Canonical current delivery state for outbound provider-backed communication.';
COMMENT ON COLUMN communication_events.provider_status IS
  'Latest raw provider lifecycle status, preserved alongside the canonical delivery state.';
COMMENT ON COLUMN conversation_threads.latest_outbound_event_id IS
  'Latest outbound event attempt for the thread when a canonical event exists.';
COMMENT ON COLUMN conversation_threads.latest_outbound_delivery_status IS
  'Latest outbound delivery state for the thread, including failures that do not produce a canonical event.';

WITH delivery_log_candidates AS (
  SELECT
    communication_event_id,
    action,
    created_at,
    lower(trim(COALESCE(new_state->>'provider_status', ''))) AS raw_provider_status,
    new_state->>'error_code' AS error_code,
    COALESCE(new_state->>'error_message', new_state->>'error') AS error_message,
    row_number() OVER (
      PARTITION BY communication_event_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM communication_action_log
  WHERE communication_event_id IS NOT NULL
    AND action IN ('reply_sent_via_channel', 'provider_message_status_updated')
),
latest_delivery_log AS (
  SELECT *
  FROM delivery_log_candidates
  WHERE rn = 1
),
delivery_milestones AS (
  SELECT
    communication_event_id,
    min(created_at) FILTER (WHERE raw_provider_status = 'delivered') AS delivered_at,
    min(created_at) FILTER (WHERE raw_provider_status = 'read') AS read_at,
    min(created_at) FILTER (
      WHERE raw_provider_status IN ('failed', 'undelivered', 'rejected', 'cancelled', 'canceled')
    ) AS failed_at
  FROM delivery_log_candidates
  GROUP BY communication_event_id
)
UPDATE communication_events ce
SET
  provider_delivery_status = COALESCE(
    ce.provider_delivery_status,
    CASE
      WHEN ldl.raw_provider_status = 'read' THEN 'read'::communication_delivery_status
      WHEN ldl.raw_provider_status = 'delivered' THEN 'delivered'::communication_delivery_status
      WHEN ldl.raw_provider_status IN ('failed', 'undelivered', 'rejected', 'cancelled', 'canceled')
        THEN 'failed'::communication_delivery_status
      WHEN ldl.raw_provider_status = 'sent' THEN 'sent'::communication_delivery_status
      WHEN ldl.raw_provider_status IN ('accepted', 'queued', 'scheduled', 'sending', 'submitted')
        THEN 'pending'::communication_delivery_status
      WHEN ldl.action = 'reply_sent_via_channel' THEN 'sent'::communication_delivery_status
      ELSE NULL
    END
  ),
  provider_status = COALESCE(ce.provider_status, NULLIF(ldl.raw_provider_status, '')),
  provider_status_updated_at = COALESCE(ce.provider_status_updated_at, ldl.created_at),
  provider_delivered_at = COALESCE(ce.provider_delivered_at, dm.delivered_at),
  provider_read_at = COALESCE(ce.provider_read_at, dm.read_at),
  provider_failed_at = COALESCE(ce.provider_failed_at, dm.failed_at),
  provider_error_code = COALESCE(
    ce.provider_error_code,
    CASE
      WHEN ldl.raw_provider_status IN ('failed', 'undelivered', 'rejected', 'cancelled', 'canceled')
        THEN ldl.error_code
      ELSE NULL
    END
  ),
  provider_error_message = COALESCE(
    ce.provider_error_message,
    CASE
      WHEN ldl.raw_provider_status IN ('failed', 'undelivered', 'rejected', 'cancelled', 'canceled')
        THEN ldl.error_message
      ELSE NULL
    END
  )
FROM latest_delivery_log ldl
LEFT JOIN delivery_milestones dm
  ON dm.communication_event_id = ldl.communication_event_id
WHERE ce.id = ldl.communication_event_id
  AND ce.tenant_id IS NOT NULL;

WITH latest_outbound_event AS (
  SELECT DISTINCT ON (ce.thread_id)
    ce.thread_id,
    ce.id AS communication_event_id,
    ce.timestamp,
    ce.provider_delivery_status,
    ce.provider_status,
    COALESCE(ce.provider_status_updated_at, ce.timestamp) AS provider_status_updated_at,
    ce.provider_error_code,
    ce.provider_error_message
  FROM communication_events ce
  WHERE ce.direction = 'outbound'
  ORDER BY ce.thread_id, ce.timestamp DESC, ce.created_at DESC
)
UPDATE conversation_threads ct
SET
  latest_outbound_event_id = COALESCE(ct.latest_outbound_event_id, loe.communication_event_id),
  latest_outbound_attempted_at = COALESCE(ct.latest_outbound_attempted_at, loe.timestamp),
  latest_outbound_delivery_status = COALESCE(
    ct.latest_outbound_delivery_status,
    loe.provider_delivery_status
  ),
  latest_outbound_provider_status = COALESCE(
    ct.latest_outbound_provider_status,
    loe.provider_status
  ),
  latest_outbound_status_updated_at = COALESCE(
    ct.latest_outbound_status_updated_at,
    loe.provider_status_updated_at
  ),
  latest_outbound_error_code = COALESCE(
    ct.latest_outbound_error_code,
    CASE
      WHEN loe.provider_delivery_status = 'failed'::communication_delivery_status
        THEN loe.provider_error_code
      ELSE NULL
    END
  ),
  latest_outbound_error_message = COALESCE(
    ct.latest_outbound_error_message,
    CASE
      WHEN loe.provider_delivery_status = 'failed'::communication_delivery_status
        THEN loe.provider_error_message
      ELSE NULL
    END
  )
FROM latest_outbound_event loe
WHERE ct.id = loe.thread_id
  AND ct.tenant_id IS NOT NULL;
