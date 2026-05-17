-- Menu Proposal Sets: present 2-4 menu options per event, client picks one
-- Additive only. No existing data modified.

-- 1. Create menu_proposal_sets table
CREATE TABLE IF NOT EXISTS menu_proposal_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'chosen', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE menu_proposal_sets IS 'Groups of competing menus for a single event. Client picks one.';

-- 2. Indexes for proposal sets
CREATE INDEX IF NOT EXISTS idx_proposal_sets_tenant ON menu_proposal_sets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sets_event ON menu_proposal_sets(event_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sets_status ON menu_proposal_sets(status) WHERE status IN ('draft', 'sent');

-- 3. Create menu_proposal_set_items table
CREATE TABLE IF NOT EXISTS menu_proposal_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_set_id UUID NOT NULL REFERENCES menu_proposal_sets(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL DEFAULT 0,
  label TEXT,
  is_chosen BOOLEAN NOT NULL DEFAULT false,
  client_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE menu_proposal_set_items IS 'Individual menu entries within a proposal set.';

-- 4. Indexes for proposal set items
CREATE INDEX IF NOT EXISTS idx_proposal_items_set ON menu_proposal_set_items(proposal_set_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_menu ON menu_proposal_set_items(menu_id);

-- 5. Unique: one menu per set, unique position per set
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_items_set_menu
  ON menu_proposal_set_items(proposal_set_id, menu_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_items_set_position
  ON menu_proposal_set_items(proposal_set_id, position);

-- 6. At most one chosen item per set
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_chosen_per_set
  ON menu_proposal_set_items(proposal_set_id)
  WHERE is_chosen = true;

-- 7. RLS policies for tenant isolation
ALTER TABLE menu_proposal_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_proposal_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_proposal_sets ON menu_proposal_sets
  FOR SELECT TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_insert_proposal_sets ON menu_proposal_sets
  FOR INSERT TO public
  WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_update_proposal_sets ON menu_proposal_sets
  FOR UPDATE TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_select_proposal_items ON menu_proposal_set_items
  FOR SELECT TO public
  USING (proposal_set_id IN (
    SELECT id FROM menu_proposal_sets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY tenant_isolation_insert_proposal_items ON menu_proposal_set_items
  FOR INSERT TO public
  WITH CHECK (proposal_set_id IN (
    SELECT id FROM menu_proposal_sets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY tenant_isolation_update_proposal_items ON menu_proposal_set_items
  FOR UPDATE TO public
  USING (proposal_set_id IN (
    SELECT id FROM menu_proposal_sets WHERE tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  ));
