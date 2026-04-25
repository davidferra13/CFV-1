-- Chef Schedule Blocks
-- Records external commitments (restaurant shifts, personal time, prep blocks)
-- so the chef can see real availability alongside private dining events.
-- Additive migration: new table only. No existing tables modified.

CREATE TABLE IF NOT EXISTS chef_schedule_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  block_type      TEXT NOT NULL DEFAULT 'external_shift',
  -- block_type values: 'external_shift', 'personal', 'prep', 'blocked'
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  -- iCal RRULE string for repeating blocks, e.g.:
  -- 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' (weekday restaurant shifts)
  -- NULL means one-off block
  source          TEXT NOT NULL DEFAULT 'manual',
  -- source values: 'manual', 'google_calendar', 'import'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT csb_end_after_start CHECK (end_at > start_at OR all_day = true)
);

-- Index for fast lookup by chef + date range
CREATE INDEX IF NOT EXISTS idx_chef_schedule_blocks_chef_date
  ON chef_schedule_blocks(chef_id, start_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_chef_schedule_blocks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chef_schedule_blocks_updated_at
  BEFORE UPDATE ON chef_schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION update_chef_schedule_blocks_updated_at();
