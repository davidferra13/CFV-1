-- ============================================
-- NETWORK DISCOVERABLE: DEFAULT TRUE (OPT-OUT)
-- ============================================
-- Changes the network discoverability model from opt-in to opt-out.
-- Previously chefs were hidden by default and had to enable discovery.
-- Now chefs are discoverable by default and can opt out if they want privacy.
--
-- This migration:
-- 1. Changes the column default from false to true
-- 2. Flips all existing false rows to true so current chefs become visible
--
-- No data loss. No schema changes. Purely updates defaults and existing values.
-- RLS policies remain unchanged (they already filter on network_discoverable = true).
-- ============================================

-- Change default for new rows
ALTER TABLE chef_preferences
  ALTER COLUMN network_discoverable SET DEFAULT true;
-- Make all existing chefs discoverable
UPDATE chef_preferences
  SET network_discoverable = true
  WHERE network_discoverable = false;
