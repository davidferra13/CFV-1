-- Packing Templates: reusable equipment/item packing lists by event type
-- Chefs can create templates like "Intimate Dinner", "Corporate Lunch", etc.
-- and apply them to events to pre-fill the packing checklist.

CREATE TABLE IF NOT EXISTS packing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_type TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for chef lookups
CREATE INDEX idx_packing_templates_chef_id ON packing_templates(chef_id);
-- Index for event_type matching (auto-suggest)
CREATE INDEX idx_packing_templates_event_type ON packing_templates(chef_id, event_type) WHERE event_type IS NOT NULL;
-- RLS
ALTER TABLE packing_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefs can manage their own packing templates"
  ON packing_templates
  FOR ALL
  USING (chef_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.entity_id = packing_templates.chef_id
      AND user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'
  ))
  WITH CHECK (chef_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.entity_id = packing_templates.chef_id
      AND user_roles.auth_user_id = auth.uid()
      AND user_roles.role = 'chef'
  ));
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_packing_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_packing_templates_updated_at
  BEFORE UPDATE ON packing_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_packing_templates_updated_at();
COMMENT ON TABLE packing_templates IS
  'Reusable equipment and item packing list templates. '
  'Each template stores a JSONB array of items with name, quantity, category, and notes. '
  'Can be linked to an event_type for auto-suggestion.';
