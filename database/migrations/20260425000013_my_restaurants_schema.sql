-- Add 'owner' relationship type to chef_location_links
-- and restaurant_group_name to chefs table for restaurant showcase

-- 1. Expand the relationship_type check constraint to include 'owner'
ALTER TABLE public.chef_location_links
  DROP CONSTRAINT IF EXISTS chef_location_links_relationship_type_check;

ALTER TABLE public.chef_location_links
  ADD CONSTRAINT chef_location_links_relationship_type_check
  CHECK (relationship_type = ANY (ARRAY[
    'preferred'::text, 'exclusive'::text, 'featured'::text,
    'available_on_request'::text, 'owner'::text
  ]));

-- 2. Add restaurant_group_name to chefs (nullable, optional branding)
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS restaurant_group_name text;
