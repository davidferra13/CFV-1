-- =============================================================================
-- Migration: Social Event Hub — Polls
-- Layer: Hub Foundation
-- Purpose: Theme voting, date picking, menu preference polls in hub groups
-- =============================================================================

-- Polls
CREATE TABLE IF NOT EXISTS hub_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  message_id UUID REFERENCES hub_messages(id) ON DELETE SET NULL,

  question TEXT NOT NULL,
  poll_type TEXT NOT NULL DEFAULT 'single_choice'
    CHECK (poll_type IN ('single_choice', 'multi_choice')),
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_polls_group
  ON hub_polls(group_id);

CREATE INDEX IF NOT EXISTS idx_hub_polls_message
  ON hub_polls(message_id)
  WHERE message_id IS NOT NULL;

-- Poll options
CREATE TABLE IF NOT EXISTS hub_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES hub_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  metadata JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hub_poll_options_poll
  ON hub_poll_options(poll_id, sort_order);

-- Poll votes
CREATE TABLE IF NOT EXISTS hub_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES hub_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES hub_poll_options(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One vote per person per option (multi_choice allows multiple options)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_poll_votes_unique
  ON hub_poll_votes(poll_id, profile_id, option_id);

CREATE INDEX IF NOT EXISTS idx_hub_poll_votes_poll
  ON hub_poll_votes(poll_id);

CREATE INDEX IF NOT EXISTS idx_hub_poll_votes_option
  ON hub_poll_votes(option_id);

-- RLS
ALTER TABLE hub_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls: public read
CREATE POLICY "hub_polls_select_anon" ON hub_polls
  FOR SELECT USING (true);

CREATE POLICY "hub_polls_insert_anon" ON hub_polls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "hub_polls_manage_service" ON hub_polls
  FOR ALL USING (auth.role() = 'service_role');

-- Options: public read
CREATE POLICY "hub_poll_options_select_anon" ON hub_poll_options
  FOR SELECT USING (true);

CREATE POLICY "hub_poll_options_insert_anon" ON hub_poll_options
  FOR INSERT WITH CHECK (true);

CREATE POLICY "hub_poll_options_manage_service" ON hub_poll_options
  FOR ALL USING (auth.role() = 'service_role');

-- Votes: public read/insert/delete (change vote)
CREATE POLICY "hub_poll_votes_select_anon" ON hub_poll_votes
  FOR SELECT USING (true);

CREATE POLICY "hub_poll_votes_insert_anon" ON hub_poll_votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "hub_poll_votes_delete_anon" ON hub_poll_votes
  FOR DELETE USING (true);

CREATE POLICY "hub_poll_votes_manage_service" ON hub_poll_votes
  FOR ALL USING (auth.role() = 'service_role');
