-- Migration: Harden client portal tokens
-- New links store only a hash, expire automatically, and record last-use / revoke state.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_access_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_token_last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_token_revoked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_access_token_hash
  ON clients (portal_access_token_hash)
  WHERE portal_access_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_portal_token_expires_at
  ON clients (portal_token_expires_at)
  WHERE portal_token_expires_at IS NOT NULL;

COMMENT ON COLUMN clients.portal_access_token_hash IS
  'SHA-256 hash of the client portal access token. Raw tokens are only shown once at generation time.';

COMMENT ON COLUMN clients.portal_token_expires_at IS
  'Absolute expiration timestamp for the current client portal token.';

COMMENT ON COLUMN clients.portal_token_last_used_at IS
  'Timestamp of the most recent successful client portal token use.';

COMMENT ON COLUMN clients.portal_token_revoked_at IS
  'Timestamp when the current client portal token was revoked.';
