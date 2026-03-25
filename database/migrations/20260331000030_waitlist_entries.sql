-- Walk-In Waitlist
-- Manages walk-in guests with queue position, estimated wait times, and status tracking.
-- Additive only. No existing tables modified.

-- ENUM: Waitlist entry status
DO $$ BEGIN CREATE TYPE waitlist_status AS ENUM ('waiting', 'notified', 'seated', 'cancelled', 'no_show'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Table: Waitlist Entries
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  guest_name              TEXT NOT NULL,
  guest_phone             TEXT,
  party_size              INTEGER NOT NULL DEFAULT 1 CHECK (party_size >= 1 AND party_size <= 100),
  estimated_wait_minutes  INTEGER NOT NULL DEFAULT 0,
  quoted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  seated_at               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  table_id                UUID,
  status                  waitlist_status NOT NULL DEFAULT 'waiting',
  notes                   TEXT,
  position                INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Backfill columns that may be missing if the table was created by an earlier migration variant
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS table_id UUID;
ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_chef ON waitlist_entries(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_position ON waitlist_entries(chef_id, position) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_date ON waitlist_entries(chef_id, created_at);
COMMENT ON TABLE waitlist_entries IS 'Walk-in waitlist queue. Tracks position, estimated wait, and status through seating.';
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS waitlist_entries_chef_policy ON waitlist_entries;
  CREATE POLICY waitlist_entries_chef_policy ON waitlist_entries
    USING (chef_id = (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
