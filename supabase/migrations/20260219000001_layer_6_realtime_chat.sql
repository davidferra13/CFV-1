-- Layer 6: Real-Time Chat System
-- Phase 1: Chef ↔ Client instant messaging with rich content
-- Schema designed for Phase 2 extensibility (chef-chef, groups, co-hosting)
--
-- New tables: conversations, conversation_participants, chat_messages
-- Named chat_messages to avoid collision with existing CRM messages table

-- ─── Enums ──────────────────────────────────────────────────────────────

CREATE TYPE chat_message_type AS ENUM (
  'text',           -- Plain text message
  'image',          -- Image attachment
  'link',           -- URL shared (with optional preview metadata)
  'event_ref',      -- Reference to an event (renders as card)
  'system'          -- Auto-generated system message
);

COMMENT ON TYPE chat_message_type IS 'Content types for chat messages — extensible for Phase 2';

CREATE TYPE conversation_context_type AS ENUM (
  'standalone',     -- General conversation, no specific context
  'inquiry',        -- Linked to an inquiry
  'event'           -- Linked to an event
  -- Phase 2 adds: 'chef_connection'
);

COMMENT ON TYPE conversation_context_type IS 'What entity a conversation is linked to';

-- ─── Tables ─────────────────────────────────────────────────────────────

-- Conversations: groups messages between participants
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scoping: the chef who owns this conversation
  -- Phase 2 chef-chef chats may use NULL or different scoping
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Context linking (optional)
  context_type conversation_context_type NOT NULL DEFAULT 'standalone',
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Denormalized for efficient inbox queries (updated via trigger)
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,          -- First 100 chars of last message
  last_message_sender_id UUID,        -- auth_user_id of last sender

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure context consistency: FK must match context_type
  CONSTRAINT valid_context CHECK (
    (context_type = 'standalone' AND inquiry_id IS NULL AND event_id IS NULL) OR
    (context_type = 'inquiry' AND inquiry_id IS NOT NULL) OR
    (context_type = 'event' AND event_id IS NOT NULL)
  )
);

COMMENT ON TABLE conversations IS 'Groups messages between participants. Optionally linked to an inquiry or event.';

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_last_msg ON conversations(tenant_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_inquiry ON conversations(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_conversations_event ON conversations(event_id) WHERE event_id IS NOT NULL;


-- Conversation participants: join table supporting N participants (Phase 2 groups)
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role in this conversation (extensible for Phase 2: co_host, admin)
  role user_role NOT NULL, -- Reuse existing 'chef' | 'client' enum from Layer 1

  -- Per-participant state
  last_read_at TIMESTAMPTZ,           -- Timestamp of last message they've seen
  notifications_muted BOOLEAN DEFAULT false NOT NULL,

  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- A user can only be in a conversation once
  UNIQUE(conversation_id, auth_user_id)
);

COMMENT ON TABLE conversation_participants IS 'Join table linking users to conversations. Supports N participants for Phase 2 groups.';

CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(auth_user_id);


-- Chat messages: the actual messages in conversations
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),

  -- Content
  message_type chat_message_type NOT NULL DEFAULT 'text',
  body TEXT,                           -- Text content (NULL for image-only messages)

  -- Image attachment fields (for message_type = 'image')
  attachment_storage_path TEXT,        -- Supabase Storage path
  attachment_filename TEXT,            -- Original filename
  attachment_content_type TEXT,        -- MIME type (image/jpeg, etc.)
  attachment_size_bytes INTEGER,       -- File size for UI display

  -- Link metadata (for message_type = 'link')
  link_url TEXT,
  link_title TEXT,                     -- og:title if fetched
  link_description TEXT,               -- og:description if fetched
  link_image_url TEXT,                 -- og:image if fetched

  -- Event reference (for message_type = 'event_ref')
  referenced_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- System message context (for message_type = 'system')
  system_event_type TEXT,              -- e.g., 'event_status_changed', 'quote_sent'
  system_metadata JSONB,               -- Additional context: { from_status, to_status, ... }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  edited_at TIMESTAMPTZ,               -- NULL if never edited
  deleted_at TIMESTAMPTZ               -- Soft delete (NULL = active)
);

COMMENT ON TABLE chat_messages IS 'Chat messages within conversations. Supports text, images, links, event references, and system messages.';

