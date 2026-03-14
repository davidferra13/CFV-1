-- Fix: Add RLS to hub_availability and hub_availability_responses
-- These tables were created in 20260330000008 without RLS policies.
-- Without RLS, any user (including anon) could enumerate all availability
-- poll data across all tenants/groups.

-- ============================================================
-- RLS: hub_availability
-- ============================================================
ALTER TABLE hub_availability ENABLE ROW LEVEL SECURITY;
-- Group members can view availability polls for their groups
CREATE POLICY hub_availability_member_select ON hub_availability
  FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM hub_group_members gm
      JOIN hub_guest_profiles gp ON gp.id = gm.profile_id
      WHERE gp.auth_user_id = auth.uid()
    )
  );
-- Only the creator can insert availability polls
CREATE POLICY hub_availability_member_insert ON hub_availability
  FOR INSERT
  WITH CHECK (
    created_by_profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
-- Only the creator can update (close) their polls
CREATE POLICY hub_availability_creator_update ON hub_availability
  FOR UPDATE
  USING (
    created_by_profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
-- Only the creator can delete their polls
CREATE POLICY hub_availability_creator_delete ON hub_availability
  FOR DELETE
  USING (
    created_by_profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
-- ============================================================
-- RLS: hub_availability_responses
-- ============================================================
ALTER TABLE hub_availability_responses ENABLE ROW LEVEL SECURITY;
-- Group members can view all responses for polls in their groups
CREATE POLICY hub_availability_responses_member_select ON hub_availability_responses
  FOR SELECT
  USING (
    availability_id IN (
      SELECT ha.id FROM hub_availability ha
      JOIN hub_group_members gm ON gm.group_id = ha.group_id
      JOIN hub_guest_profiles gp ON gp.id = gm.profile_id
      WHERE gp.auth_user_id = auth.uid()
    )
  );
-- Members can insert their own responses
CREATE POLICY hub_availability_responses_member_insert ON hub_availability_responses
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
-- Members can update their own responses
CREATE POLICY hub_availability_responses_member_update ON hub_availability_responses
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
-- Members can delete their own responses
CREATE POLICY hub_availability_responses_member_delete ON hub_availability_responses
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM hub_guest_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
