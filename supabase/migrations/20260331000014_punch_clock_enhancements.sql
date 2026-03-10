-- Punch Clock Enhancements
-- Adds role and voided columns to staff_clock_entries for the per-staff punch clock system.
-- Also adds a composite index on (chef_id, clock_in_at) for date-range queries.

-- Add role column (what role they worked this shift, may differ from default role)
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS role_override TEXT;

-- Add voided column (soft delete for manager corrections)
ALTER TABLE staff_clock_entries ADD COLUMN IF NOT EXISTS voided BOOLEAN NOT NULL DEFAULT false;

-- Composite index for date-range queries scoped by tenant
CREATE INDEX IF NOT EXISTS idx_staff_clock_tenant_date ON staff_clock_entries(chef_id, clock_in_at);
