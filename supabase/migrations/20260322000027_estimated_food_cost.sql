-- Food Cost Budget Integration
-- Adds estimated_food_cost_cents to events, populated from grocery quote results.
-- Enables pre-event vs post-event food cost comparison in profit summary.
-- Additive only — no existing columns modified.
-- Note: food_cost_budget_cents already exists (chef manual ceiling).
-- This is different — it's the computed estimate from the grocery quote API.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS estimated_food_cost_cents INTEGER;

COMMENT ON COLUMN events.estimated_food_cost_cents IS
  'NE-calibrated average grocery estimate from the grocery quote panel. Populated when a grocery quote is generated. Null = no estimate yet.';
