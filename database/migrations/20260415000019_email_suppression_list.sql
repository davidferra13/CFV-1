-- I2: Email suppression list for bounced/invalid addresses
-- Prevents sending to addresses that have hard-bounced or been reported invalid
-- by the email provider (Resend). Checked before every sendEmail() call.

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL,                         -- 'hard_bounce', 'invalid', 'complaint', 'manual'
  source TEXT NOT NULL DEFAULT 'resend',         -- 'resend', 'manual', 'webhook'
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One suppression per email address
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_email
  ON email_suppressions (lower(email));

-- Fast lookup by email (case-insensitive)
COMMENT ON TABLE email_suppressions IS 'Global email suppression list. Addresses here never receive transactional email.';
