-- Add last_login_at + dormancy_nudge_sent_at to chefs table.
-- last_login_at: updated on each sign-in via recordSuccessfulAccountAccess.
-- dormancy_nudge_sent_at: set by dormancy-nudge cron to prevent re-sends.

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS dormancy_nudge_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_chefs_last_login_at
  ON public.chefs (last_login_at) WHERE last_login_at IS NOT NULL;
