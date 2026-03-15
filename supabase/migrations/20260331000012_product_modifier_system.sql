-- Product Modifier System
-- Normalized modifier groups, modifiers, and product assignments
-- for restaurant-style customization (temperature, sides, add-ons)

-- ─── Modifier Groups ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_modifier_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  selection_type  TEXT NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
  required        BOOLEAN NOT NULL DEFAULT false,
  min_selections  INTEGER NOT NULL DEFAULT 0,
  max_selections  INTEGER,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modifier_groups_tenant_isolation" ON product_modifier_groups;
CREATE POLICY "modifier_groups_tenant_isolation" ON product_modifier_groups
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifier_groups_insert" ON product_modifier_groups;
CREATE POLICY "modifier_groups_insert" ON product_modifier_groups
  FOR INSERT WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifier_groups_update" ON product_modifier_groups;
CREATE POLICY "modifier_groups_update" ON product_modifier_groups
  FOR UPDATE USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifier_groups_delete" ON product_modifier_groups;
CREATE POLICY "modifier_groups_delete" ON product_modifier_groups
  FOR DELETE USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_modifier_groups_chef ON product_modifier_groups(chef_id);
-- ─── Modifiers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_modifiers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id               UUID NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
  chef_id                UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  price_adjustment_cents INTEGER NOT NULL DEFAULT 0,
  is_default             BOOLEAN NOT NULL DEFAULT false,
  available              BOOLEAN NOT NULL DEFAULT true,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modifiers_tenant_isolation" ON product_modifiers;
CREATE POLICY "modifiers_tenant_isolation" ON product_modifiers
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifiers_insert" ON product_modifiers;
CREATE POLICY "modifiers_insert" ON product_modifiers
  FOR INSERT WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifiers_update" ON product_modifiers;
CREATE POLICY "modifiers_update" ON product_modifiers
  FOR UPDATE USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifiers_delete" ON product_modifiers;
CREATE POLICY "modifiers_delete" ON product_modifiers
  FOR DELETE USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_modifiers_group ON product_modifiers(group_id);
CREATE INDEX idx_modifiers_chef ON product_modifiers(chef_id);
-- ─── Product <-> Modifier Group Assignments ────────────────────────

CREATE TABLE IF NOT EXISTS product_modifier_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES product_projections(id) ON DELETE CASCADE,
  modifier_group_id  UUID NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
  chef_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, modifier_group_id)
);
ALTER TABLE product_modifier_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "modifier_assignments_tenant_isolation" ON product_modifier_assignments;
CREATE POLICY "modifier_assignments_tenant_isolation" ON product_modifier_assignments
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifier_assignments_insert" ON product_modifier_assignments;
CREATE POLICY "modifier_assignments_insert" ON product_modifier_assignments
  FOR INSERT WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "modifier_assignments_delete" ON product_modifier_assignments;
CREATE POLICY "modifier_assignments_delete" ON product_modifier_assignments
  FOR DELETE USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_modifier_assignments_product ON product_modifier_assignments(product_id);
CREATE INDEX idx_modifier_assignments_group ON product_modifier_assignments(modifier_group_id);
CREATE INDEX idx_modifier_assignments_chef ON product_modifier_assignments(chef_id);
