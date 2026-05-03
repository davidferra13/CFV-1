-- Add confirmed_allergies column to inquiries table
-- Currently allergy data from inquiries is lost when converting to client
-- because only confirmed_dietary_restrictions exists. This column captures
-- explicit allergy mentions separately so they flow to clients.allergies.
--
-- Additive only. No data loss. No column modifications.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS confirmed_allergies text[] DEFAULT '{}';

COMMENT ON COLUMN inquiries.confirmed_allergies IS 'Allergies confirmed during inquiry processing (e.g. peanut, shellfish). Separate from dietary restrictions.';
