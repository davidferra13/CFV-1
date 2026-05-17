-- Lifecycle Action Cards (LIFECYCLE #5)
-- Contextual action buttons, stage-aware recommendations, completion checklists

CREATE TABLE IF NOT EXISTS lifecycle_action_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  lifecycle_stage text NOT NULL,
  title text NOT NULL,
  description text,
  action_type text NOT NULL DEFAULT 'navigate',
  target_route text,
  priority text NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_action_cards_tenant_event
  ON lifecycle_action_cards (tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_lifecycle_action_cards_stage
  ON lifecycle_action_cards (tenant_id, lifecycle_stage);

CREATE TABLE IF NOT EXISTS action_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  lifecycle_stage text NOT NULL,
  trigger_condition jsonb NOT NULL DEFAULT '{}',
  recommended_action text NOT NULL,
  title text NOT NULL,
  description text,
  auto_create boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_recommendations_tenant_stage
  ON action_recommendations (tenant_id, lifecycle_stage);

-- RLS
ALTER TABLE lifecycle_action_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_cards_chef_all ON lifecycle_action_cards
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));

CREATE POLICY action_recommendations_chef_all ON action_recommendations
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'::user_role
  ));
