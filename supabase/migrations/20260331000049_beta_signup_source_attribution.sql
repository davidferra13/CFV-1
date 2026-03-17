-- Preserve marketing attribution for public beta signups.
-- These fields capture which landing page and CTA drove the signup request.

ALTER TABLE beta_signups
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS source_cta text;

CREATE INDEX IF NOT EXISTS idx_beta_signups_source_page
  ON beta_signups (source_page);

COMMENT ON COLUMN beta_signups.source_page IS
  'Public page path or logical page name that drove the beta signup.';

COMMENT ON COLUMN beta_signups.source_cta IS
  'Specific CTA identifier that drove the beta signup.';
