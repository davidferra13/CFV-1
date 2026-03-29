-- Platform Intelligence Hub Phase 1: Multi-Platform Settings
-- Adds active_platforms convenience column (denormalized from JSONB for query speed).
-- The JSONB integration_connection_settings remains the source of truth.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS active_platforms text[] DEFAULT '{}';

-- Add first_response_at for SLA tracking (Phase 3, added now to avoid a separate migration)
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;
