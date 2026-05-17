-- Interaction Soundness Pass (UI SYSTEM #36)
-- Tables: interaction_rules, interaction_audits

CREATE TABLE interaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  interaction_state TEXT NOT NULL,
  css_property TEXT NOT NULL,
  value TEXT NOT NULL,
  transition TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT interaction_rules_state_check CHECK (
    interaction_state IN ('hover', 'focus', 'active', 'disabled', 'loading', 'error')
  )
);

CREATE UNIQUE INDEX idx_interaction_rules_tenant_component_state_prop
  ON interaction_rules (tenant_id, component, interaction_state, css_property);

CREATE INDEX idx_interaction_rules_tenant
  ON interaction_rules (tenant_id);

CREATE TABLE interaction_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  component TEXT NOT NULL,
  missing_states JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interaction_audits_tenant_route
  ON interaction_audits (tenant_id, route);

CREATE INDEX idx_interaction_audits_tenant
  ON interaction_audits (tenant_id);

-- RLS policies
ALTER TABLE interaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY interaction_rules_select ON interaction_rules
  FOR SELECT TO public USING (true);
CREATE POLICY interaction_rules_insert ON interaction_rules
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY interaction_rules_update ON interaction_rules
  FOR UPDATE TO public USING (true);
CREATE POLICY interaction_rules_delete ON interaction_rules
  FOR DELETE TO public USING (true);

CREATE POLICY interaction_audits_select ON interaction_audits
  FOR SELECT TO public USING (true);
CREATE POLICY interaction_audits_insert ON interaction_audits
  FOR INSERT TO public WITH CHECK (true);
