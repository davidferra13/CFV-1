-- Referral Records: granular log of individual referrals from partners.
-- Complements the event-level referral_partner_id FK on events/inquiries
-- by capturing referrals that may not yet have an event or client record.

CREATE TABLE IF NOT EXISTS referral_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES referral_partners(id) ON DELETE CASCADE,
  client_id UUID,
  event_id UUID,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_records_tenant ON referral_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_partner ON referral_records(tenant_id, partner_id);
