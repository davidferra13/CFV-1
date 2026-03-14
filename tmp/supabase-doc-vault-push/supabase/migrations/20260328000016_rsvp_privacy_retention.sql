-- RSVP privacy + retention controls
-- 1) Explicit consent fields on event_guests
-- 2) Backfill consent timestamps for existing rows

ALTER TABLE event_guests
  ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_processing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;
UPDATE event_guests
SET data_processing_consent_at = COALESCE(data_processing_consent_at, created_at, now())
WHERE data_processing_consent = true
  AND data_processing_consent_at IS NULL;
