-- Add workspace density column for adaptive UI complexity
ALTER TABLE chef_preferences
ADD COLUMN workspace_density TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE chef_preferences
ADD CONSTRAINT chef_preferences_workspace_density_check
CHECK (workspace_density IN ('minimal', 'standard', 'power'));

COMMENT ON COLUMN chef_preferences.workspace_density IS
  'Controls UI complexity: minimal (anti-tech users), standard (default), power (show everything)';
