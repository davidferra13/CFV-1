-- Hub Chef Recommendations — friends sharing chef recommendations
-- Cross-tenant: any user can recommend a chef to any friend

CREATE TABLE IF NOT EXISTS hub_chef_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_business_name TEXT NOT NULL,
  chef_slug TEXT,
  from_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_recommend CHECK (from_profile_id <> to_profile_id),
  CONSTRAINT unique_recommendation UNIQUE (chef_id, from_profile_id, to_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_hub_chef_recs_to ON hub_chef_recommendations(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_hub_chef_recs_from ON hub_chef_recommendations(from_profile_id);
ALTER TABLE hub_chef_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON hub_chef_recommendations
  FOR ALL USING (true) WITH CHECK (true);
COMMENT ON TABLE hub_chef_recommendations IS 'Chef recommendations shared between friends (cross-tenant)';
