-- ============================================
-- BUSINESS OPT-IN
-- ============================================
-- Adds an optional "business mode" flag to chef_preferences.
-- When false (default): platform is personal-chef-friendly —
--   no business terminology, no tax/compliance tools shown.
-- When true: business tools unlocked (tax workflow, legal name,
--   business address, compliance).
--
-- All new columns are nullable/defaulted — zero data risk.
-- ============================================

-- ─── Business mode toggle ────────────────────
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN chef_preferences.is_business IS
  'Chef has opted into business-mode features. When false, tax workflow, compliance, and legal name fields are hidden. Defaults to false so new chefs see a personal-first experience.';

-- ─── Optional business identity fields ───────
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS business_legal_name TEXT;

ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS business_address TEXT;

COMMENT ON COLUMN chef_preferences.business_legal_name IS
  'Legal registered business name (e.g. "Jane Smith LLC"). Separate from display name.';

COMMENT ON COLUMN chef_preferences.business_address IS
  'Primary business mailing address for invoices and tax documents.';

-- ─── Grants ──────────────────────────────────
-- chef_preferences is already accessible to authenticated users
-- via existing RLS policies — no new grants needed.
