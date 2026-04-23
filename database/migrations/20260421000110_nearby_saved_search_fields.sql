-- Extend directory_waitlist so /nearby saved-search alerts can preserve the
-- full filter state and dedupe per email + saved search, not just by location.

ALTER TABLE public.directory_waitlist
  ADD COLUMN IF NOT EXISTS search_query text,
  ADD COLUMN IF NOT EXISTS location_query text,
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS radius_miles integer,
  ADD COLUMN IF NOT EXISTS user_lat double precision,
  ADD COLUMN IF NOT EXISTS user_lon double precision,
  ADD COLUMN IF NOT EXISTS baseline_match_count integer,
  ADD COLUMN IF NOT EXISTS saved_search_key text,
  ADD COLUMN IF NOT EXISTS filter_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_directory_waitlist_saved_search_key
  ON public.directory_waitlist (saved_search_key)
  WHERE saved_search_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_waitlist_email_saved_search_key
  ON public.directory_waitlist (email, saved_search_key)
  WHERE saved_search_key IS NOT NULL;
