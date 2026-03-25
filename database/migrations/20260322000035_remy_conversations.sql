-- Remy Conversations: threaded conversation support for the AI companion.
-- Each conversation is a separate thread with its own messages.
-- Chefs can start new conversations, switch between them, and review history.

CREATE TABLE IF NOT EXISTS remy_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New conversation',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing conversations (most recent first)
CREATE INDEX idx_remy_conversations_tenant_recent
  ON remy_conversations(tenant_id, updated_at DESC)
  WHERE is_active = true;

-- RLS
ALTER TABLE remy_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_conversations_select ON remy_conversations;
CREATE POLICY remy_conversations_select ON remy_conversations
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_conversations_insert ON remy_conversations;
CREATE POLICY remy_conversations_insert ON remy_conversations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_conversations_update ON remy_conversations;
CREATE POLICY remy_conversations_update ON remy_conversations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_conversations_delete ON remy_conversations;
CREATE POLICY remy_conversations_delete ON remy_conversations
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

CREATE TRIGGER set_remy_conversations_updated_at
  BEFORE UPDATE ON remy_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Remy Messages: individual messages within a conversation thread.

CREATE TABLE IF NOT EXISTS remy_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES remy_conversations(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'remy')),
  content         TEXT NOT NULL,
  tasks           JSONB,           -- task result cards (if any)
  nav_suggestions JSONB,           -- navigation suggestions (if any)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for loading messages in a conversation (chronological)
CREATE INDEX idx_remy_messages_conversation
  ON remy_messages(conversation_id, created_at ASC);

-- Index for tenant scoping
CREATE INDEX idx_remy_messages_tenant
  ON remy_messages(tenant_id, created_at DESC);

-- RLS
ALTER TABLE remy_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_messages_select ON remy_messages;
CREATE POLICY remy_messages_select ON remy_messages
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_messages_insert ON remy_messages;
CREATE POLICY remy_messages_insert ON remy_messages
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Messages are immutable once created — no update or delete policies
-- (Conversation-level delete cascades handle cleanup)
