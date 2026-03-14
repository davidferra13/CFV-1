-- Migration: Demo Data Flag
-- Adds is_demo boolean to clients, events, and inquiries.
-- Allows the demo data seeder to mark records as sample data,
-- and the clear function to remove them cleanly.
-- PURELY ADDITIVE — existing rows get DEFAULT FALSE, no data loss.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial indexes for fast demo data lookup (only indexes the rare TRUE case)
CREATE INDEX IF NOT EXISTS idx_clients_is_demo ON clients (tenant_id) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_is_demo ON events (tenant_id) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_inquiries_is_demo ON inquiries (tenant_id) WHERE is_demo = TRUE;
