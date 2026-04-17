-- Directory waitlist: captures email + location when a consumer searches
-- the chef directory and gets zero results. Used to notify them when
-- coverage expands to their area.

CREATE TABLE IF NOT EXISTS public.directory_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate signups for the same email + location
CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_waitlist_email_location
  ON public.directory_waitlist (lower(email), lower(location));

-- Fast lookup by location for batch notifications
CREATE INDEX IF NOT EXISTS idx_directory_waitlist_location
  ON public.directory_waitlist (lower(location));
