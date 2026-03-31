-- Chef Introduction Bridges
-- Lifecycle table linking a temporary mixed-party intro thread (hub_group)
-- to a structured handoff, source/target chefs, and destination Dinner Circle.

CREATE TABLE IF NOT EXISTS chef_intro_bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_group_id UUID NOT NULL UNIQUE REFERENCES hub_groups(id) ON DELETE CASCADE,
  handoff_id UUID REFERENCES chef_handoffs(id) ON DELETE SET NULL,
  source_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  target_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  source_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  target_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  initiated_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE RESTRICT,
  intro_mode TEXT NOT NULL DEFAULT 'shared'
    CHECK (intro_mode IN ('shared', 'observer', 'transfer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'source_left', 'completed', 'cancelled')),
  intro_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  source_left_at TIMESTAMPTZ,
  CONSTRAINT chef_intro_bridges_no_self CHECK (source_chef_id <> target_chef_id)
);

-- One bridge per handoff+target pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_intro_bridges_handoff_target
  ON chef_intro_bridges(handoff_id, target_chef_id)
  WHERE handoff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_source
  ON chef_intro_bridges(source_chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_target
  ON chef_intro_bridges(target_chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_intro_bridges_status
  ON chef_intro_bridges(status, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_chef_intro_bridges_updated_at
  BEFORE UPDATE ON chef_intro_bridges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
