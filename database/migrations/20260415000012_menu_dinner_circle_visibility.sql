-- D3: Menu visibility toggle for dinner circles
-- Allows chefs to control which menus are visible to dinner circle members.
-- Defaults to false (private), chef must explicitly share.

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS visible_to_dinner_circle BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN menus.visible_to_dinner_circle IS 'When true, this menu is visible to members of the linked client dinner circle.';
