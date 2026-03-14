-- ============================================
-- NETWORK DISCOVERABILITY BOOTSTRAP
-- ============================================
-- Ensures discoverability is opt-out in practice:
-- 1) default is true
-- 2) existing chefs are visible
-- 3) every chef has a chef_preferences row
-- ============================================

-- Ensure column exists (for environments missing prior migration)
ALTER TABLE chef_preferences
  ADD COLUMN IF NOT EXISTS network_discoverable BOOLEAN;

-- Normalize legacy/null rows before NOT NULL
UPDATE chef_preferences
  SET network_discoverable = true
  WHERE network_discoverable IS NULL;

-- Discoverability is opt-out
ALTER TABLE chef_preferences
  ALTER COLUMN network_discoverable SET DEFAULT true;

ALTER TABLE chef_preferences
  ALTER COLUMN network_discoverable SET NOT NULL;

-- Make all existing chefs discoverable
UPDATE chef_preferences
  SET network_discoverable = true
  WHERE network_discoverable = false;

-- Backfill missing preferences rows so every chef is represented in network logic
INSERT INTO chef_preferences (chef_id, tenant_id, network_discoverable)
SELECT c.id, c.id, true
FROM chefs c
LEFT JOIN chef_preferences cp ON cp.chef_id = c.id
WHERE cp.chef_id IS NULL;
