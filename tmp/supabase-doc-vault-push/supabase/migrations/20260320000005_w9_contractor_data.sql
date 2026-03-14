-- Migration: 20260320000005_w9_contractor_data
-- Adds W-9 fields to staff_members for 1099-NEC compliance.
-- All columns are nullable — backward compatible with existing records.

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS contractor_type TEXT DEFAULT NULL
    CHECK (
      contractor_type IS NULL OR
      contractor_type IN ('individual', 'sole_proprietor', 'llc', 'partnership', 'corporation', 'other')
    ),
  ADD COLUMN IF NOT EXISTS tin TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tin_type TEXT DEFAULT NULL
    CHECK (tin_type IS NULL OR tin_type IN ('ssn', 'ein')),
  ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_street TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_city TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_zip TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS w9_signed_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS w9_document_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS w9_collected BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN staff_members.tin IS
  'Tax Identification Number (SSN or EIN). Display last 4 digits only in UI.';
COMMENT ON COLUMN staff_members.tin_type IS
  'ssn = Social Security Number. ein = Employer Identification Number (for LLCs/corps).';
COMMENT ON COLUMN staff_members.contractor_type IS
  'W-9 entity type. Used for Box 3 on 1099-NEC.';
COMMENT ON COLUMN staff_members.w9_collected IS
  'True when a signed W-9 has been received and TIN is on file.';
COMMENT ON COLUMN staff_members.w9_document_url IS
  'Optional URL to scanned W-9 document in Supabase Storage.';
