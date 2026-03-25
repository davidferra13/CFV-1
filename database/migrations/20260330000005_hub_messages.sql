-- =============================================================================
-- Migration: Social Event Hub — Messages & Reactions
-- Layer: Hub Foundation
-- Purpose: Group chat thread with reactions, pinning, and reply threading
-- =============================================================================

-- Hub messages — the group chat
CREATE TABLE IF NOT EXISTS hub_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Content type
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN (
      'text', 'image', 'system', 'poll',
      'rsvp_update', 'menu_update', 'note', 'photo_share'
    )),
  body TEXT,

  -- Media attachments
  media_urls TEXT[] DEFAULT '{}',
  media_captions TEXT[] DEFAULT '{}',

  -- Pinning
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_by_profile_id UUID REFERENCES hub_guest_profiles(id),
  pinned_at TIMESTAMPTZ,

  -- System message context
  system_event_type TEXT,
  system_metadata JSONB,

  -- Reply threading
  reply_to_message_id UUID REFERENCES hub_messages(id) ON DELETE SET NULL,

  -- Denormalized reaction counts for display
  reaction_counts JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hub_messages_group_created
  ON hub_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hub_messages_author
  ON hub_messages(author_profile_id);

CREATE INDEX IF NOT EXISTS idx_hub_messages_pinned
  ON hub_messages(group_id)
  WHERE is_pinned = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hub_messages_replies
  ON hub_messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- Emoji reactions
CREATE TABLE IF NOT EXISTS hub_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES hub_messages(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(message_id, profile_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_hub_message_reactions_message
  ON hub_message_reactions(message_id);

-- RLS
ALTER TABLE hub_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_message_reactions ENABLE ROW LEVEL SECURITY;

-- Messages: public read (link-based group access validated in app layer)
DROP POLICY IF EXISTS "hub_messages_select_anon" ON hub_messages;
CREATE POLICY "hub_messages_select_anon" ON hub_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hub_messages_insert_anon" ON hub_messages;
CREATE POLICY "hub_messages_insert_anon" ON hub_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "hub_messages_manage_service" ON hub_messages;
CREATE POLICY "hub_messages_manage_service" ON hub_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Reactions: public read/write
DROP POLICY IF EXISTS "hub_message_reactions_select_anon" ON hub_message_reactions;
CREATE POLICY "hub_message_reactions_select_anon" ON hub_message_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hub_message_reactions_insert_anon" ON hub_message_reactions;
CREATE POLICY "hub_message_reactions_insert_anon" ON hub_message_reactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "hub_message_reactions_delete_anon" ON hub_message_reactions;
CREATE POLICY "hub_message_reactions_delete_anon" ON hub_message_reactions
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "hub_message_reactions_manage_service" ON hub_message_reactions;
CREATE POLICY "hub_message_reactions_manage_service" ON hub_message_reactions
  FOR ALL USING (auth.role() = 'service_role');

-- Denormalized last-message fields on groups for inbox sorting
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

-- Function to update group last-message on new message insert
CREATE OR REPLACE FUNCTION update_hub_group_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hub_groups SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    message_count = message_count + 1,
    updated_at = now()
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hub_message_update_group
  AFTER INSERT ON hub_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_hub_group_last_message();
