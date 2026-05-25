-- Add external contact/portal fields for exit-link system
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS bank_url text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS accountant_email text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS lawyer_phone text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS lawyer_email text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS insurance_portal_url text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS website_admin_url text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS commissary_url text;
