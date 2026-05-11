-- Account-Anchored Location: every user gets a default zip for all radius-based features
-- Spec: docs/specs/account-anchored-location.md

CREATE TABLE IF NOT EXISTS user_location_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip text NOT NULL,
  city text,
  state text,
  lat double precision,
  lng double precision,
  radius_miles integer NOT NULL DEFAULT 25,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_location_defaults_auth_user ON user_location_defaults(auth_user_id);
CREATE INDEX idx_user_location_defaults_state ON user_location_defaults(state);
CREATE INDEX idx_user_location_defaults_zip ON user_location_defaults(zip);

-- Backfill from chef_preferences.home_zip for chefs who have it set
INSERT INTO user_location_defaults (auth_user_id, zip, city, state, source)
SELECT
  c.auth_user_id,
  cp.home_zip,
  COALESCE(cp.home_city, c.city),
  COALESCE(cp.home_state, c.state),
  'backfill'
FROM chefs c
JOIN chef_preferences cp ON cp.chef_id = c.id
WHERE cp.home_zip IS NOT NULL
  AND c.auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id) DO NOTHING;
