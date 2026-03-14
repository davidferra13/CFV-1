-- ============================================
-- ACTIVITY LOG OPT-IN/OUT PREFERENCE
-- ============================================
-- Adds an optional toggle so chefs can disable activity logging.
-- Default is TRUE (logging enabled) — existing behavior unchanged.
-- Purely additive — zero data risk.
-- ============================================

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS activity_log_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN chef_preferences.activity_log_enabled IS
  'When true (default), chef actions are recorded to chef_activity_log. When false, logChefActivity() skips writes. Existing log entries are preserved regardless.';
