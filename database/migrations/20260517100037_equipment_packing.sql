-- Equipment Packing List Auto-Generation
-- ADDITIVE ONLY: 3 new tables, no modifications to existing tables

-- Chef's equipment registry (portable inventory for packing lists)
CREATE TABLE IF NOT EXISTS chef_equipment_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'misc',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  notes TEXT,
  portable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_equipment_registry_tenant
  ON chef_equipment_registry USING btree (tenant_id);
CREATE INDEX idx_chef_equipment_registry_category
  ON chef_equipment_registry USING btree (tenant_id, category);

-- Event packing lists (one per event, auto-generated from menu + venue + guest count)
CREATE TABLE IF NOT EXISTS event_packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  UNIQUE (event_id)
);

CREATE INDEX idx_event_packing_lists_tenant
  ON event_packing_lists USING btree (tenant_id);
CREATE INDEX idx_event_packing_lists_event
  ON event_packing_lists USING btree (event_id);

-- Individual packing items within a list
CREATE TABLE IF NOT EXISTS event_packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id UUID NOT NULL REFERENCES event_packing_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'misc',
  quantity INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'custom',
  section TEXT NOT NULL DEFAULT 'must_bring',
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_event_packing_items_list
  ON event_packing_items USING btree (packing_list_id);
CREATE INDEX idx_event_packing_items_section
  ON event_packing_items USING btree (packing_list_id, section);

-- RLS policies
ALTER TABLE chef_equipment_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_equipment_registry_tenant_isolation
  ON chef_equipment_registry FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_packing_lists_tenant_isolation
  ON event_packing_lists FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_packing_items_list_access
  ON event_packing_items FOR ALL TO public
  USING (
    packing_list_id IN (
      SELECT id FROM event_packing_lists
      WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    packing_list_id IN (
      SELECT id FROM event_packing_lists
      WHERE tenant_id = get_current_tenant_id()
    )
  );
