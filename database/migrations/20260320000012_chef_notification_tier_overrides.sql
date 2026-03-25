-- Per-chef notification tier overrides
-- Allows chefs to customize the tier (critical/alert/info) for individual notification actions.
-- System defaults in code (DEFAULT_TIER_MAP) remain the fallback when no override exists.

CREATE TABLE IF NOT EXISTS chef_notification_tier_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('critical', 'alert', 'info')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, action)
);

ALTER TABLE chef_notification_tier_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own tier overrides"
  ON chef_notification_tier_overrides
  FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_notification_tier_overrides_chef ON chef_notification_tier_overrides(chef_id);
