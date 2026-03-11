-- ============================================================================
-- Communication Inbox Concierge Features: VIP starring + inbox view update
-- ============================================================================

ALTER TABLE conversation_threads
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_conversation_threads_starred
  ON conversation_threads(tenant_id, is_starred, last_activity_at DESC);
CREATE OR REPLACE VIEW communication_inbox_items AS
WITH latest_event AS (
  SELECT DISTINCT ON (ce.thread_id)
    ce.id AS communication_event_id,
    ce.tenant_id,
    ce.thread_id,
    ce.timestamp,
    ce.sender_identity,
    ce.source,
    ce.direction,
    ce.raw_content,
    ce.normalized_content,
    ce.status AS communication_status,
    ce.linked_entity_type,
    ce.linked_entity_id,
    ce.resolved_client_id
  FROM communication_events ce
  ORDER BY ce.thread_id, ce.timestamp DESC, ce.created_at DESC
),
overdue_timer AS (
  SELECT
    fut.thread_id,
    MIN(fut.due_at) AS next_due_at,
    BOOL_OR(fut.status = 'active' AND fut.due_at <= now()) AS has_overdue
  FROM follow_up_timers fut
  GROUP BY fut.thread_id
),
pending_links AS (
  SELECT
    sl.communication_event_id,
    COUNT(*) FILTER (WHERE sl.status = 'pending') AS pending_link_count,
    MAX(sl.confidence_score) FILTER (WHERE sl.status = 'pending') AS top_pending_confidence
  FROM suggested_links sl
  GROUP BY sl.communication_event_id
)
SELECT
  ct.id AS thread_id,
  ct.tenant_id,
  ct.client_id,
  ct.last_activity_at,
  ct.state AS thread_state,
  ct.snoozed_until,
  le.communication_event_id,
  le.timestamp AS event_timestamp,
  le.sender_identity,
  le.source,
  le.direction,
  le.raw_content,
  le.normalized_content,
  le.communication_status,
  le.linked_entity_type,
  le.linked_entity_id,
  le.resolved_client_id,
  COALESCE(ot.next_due_at, NULL) AS next_follow_up_due_at,
  COALESCE(ot.has_overdue, false) AS has_overdue_follow_up,
  COALESCE(pl.pending_link_count, 0) AS pending_link_count,
  COALESCE(pl.top_pending_confidence, 0) AS top_pending_confidence,
  CASE
    WHEN ct.state = 'snoozed' AND (ct.snoozed_until IS NULL OR ct.snoozed_until > now()) THEN 'snoozed'
    WHEN le.communication_status = 'resolved' OR ct.state = 'closed' THEN 'resolved'
    WHEN le.communication_status = 'unlinked' THEN 'unlinked'
    ELSE 'needs_attention'
  END AS tab,
  (
    (COALESCE(ot.has_overdue, false) = true AND ct.state = 'active')
    OR (le.communication_status = 'unlinked' AND ct.state = 'active')
    OR (COALESCE(pl.pending_link_count, 0) > 0 AND ct.state = 'active')
  ) AS needs_attention,
  ct.is_starred
FROM conversation_threads ct
JOIN latest_event le ON le.thread_id = ct.id
LEFT JOIN overdue_timer ot ON ot.thread_id = ct.id
LEFT JOIN pending_links pl ON pl.communication_event_id = le.communication_event_id;
GRANT SELECT ON TABLE communication_inbox_items TO authenticated;
GRANT SELECT ON TABLE communication_inbox_items TO service_role;
