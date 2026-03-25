-- Client Conversation Creation
-- Allows clients to initiate conversations with their chef.
-- Previously only chefs could create conversations.
--
-- Changes:
--   1. RLS INSERT policy on conversations for clients in their tenant
--   2. RLS INSERT policy on conversation_participants for clients
--
-- Note: Uses DROP IF EXISTS + CREATE to be idempotent (policies may already exist)

-- ─── 1. Client can create conversations ────────────────────────────────────

DROP POLICY IF EXISTS conversations_client_insert ON conversations;
CREATE POLICY conversations_client_insert ON conversations
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client' AND
    tenant_id = get_current_tenant_id()
  );

-- ─── 2. Client can add participants to their conversations ─────────────────

DROP POLICY IF EXISTS conv_participants_client_insert ON conversation_participants;
CREATE POLICY conv_participants_client_insert ON conversation_participants
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client' AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND tenant_id = get_current_tenant_id()
    )
  );
