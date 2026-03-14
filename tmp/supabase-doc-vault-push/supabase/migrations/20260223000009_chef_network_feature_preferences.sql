-- ============================================
-- CHEF NETWORK FEATURE PREFERENCES
-- ============================================
-- Adds:
-- 1) typed feature category on network posts
-- 2) per-chef feature opt-in / opt-out preferences
-- ============================================

CREATE TYPE chef_network_feature_key AS ENUM (
  'availability',
  'referral_asks',
  'referral_offers',
  'collab_requests',
  'menu_spotlights',
  'sourcing_intel',
  'operational_tips',
  'equipment_feedback',
  'event_recap_learnings',
  'urgent_needs',
  'professional_proof',
  'questions_to_network'
);
ALTER TABLE chef_network_posts
  ADD COLUMN feature_key chef_network_feature_key NOT NULL DEFAULT 'operational_tips';
COMMENT ON COLUMN chef_network_posts.feature_key IS
  'Feature category for the post (availability, referral ask, sourcing intel, etc).';
CREATE INDEX idx_chef_network_posts_feature_created
  ON chef_network_posts(feature_key, created_at DESC);
CREATE TABLE chef_network_feature_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  feature_key chef_network_feature_key NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_chef_network_feature_preference
    UNIQUE (chef_id, feature_key)
);
COMMENT ON TABLE chef_network_feature_preferences IS
  'Per-chef opt-in / opt-out settings for network feed feature categories.';
CREATE INDEX idx_chef_network_feature_preferences_chef
  ON chef_network_feature_preferences(chef_id);
CREATE TRIGGER chef_network_feature_preferences_updated_at
  BEFORE UPDATE ON chef_network_feature_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE chef_network_feature_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_network_feature_preferences_select_own ON chef_network_feature_preferences
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY chef_network_feature_preferences_insert_own ON chef_network_feature_preferences
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY chef_network_feature_preferences_update_own ON chef_network_feature_preferences
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
CREATE POLICY chef_network_feature_preferences_delete_own ON chef_network_feature_preferences
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );
