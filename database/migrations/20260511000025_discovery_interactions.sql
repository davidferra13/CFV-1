-- Migration: 20260511000025_discovery_interactions.sql
-- Purpose: Discovery click event store for tracking scroll pill interactions.
--          Used to boost scroll ordering for recurring authenticated users.

CREATE TABLE IF NOT EXISTS discovery_interactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type      TEXT        NOT NULL CHECK (item_type IN (
                               'cuisine', 'food_type', 'service', 'occasion',
                               'dietary', 'featured_chef', 'seasonal', 'location',
                               'special_dining', 'culinary_signal'
                             )),
  item_value     TEXT        NOT NULL,
  item_label     TEXT,
  href           TEXT,
  action         TEXT        NOT NULL DEFAULT 'click' CHECK (action IN ('click')),
  session_id     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE discovery_interactions IS
  'Discovery click event store. Records every scroll-pill click by an authenticated user. '
  'Used to personalise and boost scroll pill ordering on subsequent visits.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discovery_interactions_user
  ON discovery_interactions (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_user_type
  ON discovery_interactions (auth_user_id, item_type);

CREATE INDEX IF NOT EXISTS idx_discovery_interactions_created
  ON discovery_interactions (created_at);

-- Row-Level Security
ALTER TABLE discovery_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own interactions"
  ON discovery_interactions
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users read own interactions"
  ON discovery_interactions
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Service role full access"
  ON discovery_interactions
  FOR ALL
  USING (true);
