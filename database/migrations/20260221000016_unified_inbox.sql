-- ============================================================================
-- Unified Inbox — Phase 2
-- Creates a VIEW that aggregates conversations, CRM messages, Wix submissions,
-- and notifications into a single chronological feed.
-- Uses a VIEW (not materialized) to stay always-current without triggers.
-- ============================================================================

CREATE VIEW unified_inbox AS

-- Conversations (real-time chat, grouped at conversation level)
SELECT
  c.id,
  c.tenant_id,
  'chat'::TEXT AS source,
  c.last_message_preview AS preview,
  COALESCE(c.last_message_at, c.created_at) AS activity_at,
  c.last_message_sender_id AS actor_id,
  NULL::UUID AS conversation_id,  -- this IS the conversation
  c.inquiry_id,
  c.event_id,
  NULL::UUID AS client_id,
  c.context_type::TEXT AS content_type,
  FALSE AS is_read
FROM conversations c
WHERE c.last_message_at IS NOT NULL

UNION ALL

-- CRM messages (communication log: email, text, phone, etc.)
SELECT
  m.id,
  m.tenant_id,
  'message'::TEXT AS source,
  CASE
    WHEN m.subject IS NOT NULL AND m.subject != '' THEN m.subject || ': ' || LEFT(m.body, 150)
    ELSE LEFT(m.body, 200)
  END AS preview,
  COALESCE(m.sent_at, m.created_at) AS activity_at,
  m.from_user_id AS actor_id,
  NULL::UUID AS conversation_id,
  m.inquiry_id,
  m.event_id,
  m.client_id,
  m.channel::TEXT AS content_type,
  FALSE AS is_read
FROM messages m
WHERE m.status IN ('sent', 'logged')

UNION ALL

-- Wix form submissions
SELECT
  ws.id,
  ws.tenant_id,
  'wix'::TEXT AS source,
  CASE
    WHEN ws.submitter_name IS NOT NULL THEN ws.submitter_name || ' submitted a form'
    WHEN ws.submitter_email IS NOT NULL THEN ws.submitter_email || ' submitted a form'
    ELSE 'New Wix form submission'
  END AS preview,
  ws.created_at AS activity_at,
  NULL::UUID AS actor_id,
  NULL::UUID AS conversation_id,
  ws.inquiry_id,
  NULL::UUID AS event_id,
  ws.client_id,
  'wix_form'::TEXT AS content_type,
  ws.status = 'completed' AS is_read
FROM wix_submissions ws

UNION ALL

-- Notifications (system events)
SELECT
  n.id,
  n.tenant_id,
  'notification'::TEXT AS source,
  COALESCE(n.body, n.title) AS preview,
  n.created_at AS activity_at,
  NULL::UUID AS actor_id,
  NULL::UUID AS conversation_id,
  n.inquiry_id,
  n.event_id,
  n.client_id,
  n.action AS content_type,
  n.read_at IS NOT NULL AS is_read
FROM notifications n
WHERE n.archived_at IS NULL;
