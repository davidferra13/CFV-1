-- Production log enhancements: outcome rating and substitution tracking
-- Additive only: adds two nullable columns to recipe_production_log

ALTER TABLE recipe_production_log
  ADD COLUMN IF NOT EXISTS outcome_rating smallint CHECK (outcome_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS substitutions text;

COMMENT ON COLUMN recipe_production_log.outcome_rating IS 'Batch quality rating 1-5 (1=poor, 5=excellent)';
COMMENT ON COLUMN recipe_production_log.substitutions IS 'Ingredient substitutions made during this production batch';
