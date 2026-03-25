-- Directory Approval System
-- Only admin-approved chefs appear in the public /chefs directory.
-- The founder account (davidferra13@gmail.com) is always approved.

-- 1. Add approval column (default false — new chefs must be approved)
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS directory_approved BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN chefs.directory_approved
  IS 'Admin-controlled flag: only chefs with directory_approved=true appear in the public directory. Founder is always listed.';

-- 2. Auto-approve the founder account
UPDATE chefs SET directory_approved = true
WHERE lower(email) = 'davidferra13@gmail.com';

-- 3. Index for the directory query
CREATE INDEX IF NOT EXISTS idx_chefs_directory_approved
  ON chefs (directory_approved) WHERE directory_approved = true;
