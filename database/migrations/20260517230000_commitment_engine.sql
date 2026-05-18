-- Ulysses Universe: Unified Commitment Engine (Wave 1)
-- 3 tables: commitments, commitment_overrides, commitment_suggestions

CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  domain TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chef_declared',
  rule JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  friction_level INTEGER NOT NULL DEFAULT 1,
  override_count INTEGER NOT NULL DEFAULT 0,
  last_override_at TIMESTAMPTZ,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  future_self_letter TEXT,
  seasonal_profile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitments_tenant_domain ON commitments(tenant_id, domain, status);
CREATE INDEX idx_commitments_tenant_status ON commitments(tenant_id, status);

CREATE TABLE commitment_overrides (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL REFERENCES commitments(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  category TEXT,
  reason TEXT NOT NULL,
  friction_tier_at_override INTEGER NOT NULL,
  regret_prediction INTEGER,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_overrides_commitment ON commitment_overrides(commitment_id, created_at);
CREATE INDEX idx_overrides_tenant ON commitment_overrides(tenant_id, created_at);

CREATE TABLE commitment_suggestions (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  domain TEXT NOT NULL,
  suggested_rule JSONB NOT NULL,
  rationale TEXT NOT NULL,
  evidence JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggestions_tenant ON commitment_suggestions(tenant_id, status);

-- RLS policies
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commitments tenant isolation" ON commitments
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Overrides tenant isolation" ON commitment_overrides
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Suggestions tenant isolation" ON commitment_suggestions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
