-- Extend directory_waitlist so /nearby can capture structured unmet-demand signals
-- without creating a separate persistence path. Nearby-specific rows are tagged by
-- source so chef availability sweeps can ignore them.

ALTER TABLE public.directory_waitlist
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS cuisine text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_directory_waitlist_source
  ON public.directory_waitlist (source);
