-- Migration: Add consent tracking to inquiries
-- Adds consent_at and consent_version columns to record explicit user consent
-- at the point of embed form submission (GDPR Article 9 compliance for health data).

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version TEXT;

COMMENT ON COLUMN inquiries.consent_at IS 'Timestamp when the submitter gave explicit consent to data collection and processing via the embed inquiry form. NULL for inquiries created through other channels (chef-entered, imported).';
COMMENT ON COLUMN inquiries.consent_version IS 'Version identifier of the consent text displayed at submission time (e.g. "2026-04-11"). Allows auditors to retrieve the exact wording the user agreed to.';
