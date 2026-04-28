-- Private Context, Secret Orchestration, and Complimentary Intelligence System
-- Three interlocking systems for chef-only visibility and strategic comp items

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE private_context_entity_type AS ENUM (
    'event', 'client', 'menu', 'circle', 'dish', 'recipe'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE private_context_type AS ENUM (
    'note', 'reminder', 'observation', 'intention', 'item'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_type AS ENUM (
    'menu_item', 'surprise_dish', 'gift', 'experience', 'moment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_visibility_scope AS ENUM (
    'chef_only', 'chef_and_selected', 'participant_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_status AS ENUM (
    'planning', 'ready', 'revealed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_author_type AS ENUM (
    'chef', 'participant'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_asset_type AS ENUM (
    'ingredient', 'design', 'timing', 'equipment', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE secret_asset_status AS ENUM (
    'needed', 'sourced', 'ready'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_item_type AS ENUM (
    'true_comp', 'piggyback', 'reuse'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_suggestion_source AS ENUM (
    'ai', 'manual', 'carry_forward', 'intelligence'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_item_status AS ENUM (
    'suggested', 'accepted', 'rejected', 'executed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_suggestion_type AS ENUM (
    'unselected_preference', 'repeated_interest', 'celebration',
    'excess_production', 'high_margin', 'reusable_component', 'client_pattern'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_effort_level AS ENUM (
    'minimal', 'moderate', 'significant'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comp_suggestion_status AS ENUM (
    'pending', 'accepted', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE 1: chef_private_context
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_private_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entity_type private_context_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  context_type private_context_type NOT NULL DEFAULT 'note',
  title TEXT,
  content TEXT,
  structured_data JSONB DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  remind_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_private_context_tenant
  ON chef_private_context(tenant_id);
CREATE INDEX IF NOT EXISTS idx_private_context_entity
  ON chef_private_context(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_private_context_remind
  ON chef_private_context(remind_at) WHERE remind_at IS NOT NULL AND archived = false;

-- RLS: chef-only, tenant-scoped
ALTER TABLE chef_private_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_private_context_chef_all ON chef_private_context
  FOR ALL
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ));

-- ============================================================
-- TABLE 2: event_secrets
-- ============================================================

CREATE TABLE IF NOT EXISTS event_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  secret_type secret_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  structured_data JSONB DEFAULT '{}',
  visibility_scope secret_visibility_scope NOT NULL DEFAULT 'chef_only',
  reveal_timing TEXT,
  reveal_at TIMESTAMPTZ,
  status secret_status NOT NULL DEFAULT 'planning',
  execution_notes TEXT,
  estimated_cost_cents INTEGER DEFAULT 0,
  actual_cost_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_secrets_tenant ON event_secrets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_secrets_event ON event_secrets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_secrets_status ON event_secrets(status) WHERE status != 'cancelled';

ALTER TABLE event_secrets ENABLE ROW LEVEL SECURITY;

-- Chef can manage all secrets for their events
CREATE POLICY event_secrets_chef_all ON event_secrets
  FOR ALL
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ));

-- ============================================================
-- TABLE 3: event_secret_participants
-- ============================================================

CREATE TABLE IF NOT EXISTS event_secret_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES event_secrets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by_tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  UNIQUE(secret_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_secret_participants_secret ON event_secret_participants(secret_id);
CREATE INDEX IF NOT EXISTS idx_secret_participants_profile ON event_secret_participants(profile_id);

ALTER TABLE event_secret_participants ENABLE ROW LEVEL SECURITY;

-- Chef can manage participants
CREATE POLICY secret_participants_chef_all ON event_secret_participants
  FOR ALL
  USING (added_by_tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ))
  WITH CHECK (added_by_tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ));

-- Participants can read secrets they're part of
CREATE POLICY secret_participants_member_read ON event_secret_participants
  FOR SELECT
  USING (profile_id IN (
    SELECT id FROM hub_guest_profiles
    WHERE auth_user_id = (SELECT auth.uid())
  ));

-- ============================================================
-- TABLE 4: event_secret_threads
-- ============================================================

CREATE TABLE IF NOT EXISTS event_secret_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES event_secrets(id) ON DELETE CASCADE,
  author_type secret_author_type NOT NULL,
  author_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_threads_secret ON event_secret_threads(secret_id);

ALTER TABLE event_secret_threads ENABLE ROW LEVEL SECURITY;

-- Chef can manage all threads on their secrets
CREATE POLICY secret_threads_chef_all ON event_secret_threads
  FOR ALL
  USING (secret_id IN (
    SELECT id FROM event_secrets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    )
  ))
  WITH CHECK (secret_id IN (
    SELECT id FROM event_secrets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    )
  ));

-- ============================================================
-- TABLE 5: event_secret_assets
-- ============================================================

CREATE TABLE IF NOT EXISTS event_secret_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES event_secrets(id) ON DELETE CASCADE,
  asset_type secret_asset_type NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT,
  estimated_cost_cents INTEGER DEFAULT 0,
  status secret_asset_status NOT NULL DEFAULT 'needed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_assets_secret ON event_secret_assets(secret_id);

ALTER TABLE event_secret_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY secret_assets_chef_all ON event_secret_assets
  FOR ALL
  USING (secret_id IN (
    SELECT id FROM event_secrets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    )
  ))
  WITH CHECK (secret_id IN (
    SELECT id FROM event_secrets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    )
  ));

-- ============================================================
-- TABLE 6: complimentary_items
-- ============================================================

CREATE TABLE IF NOT EXISTS complimentary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  secret_id UUID REFERENCES event_secrets(id) ON DELETE SET NULL,
  item_type comp_item_type NOT NULL DEFAULT 'true_comp',
  name TEXT NOT NULL,
  description TEXT,
  estimated_cost_cents INTEGER DEFAULT 0,
  actual_cost_cents INTEGER,
  suggestion_source comp_suggestion_source NOT NULL DEFAULT 'manual',
  suggestion_reason TEXT,
  status comp_item_status NOT NULL DEFAULT 'suggested',
  client_reaction TEXT,
  retention_impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comp_items_tenant ON complimentary_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comp_items_event ON complimentary_items(event_id);
CREATE INDEX IF NOT EXISTS idx_comp_items_status ON complimentary_items(status);

ALTER TABLE complimentary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY comp_items_chef_all ON complimentary_items
  FOR ALL
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ));

-- ============================================================
-- TABLE 7: complimentary_suggestions
-- ============================================================

CREATE TABLE IF NOT EXISTS complimentary_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  suggestion_type comp_suggestion_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  estimated_cost_cents INTEGER DEFAULT 0,
  effort_level comp_effort_level NOT NULL DEFAULT 'minimal',
  confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  status comp_suggestion_status NOT NULL DEFAULT 'pending',
  source_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comp_suggestions_tenant ON complimentary_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comp_suggestions_event ON complimentary_suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_comp_suggestions_status ON complimentary_suggestions(status) WHERE status = 'pending';

ALTER TABLE complimentary_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comp_suggestions_chef_all ON complimentary_suggestions
  FOR ALL
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ))
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
  ));

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_chef_private_context_updated_at
    BEFORE UPDATE ON chef_private_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_event_secrets_updated_at
    BEFORE UPDATE ON event_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