-- Critical index for message pagination (newest first within conversation)
CREATE INDEX idx_chat_messages_conversation_active ON chat_messages(conversation_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_referenced_event ON chat_messages(referenced_event_id)
  WHERE referenced_event_id IS NOT NULL;


-- ─── Triggers ───────────────────────────────────────────────────────────

-- Auto-update updated_at on conversations (reuses existing function from Layer 1)
CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation's denormalized last_message fields when a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
  preview TEXT;
BEGIN
  -- Build preview text based on message type
  CASE NEW.message_type
    WHEN 'text' THEN preview := LEFT(NEW.body, 100);
    WHEN 'image' THEN preview := COALESCE(LEFT(NEW.body, 80), '') || CASE WHEN NEW.body IS NOT NULL AND LENGTH(NEW.body) > 0 THEN ' [Photo]' ELSE '[Photo]' END;
    WHEN 'link' THEN preview := COALESCE(LEFT(NEW.body, 80), NEW.link_url);
    WHEN 'event_ref' THEN preview := COALESCE(LEFT(NEW.body, 80), '[Event shared]');
    WHEN 'system' THEN preview := LEFT(NEW.body, 100);
    ELSE preview := LEFT(COALESCE(NEW.body, ''), 100);
  END CASE;

  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = preview,
    last_message_sender_id = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_conversation_last_message IS 'Denormalizes last message info onto conversations table for efficient inbox queries';

CREATE TRIGGER chat_messages_update_conversation
AFTER INSERT ON chat_messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION update_conversation_last_message();


-- ─── Helper Functions ───────────────────────────────────────────────────

-- Check if current user is a participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND auth_user_id = auth.uid()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_conversation_participant IS 'Returns true if the current auth user is a participant in the given conversation';

-- Get unread counts for a user across all their conversations
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
  SELECT
    cp.conversation_id,
    COUNT(cm.id) AS unread_count
  FROM conversation_participants cp
  LEFT JOIN chat_messages cm ON cm.conversation_id = cp.conversation_id
    AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    AND cm.sender_id != p_user_id
    AND cm.deleted_at IS NULL
  WHERE cp.auth_user_id = p_user_id
  GROUP BY cp.conversation_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_counts IS 'Returns unread message count per conversation for a given user';

-- Get total unread count for a user (for nav badge)
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(unread_count), 0)
  FROM get_unread_counts(p_user_id)
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_total_unread_count IS 'Returns total unread messages across all conversations for nav badge';


-- ─── Row Level Security ─────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS POLICIES

-- Users can see conversations they participate in
CREATE POLICY conversations_participant_select ON conversations
  FOR SELECT USING (is_conversation_participant(id));

-- Chefs can create conversations in their tenant
CREATE POLICY conversations_chef_insert ON conversations
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Allow updates on conversations (for trigger-based denormalized field updates)
-- The trigger runs as SECURITY DEFINER so it bypasses RLS, but we also allow
-- chef updates for manual operations
CREATE POLICY conversations_chef_update ON conversations
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );


-- CONVERSATION_PARTICIPANTS POLICIES

-- Participants can see who else is in their conversations
CREATE POLICY conv_participants_participant_select ON conversation_participants
  FOR SELECT USING (
    is_conversation_participant(conversation_id)
  );

-- Chefs can add participants to conversations in their tenant
CREATE POLICY conv_participants_chef_insert ON conversation_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND tenant_id = get_current_tenant_id()
    )
  );

-- Users can update their own participant record (last_read_at, notifications_muted)
CREATE POLICY conv_participants_self_update ON conversation_participants
  FOR UPDATE USING (auth_user_id = auth.uid());


-- CHAT_MESSAGES POLICIES

-- Participants can read messages in their conversations
CREATE POLICY chat_messages_participant_select ON chat_messages
  FOR SELECT USING (is_conversation_participant(conversation_id));

-- Participants can send messages into their conversations (must be themselves)
CREATE POLICY chat_messages_participant_insert ON chat_messages
  FOR INSERT WITH CHECK (
    is_conversation_participant(conversation_id) AND
    sender_id = auth.uid()
  );

-- Senders can update their own messages (for soft delete / edit)
CREATE POLICY chat_messages_sender_update ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- No hard deletes on chat_messages
CREATE POLICY chat_messages_no_delete ON chat_messages
  FOR DELETE USING (false);


-- ─── End of Layer 6 ─────────────────────────────────────────────────────
