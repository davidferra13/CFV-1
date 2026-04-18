-- Add notified_at column to directory_waitlist so we can track which
-- waitlist entries have been notified when a chef joins their area.

ALTER TABLE public.directory_waitlist
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_directory_waitlist_not_notified
  ON public.directory_waitlist (notified_at) WHERE notified_at IS NULL;
