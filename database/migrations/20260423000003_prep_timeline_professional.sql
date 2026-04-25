-- Prep Timeline Professional Grade Upgrade
-- Adds active/passive time split, hold classification, and prep tier to recipes.
-- Purely additive: new nullable columns. No data loss risk.

-- Active vs passive prep time (split of existing prep_time_minutes)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active_prep_minutes INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS passive_prep_minutes INTEGER;

-- Hold classification: how the finished dish behaves at service
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS hold_class TEXT
  CHECK (hold_class IN ('serve_immediately', 'hold_warm', 'hold_cold_reheat'));

-- Prep tier: dependency ordering for mise en place sequencing
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_tier TEXT
  CHECK (prep_tier IN ('base', 'secondary', 'tertiary', 'finishing'));

-- Constraints
ALTER TABLE recipes ADD CONSTRAINT chk_active_prep_positive
  CHECK (active_prep_minutes >= 0 OR active_prep_minutes IS NULL);
ALTER TABLE recipes ADD CONSTRAINT chk_passive_prep_positive
  CHECK (passive_prep_minutes >= 0 OR passive_prep_minutes IS NULL);

-- Comments
COMMENT ON COLUMN recipes.active_prep_minutes IS 'Hands-on active prep time in minutes (chopping, searing, assembling)';
COMMENT ON COLUMN recipes.passive_prep_minutes IS 'Unattended passive time in minutes (simmering, resting, chilling, proofing)';
COMMENT ON COLUMN recipes.hold_class IS 'Service hold behavior: serve_immediately (plate within minutes), hold_warm (can sit at 135F+), hold_cold_reheat (make ahead, reheat before service)';
COMMENT ON COLUMN recipes.prep_tier IS 'Mise en place dependency tier: base (stocks, blanching liquids), secondary (mother sauces, doughs, marinades), tertiary (filled pastas, compound preps), finishing (garnishes, a la minute)';
