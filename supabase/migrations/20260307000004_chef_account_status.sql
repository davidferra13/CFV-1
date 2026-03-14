-- Chef Account Status — allows admin to suspend/reactivate chef accounts
-- Suspended chefs cannot log into their portal.
--
-- FULLY ADDITIVE: adds a column with a safe default.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));

COMMENT ON COLUMN chefs.account_status IS 'active = normal access; suspended = portal login blocked by admin.';

CREATE INDEX IF NOT EXISTS idx_chefs_account_status ON chefs(account_status);
