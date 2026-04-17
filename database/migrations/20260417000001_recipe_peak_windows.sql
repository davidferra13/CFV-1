-- Recipe Peak Windows
-- Adds quality peak and safety ceiling fields to recipes for reverse prep timeline computation.
-- Purely additive: new nullable columns. No data loss risk.

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS peak_hours_min INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS peak_hours_max INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS safety_hours_max INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS storage_method TEXT
  CHECK (storage_method IN ('room_temp', 'fridge', 'freezer'))
  DEFAULT 'fridge';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS freezable BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS frozen_extends_hours INTEGER;

COMMENT ON COLUMN recipes.peak_hours_min IS 'Minimum hours before service when this recipe is at peak quality';
COMMENT ON COLUMN recipes.peak_hours_max IS 'Maximum hours before service this recipe stays at peak quality';
COMMENT ON COLUMN recipes.safety_hours_max IS 'Hard safety ceiling in hours. System uses min(peak_hours_max, safety_hours_max) for scheduling';
COMMENT ON COLUMN recipes.storage_method IS 'How the finished recipe is stored: room_temp, fridge, freezer';
COMMENT ON COLUMN recipes.freezable IS 'Whether this recipe can be frozen to extend the prep window';
COMMENT ON COLUMN recipes.frozen_extends_hours IS 'If freezable, how many additional hours freezing adds to the window';
