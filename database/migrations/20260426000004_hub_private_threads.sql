-- =============================================================================
-- Migration: Private Circle Messaging
-- Layer: Hub Extension
-- Purpose: 1:1 private threads between chef and circle members
-- =============================================================================

-- Private threads: one per chef-member pair per circle
CREATE TABLE IF NOT EXISTS hub_private_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  chef_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  member_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  chef_unread_count INTEGER NOT NULL DEFAULT 0,
  member_unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, chef_profile_id, member_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_private_threads_chef
  ON hub_private_threads(chef_profile_id, group_id);

CREATE INDEX IF NOT EXISTS idx_private_threads_member
  ON hub_private_threads(member_profile_id, group_id);

-- Private messages within a thread
CREATE TABLE IF NOT EXISTS hub_private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES hub_private_threads(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_private_messages_thread_created
  ON hub_private_messages(thread_id, created_at DESC);

-- Trigger: update thread metadata on new message
CREATE OR REPLACE FUNCTION update_private_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hub_private_threads SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    updated_at = now(),
    chef_unread_count = CASE
      WHEN NEW.sender_profile_id != chef_profile_id THEN chef_unread_count + 1
      ELSE chef_unread_count
    END,
    member_unread_count = CASE
      WHEN NEW.sender_profile_id != member_profile_id THEN member_unread_count + 1
      ELSE member_unread_count
    END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_private_message_update_thread
  AFTER INSERT ON hub_private_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_private_thread_last_message();

-- RLS (permissive, app-layer validates access)
ALTER TABLE hub_private_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_private_threads_all" ON hub_private_threads
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hub_private_messages_all" ON hub_private_messages
  FOR ALL USING (true) WITH CHECK (true);
