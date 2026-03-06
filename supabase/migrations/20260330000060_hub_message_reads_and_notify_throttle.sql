-- =============================================================================
-- Hub Message Reads (per-message "seen by") + Notification Throttle
-- Additive migration: new table + new column only
-- =============================================================================

-- 1. Per-message read tracking for "Seen by" UI
CREATE TABLE IF NOT EXISTS hub_message_reads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES hub_messages(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, profile_id)
);

CREATE INDEX idx_hub_message_reads_message ON hub_message_reads(message_id);
CREATE INDEX idx_hub_message_reads_profile ON hub_message_reads(profile_id);

-- RLS
ALTER TABLE hub_message_reads ENABLE ROW LEVEL SECURITY;

-- Members can view reads for messages in their groups
CREATE POLICY hub_message_reads_select ON hub_message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hub_messages m
      JOIN hub_group_members gm ON gm.group_id = m.group_id
      JOIN hub_guest_profiles gp ON gp.id = gm.profile_id
      WHERE m.id = hub_message_reads.message_id
        AND gp.auth_user_id = auth.uid()
    )
  );

-- Members can insert their own reads
CREATE POLICY hub_message_reads_insert ON hub_message_reads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hub_guest_profiles gp
      WHERE gp.id = hub_message_reads.profile_id
        AND gp.auth_user_id = auth.uid()
    )
  );

-- 2. Notification throttle: track when each member was last notified
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;
