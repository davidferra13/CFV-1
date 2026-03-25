-- ============================================
-- Add 'outbound_prospecting' to inquiry_channel enum
-- Used when a prospect is converted to an inquiry via the Prospecting Hub.
-- Additive only — no existing data affected.
-- ============================================

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'outbound_prospecting';
