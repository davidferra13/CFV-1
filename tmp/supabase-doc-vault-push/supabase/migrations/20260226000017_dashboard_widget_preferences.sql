-- ============================================
-- Dashboard Widget Preferences
-- Adds per-chef widget order + visibility controls.
-- ============================================

ALTER TABLE chef_preferences
  ADD COLUMN dashboard_widgets JSONB NOT NULL DEFAULT '[
    {"id":"onboarding_accelerator","enabled":true},
    {"id":"todays_schedule","enabled":true},
    {"id":"next_action","enabled":true},
    {"id":"week_strip","enabled":true},
    {"id":"priority_queue","enabled":true},
    {"id":"prep_prompts","enabled":true},
    {"id":"service_quality","enabled":true},
    {"id":"business_snapshot","enabled":true},
    {"id":"career_growth","enabled":true},
    {"id":"hours","enabled":true},
    {"id":"activity","enabled":true}
  ]'::jsonb;
ALTER TABLE chef_preferences
  ADD CONSTRAINT chef_preferences_dashboard_widgets_array
    CHECK (jsonb_typeof(dashboard_widgets) = 'array');
