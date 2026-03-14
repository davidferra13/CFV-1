-- Client Pre-Dinner Worksheets
-- Shareable public links where clients fill out preferences, allergies, guest count,
-- and address before a dinner. Replaces scattered text messages between chef and client.

CREATE TABLE IF NOT EXISTS client_worksheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  token         TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),

  -- Pre-filled by chef (optional context)
  event_date    DATE,
  occasion      TEXT,
  chef_note     TEXT,

  -- Filled by client
  client_name         TEXT,
  client_email        TEXT,
  client_phone        TEXT,
  guest_count         INT,
  location_address    TEXT,
  dietary_restrictions TEXT[],
  allergies           TEXT[],
  preferences         TEXT,
  special_requests    TEXT,

  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookups (public access)
CREATE INDEX IF NOT EXISTS idx_client_worksheets_token ON client_worksheets(token);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_client_worksheets_tenant ON client_worksheets(tenant_id);

-- RLS
ALTER TABLE client_worksheets ENABLE ROW LEVEL SECURITY;

-- Chefs can read/write their own worksheets
CREATE POLICY client_worksheets_chef_all ON client_worksheets
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- Public read/update by token (for the client filling it out)
-- Note: public access is handled via API route, not RLS

COMMENT ON TABLE client_worksheets IS 'Pre-dinner worksheets sent to clients to capture preferences and logistics before the event';
COMMENT ON COLUMN client_worksheets.token IS 'Public access token for the worksheet URL';
