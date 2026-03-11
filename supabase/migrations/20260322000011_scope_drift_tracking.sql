-- Scope Drift Detection: track when event scope changes materially from original quote
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS scope_drift_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scope_drift_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converting_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_converting_quote ON events(converting_quote_id) WHERE converting_quote_id IS NOT NULL;
