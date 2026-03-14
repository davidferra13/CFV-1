-- Chef Public Booking Page
-- Enables a shareable /book/[chefSlug] URL for client self-booking.
-- All new columns on chefs — additive only. Existing rows default to disabled.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS booking_slug        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_enabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_headline    TEXT,
  ADD COLUMN IF NOT EXISTS booking_bio_short   TEXT,
  ADD COLUMN IF NOT EXISTS booking_min_notice_days   INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS booking_deposit_percent   INTEGER NOT NULL DEFAULT 0;

-- Constraint: slug must be lowercase alphanum + dashes only
ALTER TABLE chefs
  ADD CONSTRAINT chefs_booking_slug_format
    CHECK (booking_slug IS NULL OR booking_slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$');

-- Constraint: deposit percent 0-100
ALTER TABLE chefs
  ADD CONSTRAINT chefs_booking_deposit_pct_range
    CHECK (booking_deposit_percent >= 0 AND booking_deposit_percent <= 100);

-- Constraint: min notice 0-90 days
ALTER TABLE chefs
  ADD CONSTRAINT chefs_booking_min_notice_range
    CHECK (booking_min_notice_days >= 0 AND booking_min_notice_days <= 90);

-- Index for fast slug lookup (public, no auth)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chefs_booking_slug
  ON chefs(booking_slug)
  WHERE booking_slug IS NOT NULL;
