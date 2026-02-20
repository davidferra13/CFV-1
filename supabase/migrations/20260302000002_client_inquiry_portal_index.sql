-- Migration: Client inquiry portal — performance index
-- Adds a composite index to support the new client portal query pattern:
--   SELECT ... FROM inquiries WHERE client_id = $1 AND status IN (...)
--
-- ADDITIVE ONLY. No DROP, no ALTER of existing columns, no data risk.
-- The RLS policies for client read access (inquiries_client_select and
-- inquiry_transitions_client_select) already exist in layer 2.
-- This migration only adds a missing performance index.

CREATE INDEX IF NOT EXISTS idx_inquiries_client_status
  ON inquiries(client_id, status)
  WHERE client_id IS NOT NULL;

COMMENT ON INDEX idx_inquiries_client_status IS
  'Supports client portal inquiry list queries filtered by client_id and status.';
