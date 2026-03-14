-- Add focus_mode column to chef_preferences
-- When true, sidebar shows only core modules (dashboard, pipeline, events, culinary, clients, finance)
-- All features remain accessible — just hidden from nav. Nothing is deleted.
-- Defaults to true for new users (clean sidebar out of the box)

ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS focus_mode BOOLEAN DEFAULT true;
COMMENT ON COLUMN chef_preferences.focus_mode IS
  'Progressive disclosure: when true, sidebar shows only core modules. All features remain accessible when turned off.';
