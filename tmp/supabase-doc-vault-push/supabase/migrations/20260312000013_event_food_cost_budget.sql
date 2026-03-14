-- Add food_cost_budget_cents to events
-- Allows chefs to set an explicit budget per event instead of relying solely
-- on the auto-derived guardrail (quoted_price * (1 - target_margin%)).
-- NULL = use formula; a value = chef has manually set their budget.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS food_cost_budget_cents INTEGER DEFAULT NULL;
COMMENT ON COLUMN events.food_cost_budget_cents IS
  'Optional chef-set food cost budget in cents. When NULL, the budget is derived from quoted_price_cents × (1 - target_margin_percent). When set, this value overrides the formula.';
