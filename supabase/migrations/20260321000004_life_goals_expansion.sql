-- ============================================
-- ChefFlow V1 — Whole-Life Goals Expansion
-- Adds 17 new goal types across 9 life/business categories,
-- manual check-in table, and per-category preferences.
-- Additive only — no existing columns or types removed.
-- ============================================

-- ── 1. Extend chef_goal_type enum ────────────────────────────────────────────
-- Business Growth
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'repeat_booking_rate';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'referrals_received';
-- Culinary Craft
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'dishes_created';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'cuisines_explored';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'workshops_attended';
-- Reputation
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'review_average';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'total_reviews';
-- Team & Leadership
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'staff_training_hours';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'vendor_relationships';
-- Learning
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'books_read';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'courses_completed';
-- Health & Wellbeing
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'weekly_workouts';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'rest_days_taken';
-- Work-Life Balance
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'family_dinners';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'vacation_days';
-- Community
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'charity_events';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'meals_donated';

-- ── 2. Add tracking_method to chef_goals ─────────────────────────────────────
-- 'auto'         = data fetched from the database automatically
-- 'manual_count' = chef logs progress via the check-in interface
ALTER TABLE chef_goals
  ADD COLUMN IF NOT EXISTS tracking_method TEXT NOT NULL DEFAULT 'auto'
    CONSTRAINT chef_goals_tracking_method_check
    CHECK (tracking_method IN ('auto', 'manual_count'));

-- ── 3. goal_check_ins table ───────────────────────────────────────────────────
-- Append-only log of manually-entered progress values.
-- For manual_count goals: current_value = SUM(logged_value) within period.

CREATE TABLE IF NOT EXISTS goal_check_ins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  goal_id      UUID NOT NULL REFERENCES chef_goals(id) ON DELETE CASCADE,
  logged_value INTEGER NOT NULL CHECK (logged_value > 0),
  notes        TEXT,
  logged_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_check_ins_tenant_goal
  ON goal_check_ins(tenant_id, goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_check_ins_logged_at
  ON goal_check_ins(goal_id, logged_at DESC);

ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own goal check-ins" ON goal_check_ins;
CREATE POLICY "Chefs manage own goal check-ins"
  ON goal_check_ins
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- ── 4. Per-category preferences on chef_preferences ──────────────────────────
-- enabled_goal_categories: array of category slugs the chef has opted into.
-- Defaults to the two core business categories so existing chefs are unaffected.
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS enabled_goal_categories TEXT[] NOT NULL DEFAULT
    ARRAY['financial', 'business_growth'];

-- category_nudge_levels: JSONB map of category slug → nudge level.
-- Missing keys inherit the individual goal's nudge_level setting.
-- e.g. '{"health_wellbeing": "gentle", "culinary_craft": "standard"}'
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS category_nudge_levels JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN chef_preferences.enabled_goal_categories IS
  'Goal category slugs the chef has opted into. Core categories (financial, business_growth) are always included.';
COMMENT ON COLUMN chef_preferences.category_nudge_levels IS
  'Per-category nudge intensity override. Keys are category slugs; values are gentle|standard|aggressive. Missing keys fall back to the goal-level nudge_level.';
COMMENT ON TABLE goal_check_ins IS
  'Append-only log of manually-entered progress for manual_count goals. current_value = SUM(logged_value) within the goal period.';
