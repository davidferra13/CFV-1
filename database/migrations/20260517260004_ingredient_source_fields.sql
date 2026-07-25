ALTER TABLE grocery_spend_entries ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE grocery_spend_entries ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE grocery_spend_entries ADD COLUMN IF NOT EXISTS source_notes TEXT;
