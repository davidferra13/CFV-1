-- Testimonial/Review Collection: post-event request and display system
-- Separate from guest_testimonials (recap-page based). This table supports
-- direct review requests sent to clients via unique token links.

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL DEFAULT '',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  request_token TEXT UNIQUE,
  request_sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  display_name TEXT,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for chef queries and public display
CREATE INDEX IF NOT EXISTS idx_testimonials_tenant_approved_public
  ON testimonials (tenant_id, is_approved, is_public);

CREATE INDEX IF NOT EXISTS idx_testimonials_request_token
  ON testimonials (request_token) WHERE request_token IS NOT NULL;

-- RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Chef can read/write their own testimonials
CREATE POLICY testimonials_chef_all ON testimonials
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Public read for approved + public testimonials (chef website display)
CREATE POLICY testimonials_public_read ON testimonials
  FOR SELECT
  USING (is_approved = true AND is_public = true);

-- Service role can insert (for public token-based submissions)
CREATE POLICY testimonials_service_insert ON testimonials
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Only apply service policy to service_role, not anon
ALTER POLICY testimonials_service_insert ON testimonials
  TO service_role;

COMMENT ON TABLE testimonials IS 'Post-event review requests and client testimonials with token-based submission.';
COMMENT ON COLUMN testimonials.request_token IS 'Unique token for the public review submission URL.';
COMMENT ON COLUMN testimonials.is_public IS 'Whether the client consented to public display on chef website.';
COMMENT ON COLUMN testimonials.display_name IS 'Name the client wants shown publicly (may differ from client_name).';
