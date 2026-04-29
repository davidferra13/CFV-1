-- Instant Note Intelligence
-- Durable raw-note interpretation, component routing, action tracking, and correction learning.
-- ADDITIVE ONLY. No DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.

CREATE TABLE IF NOT EXISTS chef_note_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_band TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence_band IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'auto_committed', 'needs_confirmation', 'review_queue', 'failed', 'corrected')),
  interpretation JSONB NOT NULL DEFAULT '{}'::jsonb,
  time_intelligence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ambiguity_notes TEXT[] NOT NULL DEFAULT '{}'::text[],
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_interpretations_chef_created
  ON chef_note_interpretations(chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_interpretations_quick_note
  ON chef_note_interpretations(quick_note_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_interpretations_status
  ON chef_note_interpretations(chef_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS chef_note_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  interpretation_id UUID NOT NULL REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL
    CHECK (component_type IN (
      'recipe_concept',
      'technique_variation',
      'ingredient_discovery',
      'seasonal_sourcing_insight',
      'task',
      'event_idea',
      'inventory_thought',
      'constraint',
      'review_prompt',
      'other'
    )),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  route_layer TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('routed', 'needs_review', 'failed', 'corrected')),
  routed_to TEXT,
  routed_ref_id UUID,
  source_excerpt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_components_interpretation
  ON chef_note_components(interpretation_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_components_quick_note
  ON chef_note_components(quick_note_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_components_status
  ON chef_note_components(chef_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_components_route
  ON chef_note_components(chef_id, routed_to, created_at DESC);

CREATE TABLE IF NOT EXISTS chef_note_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  interpretation_id UUID NOT NULL REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('task', 'calendar_alert', 'review_prompt')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'created', 'needs_review', 'completed', 'failed', 'dismissed')),
  routed_to TEXT,
  routed_ref_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_actions_interpretation
  ON chef_note_actions(interpretation_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_actions_quick_note
  ON chef_note_actions(quick_note_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_actions_status
  ON chef_note_actions(chef_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_actions_due
  ON chef_note_actions(chef_id, due_date, status)
  WHERE due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS chef_note_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE SET NULL,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  correction_type TEXT NOT NULL
    CHECK (correction_type IN ('classification', 'routing', 'action', 'time_window', 'confidence', 'other')),
  original_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  corrected_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_corrections_chef_created
  ON chef_note_corrections(chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_note_corrections_quick_note
  ON chef_note_corrections(quick_note_id);
CREATE INDEX IF NOT EXISTS idx_chef_note_corrections_type
  ON chef_note_corrections(chef_id, correction_type, created_at DESC);

ALTER TABLE chef_note_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_corrections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY chef_note_interpretations_chef_all ON chef_note_interpretations
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_components_chef_all ON chef_note_components
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_actions_chef_all ON chef_note_actions
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_corrections_chef_all ON chef_note_corrections
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
