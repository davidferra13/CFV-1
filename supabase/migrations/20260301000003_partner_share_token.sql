-- Migration: Add share_token to referral_partners
-- Enables chefs to generate a public read-only contribution report link
-- to share with their partners showing events served at their location(s).
-- This is purely additive — no existing data is affected.

ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_partners_share_token
  ON referral_partners(share_token)
  WHERE share_token IS NOT NULL;
COMMENT ON COLUMN referral_partners.share_token IS
  'Public share token for the partner contribution report. Generated on demand by the chef. When set, anyone with the URL can view a read-only report of services delivered at this partner''s location(s).';
