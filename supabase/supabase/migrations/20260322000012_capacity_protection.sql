-- Capacity Ceiling & Workload Protection: chef-configurable limits on work volume
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS max_events_per_week INT,
  ADD COLUMN IF NOT EXISTS max_events_per_month INT,
  ADD COLUMN IF NOT EXISTS max_consecutive_working_days INT DEFAULT 7,
  ADD COLUMN IF NOT EXISTS min_rest_days_per_week INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_hours_per_week INT,
  ADD COLUMN IF NOT EXISTS off_hours_start TIME,
  ADD COLUMN IF NOT EXISTS off_hours_end TIME,
  ADD COLUMN IF NOT EXISTS off_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_continuity_plan JSONB DEFAULT '{}';

-- Protected time blocks in calendar (only if prep_blocks table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prep_blocks') THEN
    ALTER TABLE prep_blocks ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'prep';
  END IF;
END $$;
