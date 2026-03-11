-- =============================================================================
-- Migration: Social Event Hub — Groups
-- Layer: Hub Foundation
-- Purpose: Social groups for event planning and ongoing dinner clubs
-- =============================================================================

-- Hub groups — social containers (event-bound or standalone)
CREATE TABLE IF NOT EXISTS hub_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional bindings (all nullable — standalone groups have none)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_stub_id UUID REFERENCES event_stubs(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,

  -- Group identity
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  emoji TEXT,

  -- Shareable token (what gets texted to friends)
  group_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Theme
  theme_id UUID REFERENCES event_themes(id) ON DELETE SET NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_member_invites BOOLEAN NOT NULL DEFAULT true,

  -- Creator
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Group token lookup (for share links)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_groups_token
  ON hub_groups(group_token);
CREATE INDEX IF NOT EXISTS idx_hub_groups_event
  ON hub_groups(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hub_groups_stub
  ON hub_groups(event_stub_id) WHERE event_stub_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hub_groups_tenant
  ON hub_groups(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hub_groups_creator
  ON hub_groups(created_by_profile_id);
-- Group members
CREATE TABLE IF NOT EXISTS hub_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'chef', 'member', 'viewer')),

  -- Permissions
  can_post BOOLEAN NOT NULL DEFAULT true,
  can_invite BOOLEAN NOT NULL DEFAULT false,
  can_pin BOOLEAN NOT NULL DEFAULT false,

  -- State
  last_read_at TIMESTAMPTZ,
  notifications_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(group_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_hub_group_members_profile
  ON hub_group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_hub_group_members_group
  ON hub_group_members(group_id);
-- Link multiple events to one group (dinner clubs, recurring groups)
CREATE TABLE IF NOT EXISTS hub_group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(group_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_hub_group_events_group
  ON hub_group_events(group_id);
-- Add hub_group_id back-reference to event_stubs
ALTER TABLE event_stubs ADD COLUMN IF NOT EXISTS hub_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL;
-- Add hub_group_id to event_shares for linking
ALTER TABLE event_shares ADD COLUMN IF NOT EXISTS hub_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL;
-- RLS
ALTER TABLE hub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_group_events ENABLE ROW LEVEL SECURITY;
-- Groups: public read (link-based access)
CREATE POLICY "hub_groups_select_anon" ON hub_groups
  FOR SELECT USING (true);
CREATE POLICY "hub_groups_insert_anon" ON hub_groups
  FOR INSERT WITH CHECK (true);
CREATE POLICY "hub_groups_manage_service" ON hub_groups
  FOR ALL USING (auth.role() = 'service_role');
-- Members: public read
CREATE POLICY "hub_group_members_select_anon" ON hub_group_members
  FOR SELECT USING (true);
CREATE POLICY "hub_group_members_insert_anon" ON hub_group_members
  FOR INSERT WITH CHECK (true);
CREATE POLICY "hub_group_members_manage_service" ON hub_group_members
  FOR ALL USING (auth.role() = 'service_role');
-- Group events: public read
CREATE POLICY "hub_group_events_select_anon" ON hub_group_events
  FOR SELECT USING (true);
CREATE POLICY "hub_group_events_manage_service" ON hub_group_events
  FOR ALL USING (auth.role() = 'service_role');
-- Chefs can read groups for their tenant
CREATE POLICY "hub_groups_chef_read" ON hub_groups
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
