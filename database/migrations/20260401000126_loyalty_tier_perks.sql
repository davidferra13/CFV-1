-- Tier perks: chef-configurable perks per loyalty tier
-- Each key is a tier name, each value is an array of perk description strings
-- Example: {"silver": ["Complimentary amuse-bouche"], "gold": ["Priority booking", "Recipe card"]}
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS tier_perks jsonb DEFAULT '{}';
