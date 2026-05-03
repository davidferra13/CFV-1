-- Ingredient Availability Board
-- Enables co-hosts (farmers, venue partners) to declare what ingredients
-- they can supply for an event. Chef sees the full picture and sources gaps.

CREATE TABLE IF NOT EXISTS circle_ingredient_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_ingredient_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES circle_ingredient_board(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  category TEXT, -- produce, protein, dairy, pantry, herb, grain, other
  offered_by_profile_id UUID REFERENCES hub_guest_profiles(id) ON DELETE SET NULL,
  offered_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'limited', 'unavailable', 'sourced_externally')),
  quantity_notes TEXT, -- "5 lbs", "2 bunches", "as much as needed"
  available_from DATE,
  available_to DATE,
  chef_notes TEXT, -- chef can annotate: "need 3 lbs minimum"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick board lookup by circle
CREATE INDEX IF NOT EXISTS idx_circle_ingredient_board_group ON circle_ingredient_board(group_id);
CREATE INDEX IF NOT EXISTS idx_circle_ingredient_items_board ON circle_ingredient_items(board_id);

-- RLS
ALTER TABLE circle_ingredient_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_ingredient_items ENABLE ROW LEVEL SECURITY;

-- Policies: tenant can manage their boards
CREATE POLICY circle_ingredient_board_tenant ON circle_ingredient_board
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);

CREATE POLICY circle_ingredient_items_tenant ON circle_ingredient_items
  FOR ALL USING (board_id IN (
    SELECT id FROM circle_ingredient_board
    WHERE tenant_id = (current_setting('app.current_tenant', true))::uuid
  ));
