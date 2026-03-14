-- Chef Feature Flags
-- Per-chef toggles for controlling feature rollout.
-- Written by admin (service role). Readable by chef for their own flags.

CREATE TABLE IF NOT EXISTS chef_feature_flags (
  chef_id    UUID  NOT NULL REFERENCES chefs (id) ON DELETE CASCADE,
  flag_name  TEXT  NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chef_id, flag_name)
);
CREATE INDEX IF NOT EXISTS idx_chef_feature_flags_chef_id ON chef_feature_flags (chef_id);
-- Keep updated_at fresh on toggle
CREATE OR REPLACE FUNCTION set_feature_flag_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_chef_feature_flags_updated_at
  BEFORE UPDATE ON chef_feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_feature_flag_updated_at();
-- RLS
ALTER TABLE chef_feature_flags ENABLE ROW LEVEL SECURITY;
-- Chefs can read their own flags (for server-side feature gating)
CREATE POLICY "chefs_read_own_flags"
  ON chef_feature_flags FOR SELECT
  USING (
    chef_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
      LIMIT 1
    )
  );
-- Seed initial flags as disabled for any existing chefs
-- (new chefs inherit defaults; flags are opt-in from admin panel);
