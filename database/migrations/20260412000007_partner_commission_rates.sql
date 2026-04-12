-- Add numeric commission rate fields to referral_partners
-- Replaces free-text commission_notes with structured rate tracking.
-- commission_notes is kept for backward compatibility and additional context.

ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none'
    CHECK (commission_type IN ('percentage', 'flat_fee', 'none')),
  ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_flat_cents INTEGER;

COMMENT ON COLUMN referral_partners.commission_type IS 'Type of commission: none, percentage, or flat_fee';
COMMENT ON COLUMN referral_partners.commission_rate_percent IS 'Percentage commission rate (e.g. 10.00 for 10%)';
COMMENT ON COLUMN referral_partners.commission_flat_cents IS 'Flat fee commission in cents (e.g. 5000 for $50.00)';
