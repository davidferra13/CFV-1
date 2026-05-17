-- Client Passport expansion: confidential notes + special dates tracking
-- ADDITIVE ONLY: no drops, no deletes, no type changes

-- 1. Add is_confidential column to existing client_notes table
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering confidential notes
CREATE INDEX IF NOT EXISTS idx_client_notes_confidential
  ON client_notes(tenant_id, client_id, is_confidential)
  WHERE is_confidential = true;

-- 2. Client Special Dates table (birthdays, anniversaries, recurring events)
CREATE TABLE IF NOT EXISTS client_special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'annual'
    CHECK (recurrence IN ('annual', 'once')),
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_special_dates_tenant_client
  ON client_special_dates(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_client_special_dates_upcoming
  ON client_special_dates(tenant_id, date);

COMMENT ON TABLE client_special_dates IS 'Important dates for clients: birthdays, anniversaries, recurring occasions. Used by passport and Remy for proactive outreach.';
COMMENT ON COLUMN client_special_dates.recurrence IS 'annual = repeats yearly (birthday, anniversary), once = one-time date';
