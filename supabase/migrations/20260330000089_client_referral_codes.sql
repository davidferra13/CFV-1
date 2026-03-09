-- Client referral QR support.
-- Each client can have a shareable referral code, and each referral submission
-- is tracked so loyalty rewards can be granted exactly once on completion.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_referral_code
  ON clients(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  referred_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  converted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  reward_points_awarded INTEGER NOT NULL DEFAULT 0,
  reward_awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_referrals_referrer
  ON client_referrals(referrer_client_id);

CREATE INDEX IF NOT EXISTS idx_client_referrals_referred
  ON client_referrals(referred_client_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_referrals_inquiry
  ON client_referrals(inquiry_id)
  WHERE inquiry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_referrals_event
  ON client_referrals(converted_event_id)
  WHERE converted_event_id IS NOT NULL;

COMMENT ON TABLE client_referrals IS
  'Tracks client-to-client referrals created from QR/share links.';
