-- ============================================================
-- Client Profile Service Foundation
-- Purpose:
--   Temporal evidence + vector snapshots for the CP-Engine.
--   Supports unified culinary profile vectors, hard-veto constraints,
--   household sub-profiles, ambiguity arbitration, and explainable
--   recommendation outputs.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE client_profile_subject_kind AS ENUM (
    'primary_client',
    'linked_client',
    'managed_member'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_profile_source_type AS ENUM (
    'client_record',
    'booking_form',
    'conversation_log',
    'recipe_feedback',
    'stated_preference',
    'meal_request',
    'allergy_record',
    'taste_profile',
    'feedback_request',
    'household_profile',
    'system_inference'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_profile_conflict_status AS ENUM (
    'open',
    'pending_user',
    'resolved',
    'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_profile_query_status AS ENUM (
    'pending',
    'answered',
    'expired',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_profile_recommendation_status AS ENUM (
    'ready',
    'blocked_conflict',
    'no_safe_candidate',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_profile_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  linked_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  subject_kind client_profile_subject_kind NOT NULL,
  display_name TEXT NOT NULL,
  relationship_label TEXT,
  decision_priority INTEGER NOT NULL DEFAULT 100,
  profile_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE client_profile_subjects IS
  'Profile-engine consumer entities. Supports a primary client managing linked clients '
  'and lightweight managed household members without forcing every participant to be '
  'a full auth-backed client.';

CREATE INDEX IF NOT EXISTS idx_client_profile_subjects_primary
  ON client_profile_subjects(tenant_id, primary_client_id, is_active);

CREATE INDEX IF NOT EXISTS idx_client_profile_subjects_household
  ON client_profile_subjects(household_id)
  WHERE household_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_profile_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES client_profile_subjects(id) ON DELETE SET NULL,
  source_type client_profile_source_type NOT NULL,
  source_table TEXT,
  source_record_id TEXT,
  signal_key TEXT NOT NULL,
  signal_direction TEXT NOT NULL DEFAULT 'neutral'
    CHECK (signal_direction IN ('positive', 'negative', 'constraint', 'context', 'novelty', 'neutral')),
  signal_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_value TEXT,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.5000
    CHECK (confidence >= 0 AND confidence <= 1),
  predictive_weight NUMERIC(6,3) NOT NULL DEFAULT 0.000,
  observed_at TIMESTAMPTZ NOT NULL,
  attributed_to TEXT,
  evidence_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_profile_evidence_fingerprint UNIQUE (evidence_fingerprint)
);

COMMENT ON TABLE client_profile_evidence IS
  'Append-friendly temporal evidence ledger for every data point considered by the CP-Engine. '
  'Each row is attributable, timestamped, and reusable for confidence explanations.';

CREATE INDEX IF NOT EXISTS idx_client_profile_evidence_primary
  ON client_profile_evidence(tenant_id, primary_client_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_profile_evidence_signal
  ON client_profile_evidence(tenant_id, signal_key, normalized_value);

CREATE TABLE IF NOT EXISTS client_profile_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  engine_version TEXT NOT NULL,
  vector_json JSONB NOT NULL,
  coverage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.5000
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  conflict_count INTEGER NOT NULL DEFAULT 0,
  is_current BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE client_profile_vectors IS
  'Materialized Culinary Profile Vector snapshots. Each rebuild produces a new vector '
  'that can be traced back to evidence and recommendation outcomes.';

CREATE INDEX IF NOT EXISTS idx_client_profile_vectors_primary
  ON client_profile_vectors(tenant_id, primary_client_id, generated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_profile_vectors_current
  ON client_profile_vectors(tenant_id, primary_client_id)
  WHERE is_current = true;

CREATE TABLE IF NOT EXISTS client_profile_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES client_profile_subjects(id) ON DELETE SET NULL,
  vector_id UUID REFERENCES client_profile_vectors(id) ON DELETE SET NULL,
  conflict_key TEXT NOT NULL,
  status client_profile_conflict_status NOT NULL DEFAULT 'open',
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  conflict_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_user_arbitration BOOLEAN NOT NULL DEFAULT true,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_profile_conflict UNIQUE (tenant_id, primary_client_id, conflict_key)
);

COMMENT ON TABLE client_profile_conflicts IS
  'Open and historical ambiguities discovered by the CP-Engine. '
  'Examples: spicy preference vs chili allergy, cross-household veto collisions.';

CREATE INDEX IF NOT EXISTS idx_client_profile_conflicts_primary
  ON client_profile_conflicts(tenant_id, primary_client_id, status, severity);

CREATE TABLE IF NOT EXISTS client_profile_arbitration_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conflict_id UUID NOT NULL REFERENCES client_profile_conflicts(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 100,
  status client_profile_query_status NOT NULL DEFAULT 'pending',
  question_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer_json JSONB,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_profile_query_priority UNIQUE (conflict_id, priority)
);

COMMENT ON TABLE client_profile_arbitration_queries IS
  'Structured questions automatically generated when the profile engine cannot safely '
  'resolve conflicting data without user arbitration.';

CREATE INDEX IF NOT EXISTS idx_client_profile_queries_primary
  ON client_profile_arbitration_queries(tenant_id, primary_client_id, status, priority);

CREATE TABLE IF NOT EXISTS client_profile_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vector_id UUID REFERENCES client_profile_vectors(id) ON DELETE SET NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  status client_profile_recommendation_status NOT NULL DEFAULT 'ready',
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  justification_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(5,4)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE client_profile_recommendations IS
  'Explainable recommendation outputs from the CP-Engine. Stores request context, chosen meal, '
  'confidence score, and the specific evidence-backed justification returned to callers.';

CREATE INDEX IF NOT EXISTS idx_client_profile_recommendations_primary
  ON client_profile_recommendations(tenant_id, primary_client_id, created_at DESC);

ALTER TABLE client_profile_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profile_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profile_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profile_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profile_arbitration_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profile_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_profile_subjects_chef_all ON client_profile_subjects;
CREATE POLICY client_profile_subjects_chef_all ON client_profile_subjects
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS client_profile_evidence_chef_all ON client_profile_evidence;
CREATE POLICY client_profile_evidence_chef_all ON client_profile_evidence
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS client_profile_vectors_chef_all ON client_profile_vectors;
CREATE POLICY client_profile_vectors_chef_all ON client_profile_vectors
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS client_profile_conflicts_chef_all ON client_profile_conflicts;
CREATE POLICY client_profile_conflicts_chef_all ON client_profile_conflicts
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS client_profile_queries_chef_all ON client_profile_arbitration_queries;
CREATE POLICY client_profile_queries_chef_all ON client_profile_arbitration_queries
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS client_profile_recommendations_chef_all ON client_profile_recommendations;
CREATE POLICY client_profile_recommendations_chef_all ON client_profile_recommendations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP TRIGGER IF EXISTS set_client_profile_subjects_updated_at ON client_profile_subjects;
CREATE TRIGGER set_client_profile_subjects_updated_at
  BEFORE UPDATE ON client_profile_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_client_profile_conflicts_updated_at ON client_profile_conflicts;
CREATE TRIGGER set_client_profile_conflicts_updated_at
  BEFORE UPDATE ON client_profile_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_client_profile_queries_updated_at ON client_profile_arbitration_queries;
CREATE TRIGGER set_client_profile_queries_updated_at
  BEFORE UPDATE ON client_profile_arbitration_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
