-- Menu Context Dock: add season, client_id, and target_date to menus
-- These columns let chefs create standalone menus with full context
-- without requiring an event to be linked first.

-- Season tag (spring, summer, fall, winter, or null for unset)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS season TEXT;

-- Direct client association (independent of event linkage)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Target date for the menu (independent of event date)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS target_date DATE;

-- Index for client lookups
CREATE INDEX IF NOT EXISTS idx_menus_client_id ON menus(client_id) WHERE client_id IS NOT NULL;

-- Index for season filtering
CREATE INDEX IF NOT EXISTS idx_menus_season ON menus(tenant_id, season) WHERE season IS NOT NULL;
