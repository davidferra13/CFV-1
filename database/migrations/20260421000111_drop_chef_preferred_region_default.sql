-- Remove the hardcoded regional default so new chefs do not inherit
-- an implicit home market before choosing their own coverage.

ALTER TABLE public.chefs
  ALTER COLUMN preferred_region DROP DEFAULT;
