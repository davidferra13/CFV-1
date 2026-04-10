-- Supplier Calls
-- Logs every AI-initiated phone call made on a chef's behalf to a vendor.
-- Each call asks one yes/no question: does the vendor have a specific ingredient?

CREATE TABLE IF NOT EXISTS supplier_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name     TEXT NOT NULL,
  vendor_phone    TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  call_sid        TEXT,                    -- Twilio call SID, set after call is placed
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy')),
  result          TEXT                     -- 'yes', 'no', or null if no response captured
                  CHECK (result IN ('yes', 'no') OR result IS NULL),
  duration_seconds INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_calls_chef_id_idx ON supplier_calls(chef_id);
CREATE INDEX IF NOT EXISTS supplier_calls_call_sid_idx ON supplier_calls(call_sid);
CREATE INDEX IF NOT EXISTS supplier_calls_created_at_idx ON supplier_calls(chef_id, created_at DESC);
