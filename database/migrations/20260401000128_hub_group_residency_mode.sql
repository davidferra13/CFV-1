-- Hub Group Residency Mode: configurable default tab and notification behavior
-- For residency chef circles where meals tab should be front and center

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS default_tab TEXT DEFAULT 'chat'
  CHECK (default_tab IN ('chat', 'meals', 'events', 'photos', 'notes', 'members'));

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS silent_by_default BOOLEAN DEFAULT false;

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS circle_mode TEXT DEFAULT 'standard'
  CHECK (circle_mode IN ('standard', 'residency'));
