-- Client Important Dates
-- Adds a structured JSONB column for custom important dates (kids' birthdays, wedding anniversaries, etc.)
-- birthday and anniversary DATE columns already exist from migration 20260322000037.
-- This adds the flexible important_dates array for everything else.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS important_dates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clients.important_dates IS 'Array of {label, date} objects for custom reminders (kids birthdays, wedding anniversary, etc.)';

CREATE INDEX IF NOT EXISTS idx_clients_important_dates ON clients(tenant_id)
  WHERE important_dates != '[]'::jsonb;
