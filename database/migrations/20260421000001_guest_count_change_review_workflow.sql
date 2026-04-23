ALTER TABLE public.guest_count_changes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

UPDATE public.guest_count_changes
SET
  status = CASE
    WHEN COALESCE(applied, false) THEN 'approved'
    ELSE 'pending'
  END,
  reviewed_at = CASE
    WHEN COALESCE(applied, false) THEN COALESCE(reviewed_at, applied_at)
    ELSE reviewed_at
  END,
  reviewed_by = CASE
    WHEN COALESCE(applied, false) THEN COALESCE(reviewed_by, requested_by)
    ELSE reviewed_by
  END
WHERE status NOT IN ('pending', 'approved', 'rejected')
   OR (status = 'pending' AND COALESCE(applied, false));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guest_count_changes_status_check'
  ) THEN
    ALTER TABLE public.guest_count_changes
      ADD CONSTRAINT guest_count_changes_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guest_count_changes_event_status
  ON public.guest_count_changes (event_id, status, created_at DESC);
