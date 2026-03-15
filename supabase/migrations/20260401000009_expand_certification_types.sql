-- Expand chef_certifications cert_type check constraint to include insurance and permit types.
-- Also adds 'expiring_soon' to the status check constraint for computed status support.
-- Adds issuer column alias and notes column if missing.

-- ─── Expand cert_type values ────────────────────────────────────────────────

-- Drop existing check constraints on cert_type (both possible names from prior migrations)
DO $$
BEGIN
  -- Drop any check constraint that references cert_type
  EXECUTE (
    SELECT string_agg('ALTER TABLE chef_certifications DROP CONSTRAINT ' || quote_ident(conname) || ';', ' ')
    FROM pg_constraint
    WHERE conrelid = 'chef_certifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%cert_type%'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Re-add with expanded values
ALTER TABLE chef_certifications ADD CONSTRAINT chef_certifications_cert_type_check
  CHECK (cert_type IN (
    'servsafe',
    'food_handler',
    'servsafe_manager',
    'allergen_awareness',
    'business_license',
    'health_permit',
    'liability_insurance',
    'workers_comp',
    'auto_insurance',
    'llc',
    'cottage_food',
    'other'
  ));

-- ─── Expand status to include 'expiring_soon' and 'pending_renewal' ─────────

DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('ALTER TABLE chef_certifications DROP CONSTRAINT ' || quote_ident(conname) || ';', ' ')
    FROM pg_constraint
    WHERE conrelid = 'chef_certifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%cert_type%'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE chef_certifications ADD CONSTRAINT chef_certifications_status_check
  CHECK (status IN ('active', 'expiring_soon', 'expired', 'pending_renewal'));

-- ─── Add missing columns (idempotent) ───────────────────────────────────────

ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS issuer TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS issued_at DATE;
ALTER TABLE chef_certifications ADD COLUMN IF NOT EXISTS expires_at DATE;

-- Backfill issued_at/expires_at from issued_date/expiry_date if populated
UPDATE chef_certifications SET issued_at = issued_date WHERE issued_at IS NULL AND issued_date IS NOT NULL;
UPDATE chef_certifications SET expires_at = expiry_date WHERE expires_at IS NULL AND expiry_date IS NOT NULL;
