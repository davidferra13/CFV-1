-- ============================================================================
-- Communication Intake + Triage Subsystem (Additive)
-- Signal-only layer. Does not mutate inquiry/event/menu/payment lifecycles.
-- ============================================================================

-- Core enums
DO $$ BEGIN
  CREATE TYPE communication_source AS ENUM ('email', 'website_form', 'sms', 'instagram', 'takeachef', 'manual_log');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE communication_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE communication_event_status AS ENUM ('unlinked', 'linked', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conversation_thread_state AS ENUM ('active', 'snoozed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE suggested_link_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE follow_up_timer_status AS ENUM ('active', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE communication_action_source AS ENUM ('manual', 'webhook', 'automation', 'import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ConversationThread
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  external_thread_key TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state conversation_thread_state NOT NULL DEFAULT 'active',
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CommunicationEvent
CREATE TABLE IF NOT EXISTS communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source communication_source NOT NULL,
  external_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  sender_identity TEXT NOT NULL,
  resolved_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  raw_content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  direction communication_direction NOT NULL,
  linked_entity_type TEXT CHECK (linked_entity_type IN ('inquiry', 'event') OR linked_entity_type IS NULL),
  linked_entity_id UUID,
  status communication_event_status NOT NULL DEFAULT 'unlinked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SuggestedLink
CREATE TABLE IF NOT EXISTS suggested_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  communication_event_id UUID NOT NULL REFERENCES communication_events(id) ON DELETE CASCADE,
  suggested_entity_type TEXT NOT NULL CHECK (suggested_entity_type IN ('inquiry', 'event')),
  suggested_entity_id UUID NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status suggested_link_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FollowUpTimer
CREATE TABLE IF NOT EXISTS follow_up_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status follow_up_timer_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Editable deterministic classification rules
CREATE TABLE IF NOT EXISTS communication_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  match_field TEXT NOT NULL CHECK (match_field IN ('sender_identity', 'normalized_content', 'source', 'direction')),
  operator TEXT NOT NULL CHECK (operator IN ('contains', 'equals', 'starts_with')),
  match_value TEXT NOT NULL,
  label TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explicit action audit for communication subsystem
CREATE TABLE IF NOT EXISTS communication_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  communication_event_id UUID REFERENCES communication_events(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  source communication_action_source NOT NULL,
  previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comm_events_tenant_timestamp
  ON communication_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comm_events_thread
  ON communication_events(tenant_id, thread_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comm_events_status
  ON communication_events(tenant_id, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comm_events_sender
  ON communication_events(tenant_id, sender_identity);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_events_external
  ON communication_events(tenant_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_threads_tenant_activity
  ON conversation_threads(tenant_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_tenant_state
  ON conversation_threads(tenant_id, state, last_activity_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_threads_external_key
  ON conversation_threads(tenant_id, external_thread_key)
  WHERE external_thread_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suggested_links_event
  ON suggested_links(tenant_id, communication_event_id, status);

CREATE INDEX IF NOT EXISTS idx_followup_tenant_due
  ON follow_up_timers(tenant_id, due_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_followup_thread
  ON follow_up_timers(tenant_id, thread_id, status);

CREATE INDEX IF NOT EXISTS idx_comm_action_log_tenant_time
  ON communication_action_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_action_log_event
  ON communication_action_log(tenant_id, communication_event_id, created_at DESC);

-- updated_at triggers
DROP TRIGGER IF EXISTS conversation_threads_updated_at ON conversation_threads;
CREATE TRIGGER conversation_threads_updated_at
BEFORE UPDATE ON conversation_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS communication_events_updated_at ON communication_events;
CREATE TRIGGER communication_events_updated_at
BEFORE UPDATE ON communication_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS suggested_links_updated_at ON suggested_links;
CREATE TRIGGER suggested_links_updated_at
BEFORE UPDATE ON suggested_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS communication_classification_rules_updated_at ON communication_classification_rules;
CREATE TRIGGER communication_classification_rules_updated_at
BEFORE UPDATE ON communication_classification_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_action_log ENABLE ROW LEVEL SECURITY;

-- Chef tenant-scoped access
CREATE POLICY communication_threads_chef_all ON conversation_threads
FOR ALL
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY communication_events_chef_all ON communication_events
FOR ALL
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY suggested_links_chef_all ON suggested_links
FOR ALL
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY follow_up_timers_chef_all ON follow_up_timers
FOR ALL
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY communication_rules_chef_all ON communication_classification_rules
FOR ALL
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY communication_action_log_chef_select ON communication_action_log
FOR SELECT
USING (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

CREATE POLICY communication_action_log_chef_insert ON communication_action_log
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  )
);

-- Service role management for webhook/import pipelines
CREATE POLICY communication_threads_service_all ON conversation_threads
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY communication_events_service_all ON communication_events
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY suggested_links_service_all ON suggested_links
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY follow_up_timers_service_all ON follow_up_timers
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY communication_rules_service_all ON communication_classification_rules
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY communication_action_log_service_all ON communication_action_log
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Triage inbox view (thread-level latest signal)
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
  ) AS needs_attention
FROM conversation_threads ct
JOIN latest_event le ON le.thread_id = ct.id
LEFT JOIN overdue_timer ot ON ot.thread_id = ct.id
LEFT JOIN pending_links pl ON pl.communication_event_id = le.communication_event_id;

