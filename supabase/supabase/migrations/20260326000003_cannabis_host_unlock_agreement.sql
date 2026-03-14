-- ============================================================
-- Migration: Cannabis Host Unlock Agreement (Phase 1)
-- Created:   2026-03-26
-- Purpose:   Persistent, immutable host-signed unlock records for
--            cannabis portal access gating.
-- ============================================================

CREATE TABLE IF NOT EXISTS cannabis_host_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL,
  signature_name TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  agreement_text_snapshot TEXT NOT NULL,
  immutable_hash TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cannabis_host_agreements_host_version_key UNIQUE (host_user_id, agreement_version)
);

ALTER TABLE cannabis_host_agreements ENABLE ROW LEVEL SECURITY;

-- Hosts can read only their own signed agreement rows.
CREATE POLICY "cannabis_host_agreements_read_own"
  ON cannabis_host_agreements
  FOR SELECT
  USING (host_user_id = auth.uid());

-- Hosts can insert only their own signature row.
CREATE POLICY "cannabis_host_agreements_insert_own"
  ON cannabis_host_agreements
  FOR INSERT
  WITH CHECK (host_user_id = auth.uid());

CREATE INDEX idx_cannabis_host_agreements_host_user_id
  ON cannabis_host_agreements(host_user_id);

CREATE INDEX idx_cannabis_host_agreements_signed_at
  ON cannabis_host_agreements(signed_at DESC);

CREATE INDEX idx_cannabis_host_agreements_version
  ON cannabis_host_agreements(agreement_version);

-- Immutable record enforcement: no update/delete after insert.
CREATE OR REPLACE FUNCTION prevent_cannabis_host_agreement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'cannabis_host_agreements is immutable after insert';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_cannabis_host_agreement_mutation_trigger
  BEFORE UPDATE OR DELETE ON cannabis_host_agreements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cannabis_host_agreement_mutation();
