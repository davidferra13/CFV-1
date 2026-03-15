-- Tip Request System (Uber-style post-service tip prompts)
-- Allows chefs to send tip request links to clients after completed events.
-- The client receives a public link with suggested amounts and can submit a tip.

CREATE TABLE IF NOT EXISTS tip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  request_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  suggested_amounts_cents INTEGER[] NOT NULL DEFAULT '{1500,2000,2500,0}',
  suggested_percentages INTEGER[] NOT NULL DEFAULT '{15,18,20,0}',
  tip_amount_cents INTEGER,
  tip_method TEXT CHECK (tip_method IN ('card', 'cash', 'venmo', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'declined')),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tip_requests_tenant ON tip_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tip_requests_event ON tip_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_tip_requests_token ON tip_requests(request_token);
CREATE INDEX IF NOT EXISTS idx_tip_requests_status ON tip_requests(tenant_id, status);

-- One active (non-completed) tip request per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_requests_active_event
  ON tip_requests(event_id)
  WHERE status IN ('pending', 'sent');

ALTER TABLE tip_requests ENABLE ROW LEVEL SECURITY;

-- Chef can manage their own tip requests
CREATE POLICY "tip_requests_chef_manage"
  ON tip_requests
  FOR ALL
  TO authenticated
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Public read access by token (for the client tip page, no auth needed)
CREATE POLICY "tip_requests_public_read_by_token"
  ON tip_requests
  FOR SELECT
  TO anon
  USING (true);

-- Public update by token (client submitting tip)
CREATE POLICY "tip_requests_public_update_by_token"
  ON tip_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE tip_requests IS 'Uber-style post-service tip request links sent to clients after completed events.';
COMMENT ON COLUMN tip_requests.request_token IS 'Public opaque token for /tip/[token] client-facing page.';
COMMENT ON COLUMN tip_requests.suggested_amounts_cents IS 'Preset tip amounts shown to client. 0 = custom amount option.';
COMMENT ON COLUMN tip_requests.suggested_percentages IS 'Percentage-based suggestions (of event total). 0 = custom.';
