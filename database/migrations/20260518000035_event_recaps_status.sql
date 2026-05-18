-- Safety patch: add status, error_message, created_at, updated_at to event_recaps
-- if the table was applied before these columns existed.

ALTER TABLE event_recaps
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done'
    CHECK (status IN ('pending', 'rendering', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS event_recaps_status_idx ON event_recaps (status);
