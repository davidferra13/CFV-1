-- Financial Closure
-- Adds financial closure tracking and mileage tracking to the events table.
--
-- financial_closed: true when the chef marks the event financially settled
--   (all payments received, all receipts approved, tip recorded if any)
-- financial_closed_at: timestamp of closure
-- mileage_miles: total miles driven for this event (round trip: home → stores → client → home)
--   Used to compute IRS mileage deduction value in the Event Financial Summary.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS financial_closed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mileage_miles DECIMAL(8,2);
-- Constraint: mileage must be non-negative if provided
ALTER TABLE events
  ADD CONSTRAINT events_mileage_non_negative
    CHECK (mileage_miles IS NULL OR mileage_miles >= 0);
CREATE INDEX IF NOT EXISTS idx_events_financial_closed
  ON events(tenant_id, financial_closed)
  WHERE financial_closed = true;
COMMENT ON COLUMN events.financial_closed IS
  'True when the chef has marked this event financially closed (all payments received, all receipts approved).';
COMMENT ON COLUMN events.financial_closed_at IS
  'Timestamp when financial_closed was set to true.';
COMMENT ON COLUMN events.mileage_miles IS
  'Total miles driven for this event. Used for IRS mileage deduction calculation.';
