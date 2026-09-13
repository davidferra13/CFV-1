-- Amendment 2 of docs/chef-navigation-decision-contract.md: an explicit chef
-- toggle outranks any archetype preset.
--
-- Archetype presets decide which modules a new chef starts with. Without a
-- record of what the chef changed by hand, switching archetype overwrote those
-- choices. This column holds the deviation only, never the whole set:
--   { "on": ["commerce"], "off": ["pipeline"] }
-- It is derived from the chef's own toggles in Settings > Modules, so it stays
-- correct even when a preset is edited later.
--
-- Additive and idempotent. Existing rows keep their enabled_modules untouched.

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS module_overrides jsonb DEFAULT '{"on": [], "off": []}'::jsonb;

COMMENT ON COLUMN chef_preferences.module_overrides IS
  'Chef module toggles that deviate from their archetype preset: {"on":[slugs],"off":[slugs]}. Survives archetype switches.';
