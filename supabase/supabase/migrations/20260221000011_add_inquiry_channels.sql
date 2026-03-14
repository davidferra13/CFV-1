-- ============================================
-- ChefFlow V1 - Expand Inquiry Channel Options
-- Adds 'referral' and 'walk_in' to inquiry_channel enum
-- for manually-logged leads that come from offline sources.
-- Additive only: no existing data affected.
-- ============================================

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'walk_in';
