-- Hub Household Members: per-person dietary tracking within a circle member's family
-- Critical for food safety (individual allergies) and personalization

CREATE TABLE hub_household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Identity
  display_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN (
    'partner', 'spouse', 'child', 'parent', 'sibling',
    'assistant', 'house_manager', 'nanny', 'other'
  )),
  age_group TEXT CHECK (age_group IN ('infant', 'toddler', 'child', 'teen', 'adult')),

  -- Dietary (mirrors hub_guest_profiles structure)
  dietary_restrictions TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  favorites TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_household_profile ON hub_household_members(profile_id);
