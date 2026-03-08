-- ============================================
-- My Dashboard - Personal customizable dashboard tab
-- Adds per-chef widget selection and ordering for the "My Dashboard" tab,
-- plus a pinned notes scratchpad and pinned menu reference.
-- ============================================

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS my_dashboard_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS my_dashboard_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS my_dashboard_pinned_menu_id UUID DEFAULT NULL;

ALTER TABLE chef_preferences
  ADD CONSTRAINT chef_preferences_my_dashboard_widgets_array
    CHECK (jsonb_typeof(my_dashboard_widgets) = 'array');
