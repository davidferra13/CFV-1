-- ============================================================================
-- Communication Ingestion Pipeline
-- Adds: staging layer, per-chef inbound email channels, Twilio bring-your-own,
--       is_raw_signal_only flag on communication_events
-- ============================================================================

-- Add is_raw_signal_only to communication_events
-- true  = raw feed only (personal, spam, marketing emails ingested but not triaged)
-- false = appears in triage tabs (default, actionable communications)
ALTER TABLE communication_events
  ADD COLUMN IF NOT EXISTS is_raw_signal_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comm_events_raw_signal
  ON communication_events(tenant_id, is_raw_signal_only, timestamp DESC);

-- Staging columns on clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staged_from_signal_id UUID REFERENCES communication_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_is_staged
  ON clients(tenant_id, is_staged) WHERE is_staged = true;

-- Staging columns on inquiries
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staged_from_signal_id UUID REFERENCES communication_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_is_staged
  ON inquiries(tenant_id, is_staged) WHERE is_staged = true;

-- Staging columns on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staged_from_signal_id UUID REFERENCES communication_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_staged
  ON events(tenant_id, is_staged) WHERE is_staged = true;

-- Per-chef inbound email alias (e.g. "cf-a1b2c3d4@cheflowhq.com")
-- One alias per chef, generated on first access, immutable
CREATE TABLE IF NOT EXISTS chef_email_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inbound_alias TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chef_email_channels_chef UNIQUE (chef_id),
  CONSTRAINT uq_chef_email_channels_alias UNIQUE (inbound_alias)
);

CREATE INDEX IF NOT EXISTS idx_chef_email_channels_alias
  ON chef_email_channels(inbound_alias);

ALTER TABLE chef_email_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_email_channels_access" ON chef_email_channels;
CREATE POLICY "chef_email_channels_access" ON chef_email_channels
  FOR ALL
  USING  (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Per-chef Twilio credentials (bring-your-own)
-- auth_token_enc is AES-256-GCM encrypted using COMMS_ENCRYPTION_KEY env var
CREATE TABLE IF NOT EXISTS chef_twilio_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  account_sid       TEXT NOT NULL,
  auth_token_enc    TEXT NOT NULL,
  phone_number      TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chef_twilio_creds_chef UNIQUE (chef_id)
);

ALTER TABLE chef_twilio_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_twilio_creds_access" ON chef_twilio_credentials;
CREATE POLICY "chef_twilio_creds_access" ON chef_twilio_credentials
  FOR ALL
  USING  (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
