-- Email Sender Reputation — self-improving spam filter
-- Tracks how the chef interacts with emails from each domain.
-- Domains that are consistently dismissed (mark done, never replied to,
-- never converted to inquiry) get auto-classified as marketing.

CREATE TABLE IF NOT EXISTS email_sender_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_domain TEXT NOT NULL,
  sender_email TEXT,
  reputation TEXT NOT NULL DEFAULT 'unknown'
    CHECK (reputation IN ('trusted', 'spam', 'marketing', 'unknown')),
  mark_done_count INT NOT NULL DEFAULT 0,
  mark_spam_count INT NOT NULL DEFAULT 0,
  replied_count INT NOT NULL DEFAULT 0,
  inquiry_created_count INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sender_domain)
);

-- Index for fast lookup during classification
CREATE INDEX IF NOT EXISTS idx_sender_reputation_lookup
  ON email_sender_reputation (tenant_id, sender_domain);

-- RLS
ALTER TABLE email_sender_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for sender reputation"
  ON email_sender_reputation
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
