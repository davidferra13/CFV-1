-- Shopping Lists: mobile-optimized grocery shopping mode
-- Chefs create lists (manually or from event menus), check off items while shopping,
-- track estimated vs actual prices, and convert completed lists to expenses.

CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  total_estimated_cents int,
  total_actual_cents int,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Indexes
CREATE INDEX idx_shopping_lists_chef_id ON shopping_lists(chef_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(chef_id, status);
CREATE INDEX idx_shopping_lists_event_id ON shopping_lists(event_id) WHERE event_id IS NOT NULL;
-- RLS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs can manage their own shopping lists" ON shopping_lists;
CREATE POLICY "Chefs can manage their own shopping lists"
  ON shopping_lists
  FOR ALL
  USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ))
  WITH CHECK (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_lists_updated_at();
