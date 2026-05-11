-- Email Portal Strategy: track portal introduction and snapshot versioning
-- Supports the A/B email strategy for transitioning clients from email-only to portal usage.

-- Track when a client was first sent a portal (Dinner Circle) link
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_introduced_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN clients.portal_introduced_at IS 'Timestamp when the client was first sent a Dinner Circle / portal link via email';

-- Track which snapshot version was used per outgoing message (a = email only, b = portal transition)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS snapshot_version TEXT DEFAULT NULL;

COMMENT ON COLUMN messages.snapshot_version IS 'Email snapshot footer version: a = email only (full inline), b = portal transition (teased with circle link)';
