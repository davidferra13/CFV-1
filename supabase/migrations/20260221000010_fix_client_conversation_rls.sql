-- Fix: Client Conversation RLS Policies
--
-- Bug: conversations_client_insert and conv_participants_client_insert
-- policies used get_current_tenant_id(), which returns the chef's entity_id
-- from user_roles. For client users this returns NULL, so the check
-- `tenant_id = NULL` is always false -- clients could never create conversations.
--
-- Fix: Derive tenant_id from the client's own record via get_current_client_id().

-- ── 1. Fix conversations INSERT policy ──────────────────────────────────────

DROP POLICY IF EXISTS conversations_client_insert ON conversations;
CREATE POLICY conversations_client_insert ON conversations
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client' AND
    tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
  );
-- ── 2. Fix conversation_participants INSERT policy ──────────────────────────

DROP POLICY IF EXISTS conv_participants_client_insert ON conversation_participants;
CREATE POLICY conv_participants_client_insert ON conversation_participants
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'client' AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
    )
  );
