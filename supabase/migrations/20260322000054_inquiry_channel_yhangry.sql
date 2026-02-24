-- ============================================
-- Add 'yhangry' to inquiry_channel enum
-- Used when Gmail sync detects emails from yhangry.com
-- (UK-based private chef marketplace, similar to TakeAChef).
-- Additive only — no existing data affected.
-- ============================================

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'yhangry';
