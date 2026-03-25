-- Add 'staff' to the user_role enum
-- Required for the "Create Staff Login" feature so staff members
-- can authenticate and access the staff portal.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
