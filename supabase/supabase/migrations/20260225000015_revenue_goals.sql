-- ============================================
-- Revenue Goals Program
-- Adds opt-in financial goal controls to chef_preferences.
-- ============================================

ALTER TABLE chef_preferences
  ADD COLUMN revenue_goal_program_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN target_monthly_revenue_cents INTEGER NOT NULL DEFAULT 1000000,
  ADD COLUMN target_annual_revenue_cents INTEGER,
  ADD COLUMN revenue_goal_custom JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN revenue_goal_nudge_level TEXT NOT NULL DEFAULT 'gentle';

ALTER TABLE chef_preferences
  ADD CONSTRAINT chef_preferences_target_monthly_revenue_nonnegative
    CHECK (target_monthly_revenue_cents >= 0),
  ADD CONSTRAINT chef_preferences_target_annual_revenue_nonnegative
    CHECK (target_annual_revenue_cents IS NULL OR target_annual_revenue_cents >= 0),
  ADD CONSTRAINT chef_preferences_revenue_goal_nudge_level_valid
    CHECK (revenue_goal_nudge_level IN ('gentle', 'standard', 'aggressive')),
  ADD CONSTRAINT chef_preferences_revenue_goal_custom_array
    CHECK (jsonb_typeof(revenue_goal_custom) = 'array');

CREATE INDEX idx_chef_preferences_revenue_goal_enabled
  ON chef_preferences (tenant_id, revenue_goal_program_enabled);
