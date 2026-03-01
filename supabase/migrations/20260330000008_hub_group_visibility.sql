-- Migration: Add group visibility, anonymous posting, and availability scheduling
-- Additive only — no destructive operations

-- 1. Group visibility: public (default), private (invite-only), secret (hidden)
ALTER TABLE hub_groups
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private', 'secret'));

-- 2. Anonymous posting flag on groups
ALTER TABLE hub_groups
  ADD COLUMN IF NOT EXISTS allow_anonymous_posts BOOLEAN NOT NULL DEFAULT false;

-- 3. Anonymous flag on individual messages
ALTER TABLE hub_messages
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- 4. Availability scheduling table
CREATE TABLE IF NOT EXISTS hub_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- What this availability poll is for
  title TEXT NOT NULL DEFAULT 'When works for everyone?',
  description TEXT,

  -- Date range to show
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (date_range_end >= date_range_start)
);

-- 5. Individual date responses
CREATE TABLE IF NOT EXISTS hub_availability_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID NOT NULL REFERENCES hub_availability(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  response_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'maybe', 'unavailable')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(availability_id, profile_id, response_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hub_availability_group ON hub_availability(group_id);
CREATE INDEX IF NOT EXISTS idx_hub_availability_responses_avail ON hub_availability_responses(availability_id);
CREATE INDEX IF NOT EXISTS idx_hub_groups_visibility ON hub_groups(visibility);
