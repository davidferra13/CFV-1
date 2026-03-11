-- QR rebook links for completed events.
-- One active token per completed event. The token expires after one year
-- and is consumed once the rebook inquiry is submitted.

CREATE TABLE IF NOT EXISTS rebook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '365 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rebook_tokens_client_id ON rebook_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_rebook_tokens_event_id ON rebook_tokens(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rebook_tokens_active_event
  ON rebook_tokens(event_id)
  WHERE used_at IS NULL;
COMMENT ON TABLE rebook_tokens IS
  'Single-use public rebook links for completed events.';
COMMENT ON COLUMN rebook_tokens.token IS
  'Opaque token embedded in /rebook/[token] QR links.';
