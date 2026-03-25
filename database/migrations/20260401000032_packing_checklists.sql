-- Packing Checklists: Equipment inventory + gap-based packing lists
-- Chef tracks what they own; system compares against client kitchen to auto-generate what to bring

-- Chef's equipment inventory
CREATE TABLE IF NOT EXISTS chef_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('cookware', 'bakeware', 'knives', 'utensils', 'appliances', 'serving', 'transport', 'cleaning', 'specialty', 'other')),
  quantity int NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chef_id, name)
);

-- Packing checklists (one per event or standalone)
CREATE TABLE IF NOT EXISTS packing_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Individual items on a checklist
CREATE TABLE IF NOT EXISTS packing_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES packing_checklists(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES chef_equipment(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  category text,
  is_packed boolean NOT NULL DEFAULT false,
  is_returned boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chef_equipment_chef_id ON chef_equipment(chef_id);
CREATE INDEX IF NOT EXISTS idx_packing_checklists_chef_id ON packing_checklists(chef_id);
CREATE INDEX IF NOT EXISTS idx_packing_checklists_event_id ON packing_checklists(event_id);
CREATE INDEX IF NOT EXISTS idx_packing_checklist_items_checklist_id ON packing_checklist_items(checklist_id);

-- RLS
ALTER TABLE chef_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_checklist_items ENABLE ROW LEVEL SECURITY;

-- chef_equipment: chef can CRUD their own
DROP POLICY IF EXISTS "chef_equipment_select" ON chef_equipment;
CREATE POLICY "chef_equipment_select" ON chef_equipment FOR SELECT
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "chef_equipment_insert" ON chef_equipment;
CREATE POLICY "chef_equipment_insert" ON chef_equipment FOR INSERT
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "chef_equipment_update" ON chef_equipment;
CREATE POLICY "chef_equipment_update" ON chef_equipment FOR UPDATE
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "chef_equipment_delete" ON chef_equipment;
CREATE POLICY "chef_equipment_delete" ON chef_equipment FOR DELETE
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));

-- packing_checklists: chef can CRUD their own
DROP POLICY IF EXISTS "packing_checklists_select" ON packing_checklists;
CREATE POLICY "packing_checklists_select" ON packing_checklists FOR SELECT
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "packing_checklists_insert" ON packing_checklists;
CREATE POLICY "packing_checklists_insert" ON packing_checklists FOR INSERT
  WITH CHECK (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "packing_checklists_update" ON packing_checklists;
CREATE POLICY "packing_checklists_update" ON packing_checklists FOR UPDATE
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "packing_checklists_delete" ON packing_checklists;
CREATE POLICY "packing_checklists_delete" ON packing_checklists FOR DELETE
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));

-- packing_checklist_items: access through checklist ownership
DROP POLICY IF EXISTS "packing_checklist_items_select" ON packing_checklist_items;
CREATE POLICY "packing_checklist_items_select" ON packing_checklist_items FOR SELECT
  USING (checklist_id IN (
    SELECT id FROM packing_checklists WHERE chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid())
  ));
DROP POLICY IF EXISTS "packing_checklist_items_insert" ON packing_checklist_items;
CREATE POLICY "packing_checklist_items_insert" ON packing_checklist_items FOR INSERT
  WITH CHECK (checklist_id IN (
    SELECT id FROM packing_checklists WHERE chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid())
  ));
DROP POLICY IF EXISTS "packing_checklist_items_update" ON packing_checklist_items;
CREATE POLICY "packing_checklist_items_update" ON packing_checklist_items FOR UPDATE
  USING (checklist_id IN (
    SELECT id FROM packing_checklists WHERE chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid())
  ));
DROP POLICY IF EXISTS "packing_checklist_items_delete" ON packing_checklist_items;
CREATE POLICY "packing_checklist_items_delete" ON packing_checklist_items FOR DELETE
  USING (checklist_id IN (
    SELECT id FROM packing_checklists WHERE chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid())
  ));
