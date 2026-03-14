-- =====================================================================================
-- MENU PREFERENCES & SHOWCASE
-- Reduces friction in the chef ↔ client menu workflow:
--   1. Clients can submit menu preferences (brief) before chef builds the menu
--   2. Chefs can mark menus as "showcase" (portfolio visible to clients)
--   3. Track menu usage count for popularity sorting
--   4. Richer menu snapshots for approval (full dish data, per-course feedback)
-- =====================================================================================

-- =====================================================================================
-- 1. MENU PREFERENCES TABLE (client's "menu brief" for the chef)
-- =====================================================================================

CREATE TABLE menu_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What they want
  cuisine_preferences TEXT[] DEFAULT '{}',
  service_style_pref TEXT,
  foods_love TEXT,
  foods_avoid TEXT,
  special_requests TEXT,
  adventurousness TEXT NOT NULL DEFAULT 'balanced',

  -- Which path they chose
  selection_mode TEXT NOT NULL DEFAULT 'custom_request',
  selected_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  customization_notes TEXT,

  -- Meta
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chef_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(event_id)
);
CREATE INDEX idx_menu_preferences_event ON menu_preferences(event_id);
CREATE INDEX idx_menu_preferences_tenant ON menu_preferences(tenant_id);
-- =====================================================================================
-- 2. SHOWCASE & USAGE COLUMNS ON MENUS
-- =====================================================================================

ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS times_used INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_menus_showcase ON menus(tenant_id) WHERE is_showcase = true;
-- =====================================================================================
-- 3. RLS POLICIES
-- =====================================================================================

ALTER TABLE menu_preferences ENABLE ROW LEVEL SECURITY;
-- Chefs can read preferences for events on their tenant
CREATE POLICY chef_read_menu_preferences ON menu_preferences
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());
-- Chefs can update (mark as viewed)
CREATE POLICY chef_update_menu_preferences ON menu_preferences
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id());
-- Clients can insert their own preferences
CREATE POLICY client_insert_menu_preferences ON menu_preferences
  FOR INSERT
  WITH CHECK (client_id = auth.uid());
-- Clients can read their own preferences
CREATE POLICY client_read_menu_preferences ON menu_preferences
  FOR SELECT
  USING (client_id = auth.uid());
-- Clients can update their own preferences (re-submit)
CREATE POLICY client_update_menu_preferences ON menu_preferences
  FOR UPDATE
  USING (client_id = auth.uid());
-- =====================================================================================
-- 4. CLIENT CAN VIEW SHOWCASE MENUS (read-only)
-- =====================================================================================

-- Clients need to see showcase menus for chefs they have events with.
-- This policy allows clients to SELECT showcase menus where the tenant_id
-- matches a chef they have an event with.
CREATE POLICY client_view_showcase_menus ON menus
  FOR SELECT
  USING (
    is_showcase = true
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.tenant_id = menus.tenant_id
        AND e.client_id IN (
          SELECT c.id FROM clients c
          WHERE c.auth_user_id = auth.uid()
        )
    )
  );
-- Also let clients see dishes on showcase menus
CREATE POLICY client_view_showcase_dishes ON dishes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus m
      WHERE m.id = dishes.menu_id
        AND m.is_showcase = true
        AND EXISTS (
          SELECT 1 FROM events e
          WHERE e.tenant_id = m.tenant_id
            AND e.client_id IN (
              SELECT c.id FROM clients c
              WHERE c.auth_user_id = auth.uid()
            )
        )
    )
  );
