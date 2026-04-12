-- Migration: Add DocuSign tracking columns to event_contracts
-- The original new_integrations migration (20260327000013) conditionally added these
-- to a 'contracts' table that never existed. The app uses 'event_contracts'.

ALTER TABLE event_contracts
  ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
  ADD COLUMN IF NOT EXISTS docusign_status      TEXT,
  ADD COLUMN IF NOT EXISTS docusign_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS docusign_signed_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_event_contracts_docusign_envelope
  ON event_contracts (docusign_envelope_id)
  WHERE docusign_envelope_id IS NOT NULL;
