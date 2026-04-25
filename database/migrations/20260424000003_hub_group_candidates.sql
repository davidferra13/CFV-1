-- Hub Group Candidates: shortlist storage for planning-mode Dinner Circles
-- Spec: docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md

CREATE TABLE hub_group_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  added_by_profile_id uuid NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  candidate_type text NOT NULL CHECK (
    candidate_type IN ('chef', 'listing', 'menu', 'package', 'meal_prep_item')
  ),
  chef_id uuid REFERENCES chefs(id) ON DELETE CASCADE,
  directory_listing_id uuid REFERENCES directory_listings(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES menus(id) ON DELETE CASCADE,
  experience_package_id uuid REFERENCES experience_packages(id) ON DELETE CASCADE,
  meal_prep_item_id uuid REFERENCES meal_prep_items(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  notes text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_hub_group_candidates_group ON hub_group_candidates(group_id, sort_order);
CREATE INDEX idx_hub_group_candidates_type ON hub_group_candidates(candidate_type);

-- Add planning_brief column to hub_groups for structured planning context
ALTER TABLE hub_groups
ADD COLUMN planning_brief jsonb;

COMMENT ON TABLE hub_group_candidates IS 'Pre-booking shortlist candidates for planning-mode hub groups';
COMMENT ON COLUMN hub_groups.planning_brief IS 'Structured planning context (occasion, date, headcount, budget, dietary, accessibility) for group_type=planning';
