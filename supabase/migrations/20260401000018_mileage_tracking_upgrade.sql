-- Mileage Tracking Upgrade
-- Adds purpose categories, from/to locations, and notes to mileage_logs.
-- Updates IRS default rate from 67 to 73 (closest integer to 72.5 cents/mile for 2026).
-- Server actions compute deductions at the precise 72.5 rate.

-- Add purpose column with constrained values
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  purpose TEXT NOT NULL DEFAULT 'other'
    CHECK (purpose IN (
      'client_service',
      'grocery_shopping',
      'event_prep',
      'consultation',
      'delivery',
      'other'
    ));

-- Add from/to location columns
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  from_location TEXT;

ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  to_location TEXT;

-- Add notes column
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  notes TEXT;

-- Update default IRS rate for new rows (72.5 rounded to nearest integer)
ALTER TABLE mileage_logs ALTER COLUMN irs_rate_cents SET DEFAULT 73;

-- Add updated_at column for edit tracking
ALTER TABLE mileage_logs ADD COLUMN IF NOT EXISTS
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index on purpose for breakdown queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_mileage_purpose ON mileage_logs(tenant_id, purpose);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
