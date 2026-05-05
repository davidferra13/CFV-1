-- Course Catalog Selections: "curate and send" workflow for dish index
-- Chef picks dishes from their catalog, sends curated selection to client,
-- client picks their courses, selection converts to event menu.
-- Additive only.

-- ============================================
-- ALTER dish_index: add availability windows
-- ============================================

ALTER TABLE dish_index ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE dish_index ADD COLUMN IF NOT EXISTS available_until DATE;

COMMENT ON COLUMN dish_index.available_from IS 'Start of availability window (NULL = always available)';
COMMENT ON COLUMN dish_index.available_until IS 'End of availability window (NULL = always available)';

CREATE INDEX IF NOT EXISTS idx_dish_index_availability
  ON dish_index(tenant_id, available_from, available_until)
  WHERE archived = false AND rotation_status = 'active';

-- ============================================
-- TABLE: catalog_selections
-- A curated set of dishes sent to a client
-- ============================================

CREATE TABLE catalog_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  description TEXT,

  -- Target client/event (both optional during draft)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- The curated dish IDs (from dish_index)
  dish_ids UUID[] NOT NULL DEFAULT '{}',

  -- Sharing
  share_token TEXT UNIQUE,
  shared_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Client response
  picked_dish_ids UUID[] DEFAULT '{}',
  picked_at TIMESTAMPTZ,
  picker_name TEXT,
  picker_notes TEXT,

  -- Conversion to menu
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- State machine: draft -> shared -> picks_received -> menu_created -> expired
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shared', 'picks_received', 'menu_created', 'expired')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_catalog_selections_tenant ON catalog_selections(tenant_id);
CREATE INDEX idx_catalog_selections_client ON catalog_selections(tenant_id, client_id)
  WHERE client_id IS NOT NULL;
CREATE INDEX idx_catalog_selections_event ON catalog_selections(event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX idx_catalog_selections_token ON catalog_selections(share_token)
  WHERE share_token IS NOT NULL;
CREATE INDEX idx_catalog_selections_status ON catalog_selections(tenant_id, status);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_catalog_selections_updated_at
  BEFORE UPDATE ON catalog_selections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE catalog_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_catalog_selections_all" ON catalog_selections;
CREATE POLICY "chef_catalog_selections_all" ON catalog_selections
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
