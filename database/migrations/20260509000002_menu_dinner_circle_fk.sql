-- Menu Context Dock: direct dinner circle association on menus
-- Allows attaching a menu to a circle without requiring an event bridge.

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS dinner_circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menus_dinner_circle_group_id
  ON menus(dinner_circle_group_id) WHERE dinner_circle_group_id IS NOT NULL;

COMMENT ON COLUMN menus.dinner_circle_group_id IS 'Direct FK to hub_groups for circle association without event bridge.';
