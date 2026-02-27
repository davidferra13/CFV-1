-- Beta signups table
-- Stores public beta interest form submissions from /beta page.
-- Platform-level — no tenant scoping (this is about onboarding new chefs, not per-chef data).
-- All access via admin client (service role key).

CREATE TABLE IF NOT EXISTS beta_signups (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text NOT NULL,
  email             text NOT NULL UNIQUE,
  phone             text,
  business_name     text,
  cuisine_type      text,
  years_in_business text,
  referral_source   text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'invited', 'onboarded', 'declined')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  invited_at        timestamptz,
  onboarded_at      timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups (email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_status ON beta_signups (status);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON beta_signups (created_at DESC);

-- RLS: enabled but no public policies — all access via admin client (service role)
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE beta_signups IS 'Beta interest signups from /beta public page. Managed by admin via /admin/beta. Accessed only via admin client.';
