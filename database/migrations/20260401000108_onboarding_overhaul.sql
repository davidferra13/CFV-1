-- Onboarding overhaul: add missing columns to chefs table for expanded wizard
-- All changes are additive (ADD COLUMN IF NOT EXISTS). No DROP, no DELETE, no ALTER TYPE.

-- New profile fields collected during onboarding
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS cuisine_specialties text[] DEFAULT '{}';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
-- social_links shape: { instagram?: string, facebook?: string, tiktok?: string }

-- Banner dismissal persistence (NULL = not dismissed, timestamp = dismissed at)
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS onboarding_banner_dismissed_at timestamptz;

-- Progressive reminder tracking (stop all reminders after 3 dismissals)
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS onboarding_reminders_dismissed int DEFAULT 0;

-- Create chef_marketplace_profiles if it doesn't exist yet
-- Code references this table but no migration was found for it
CREATE TABLE IF NOT EXISTS chef_marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  cuisine_types text[] DEFAULT '{}',
  service_types text[] DEFAULT '{}',
  price_range text, -- budget, mid, premium, luxury
  service_area_city text,
  service_area_state text,
  service_area_zip text,
  service_area_lat double precision,
  service_area_lng double precision,
  hero_image_url text,
  highlight_text text,
  accepting_inquiries boolean DEFAULT true,
  next_available_date date,
  lead_time_days int,
  min_guest_count int,
  max_guest_count int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(chef_id)
);
