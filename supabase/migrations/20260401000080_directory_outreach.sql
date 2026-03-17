-- Directory Outreach & Email Preferences
-- Tracks emails sent to businesses that opted in (submitted or claimed)
-- and their communication preferences.

-- Outreach log: every email sent to a directory listing contact
CREATE TABLE IF NOT EXISTS directory_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES directory_listings(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  resend_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  error text
);

CREATE INDEX idx_directory_outreach_listing ON directory_outreach_log(listing_id);
CREATE INDEX idx_directory_outreach_type ON directory_outreach_log(email_type);
CREATE INDEX idx_directory_outreach_resend ON directory_outreach_log(resend_message_id) WHERE resend_message_id IS NOT NULL;

-- Email preferences: opt-out tracking per email address
CREATE TABLE IF NOT EXISTS directory_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  opted_out boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  opt_out_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_directory_email_prefs_email ON directory_email_preferences(email);

-- RLS
ALTER TABLE directory_outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_email_preferences ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write outreach log
CREATE POLICY "directory_outreach_admin" ON directory_outreach_log
  FOR ALL USING (auth.role() = 'service_role');

-- Only service_role can manage preferences
CREATE POLICY "directory_email_prefs_admin" ON directory_email_preferences
  FOR ALL USING (auth.role() = 'service_role');
