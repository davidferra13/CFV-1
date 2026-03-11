-- Migration: 20260320000007_home_office_deduction
-- Adds home office deduction method and actual expense inputs to tax_settings.
-- tax_settings already has home_office_sqft and home_total_sqft.
-- All new columns are nullable / have defaults — backward compatible.

ALTER TABLE tax_settings
  ADD COLUMN IF NOT EXISTS home_deduction_method TEXT NOT NULL DEFAULT 'simplified'
    CHECK (home_deduction_method IN ('simplified', 'actual')),
  ADD COLUMN IF NOT EXISTS annual_rent_mortgage_cents INTEGER,
  ADD COLUMN IF NOT EXISTS annual_utilities_cents INTEGER,
  ADD COLUMN IF NOT EXISTS annual_insurance_home_cents INTEGER,
  ADD COLUMN IF NOT EXISTS annual_repairs_cents INTEGER,
  ADD COLUMN IF NOT EXISTS home_office_notes TEXT;
COMMENT ON COLUMN tax_settings.home_deduction_method IS
  'simplified = $5/sqft up to 300 sqft (max $1,500/yr). actual = office% × home expenses.';
COMMENT ON COLUMN tax_settings.annual_rent_mortgage_cents IS
  'Annual rent or mortgage interest paid. Used only when home_deduction_method = actual.';
COMMENT ON COLUMN tax_settings.annual_utilities_cents IS
  'Annual utilities (gas, electric, water). Used only when home_deduction_method = actual.';
COMMENT ON COLUMN tax_settings.annual_insurance_home_cents IS
  'Annual homeowner or renter insurance. Used only when home_deduction_method = actual.';
COMMENT ON COLUMN tax_settings.annual_repairs_cents IS
  'Home repairs/maintenance. Used only when home_deduction_method = actual.';
