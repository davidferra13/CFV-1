-- Lost Quote Reason Tracker: capture why quotes don't convert for gap analysis
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS lost_reason TEXT CHECK (lost_reason IN (
    'price_too_high','chose_another_chef','date_not_available',
    'cuisine_not_right_fit','client_lost_interest','other'
  )),
  ADD COLUMN IF NOT EXISTS lost_notes TEXT,
  ADD COLUMN IF NOT EXISTS lost_recorded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quotes_lost_reason ON quotes(tenant_id, lost_reason) WHERE lost_reason IS NOT NULL;
