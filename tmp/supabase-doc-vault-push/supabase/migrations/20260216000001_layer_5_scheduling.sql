-- ============================================
-- ChefFlow V1 - Layer 5: Scheduling Engine & Chef Preferences
-- Adds chef configuration for default operating procedures,
-- travel time per event, and the scheduling foundation.
-- ============================================

-- ============================================
-- 1. CHEF PREFERENCES TABLE (1:1 with chefs)
-- Stores scheduling defaults, home address, store locations,
-- and DOP configuration. Set once, used for every event.
-- ============================================

CREATE TABLE chef_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Home base
  home_address TEXT,
  home_city TEXT,
  home_state TEXT DEFAULT 'MA',
  home_zip TEXT,

  -- Default stores
  default_grocery_store TEXT,
  default_grocery_address TEXT,
  default_liquor_store TEXT,
  default_liquor_address TEXT,
  default_specialty_stores JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- specialty_stores shape: [{ name, address, notes }]

  -- Timing defaults (in minutes unless noted)
  default_buffer_minutes INTEGER DEFAULT 30 NOT NULL,
  default_prep_hours NUMERIC(4,1) DEFAULT 3.0 NOT NULL,
  default_shopping_minutes INTEGER DEFAULT 60 NOT NULL,
  default_packing_minutes INTEGER DEFAULT 30 NOT NULL,

  -- Financial
  target_margin_percent NUMERIC(5,2) DEFAULT 60.00 NOT NULL,

  -- DOP preferences
  shop_day_before BOOLEAN DEFAULT true NOT NULL,
  wake_time_earliest TEXT DEFAULT '08:00' NOT NULL,
  wake_time_latest TEXT DEFAULT '10:00' NOT NULL,

  -- Constraints
  CONSTRAINT prefs_buffer_positive CHECK (default_buffer_minutes >= 0 AND default_buffer_minutes <= 120),
  CONSTRAINT prefs_prep_positive CHECK (default_prep_hours >= 0.5 AND default_prep_hours <= 12),
  CONSTRAINT prefs_shopping_positive CHECK (default_shopping_minutes >= 15 AND default_shopping_minutes <= 240),
  CONSTRAINT prefs_packing_positive CHECK (default_packing_minutes >= 10 AND default_packing_minutes <= 120),
  CONSTRAINT prefs_margin_range CHECK (target_margin_percent >= 0 AND target_margin_percent <= 100)
);
CREATE INDEX idx_chef_preferences_chef_id ON chef_preferences(chef_id);
CREATE INDEX idx_chef_preferences_tenant_id ON chef_preferences(tenant_id);
-- ============================================
-- 2. ADD travel_time_minutes TO EVENTS
-- Per-event override for travel time estimation.
-- ============================================

ALTER TABLE events ADD COLUMN travel_time_minutes INTEGER DEFAULT 30;
-- ============================================
-- 3. RLS POLICIES FOR chef_preferences
-- ============================================

ALTER TABLE chef_preferences ENABLE ROW LEVEL SECURITY;
-- Chefs can read/write their own preferences
CREATE POLICY "chef_preferences_select_own" ON chef_preferences
  FOR SELECT USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND role = 'chef'
      LIMIT 1
    )
  );
CREATE POLICY "chef_preferences_insert_own" ON chef_preferences
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND role = 'chef'
      LIMIT 1
    )
  );
CREATE POLICY "chef_preferences_update_own" ON chef_preferences
  FOR UPDATE USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND role = 'chef'
      LIMIT 1
    )
  );
-- ============================================
-- 4. AUTO-UPDATE TRIGGER
-- ============================================

CREATE TRIGGER set_chef_preferences_updated_at
  BEFORE UPDATE ON chef_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
