-- Chef Gear Defaults: per-chef personal readiness template
-- NOT kitchen equipment. This is uniform, personal tools, grooming, safety items.

CREATE TABLE IF NOT EXISTS chef_gear_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uniform', 'tools', 'carry', 'grooming', 'safety')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, item_name)
);

CREATE INDEX idx_chef_gear_defaults_chef ON chef_gear_defaults(chef_id);

-- Gear check status on events (mirrors car_packed / car_packed_at pattern)
ALTER TABLE events ADD COLUMN IF NOT EXISTS gear_checked BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gear_checked_at TIMESTAMPTZ;
