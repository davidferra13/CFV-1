-- Newsletter subscribers table
-- Simple email collection for marketing newsletter.
-- No auth required — public form submission.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  source text DEFAULT 'website_footer'
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers (email);

-- RLS: Only service role can read/write (server actions use admin client)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- No public policies — all access via admin client (service role)
COMMENT ON TABLE newsletter_subscribers IS 'Email signups from public footer newsletter form. Accessed only via admin client.';
