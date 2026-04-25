CREATE TABLE IF NOT EXISTS public.hub_group_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  added_by_profile_id uuid NOT NULL REFERENCES public.hub_guest_profiles(id) ON DELETE CASCADE,
  candidate_type text NOT NULL CHECK (
    candidate_type IN ('chef', 'listing', 'menu', 'package', 'meal_prep_item')
  ),
  chef_id uuid REFERENCES public.chefs(id) ON DELETE CASCADE,
  directory_listing_id uuid REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES public.menus(id) ON DELETE CASCADE,
  experience_package_id uuid REFERENCES public.experience_packages(id) ON DELETE CASCADE,
  meal_prep_item_id uuid REFERENCES public.meal_prep_items(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  notes text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hub_group_candidates_group
  ON public.hub_group_candidates(group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_hub_group_candidates_type
  ON public.hub_group_candidates(candidate_type);

ALTER TABLE public.hub_groups
  ADD COLUMN IF NOT EXISTS planning_brief jsonb;

COMMENT ON TABLE public.hub_group_candidates IS 'Pre-booking shortlist candidates for planning-mode hub groups';
COMMENT ON COLUMN public.hub_groups.planning_brief IS 'Structured planning context (occasion, date, headcount, budget, dietary, accessibility) for group_type=planning';
