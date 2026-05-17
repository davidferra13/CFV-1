-- Menu Variant Accommodations
-- Adds tables for dish-level dietary variants and guest-to-variant assignments.
-- ADDITIVE ONLY. No DROP statements.

-- 1. Menu-level variant (e.g. "Vegan Track" for a menu)
CREATE TABLE IF NOT EXISTS menu_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id       uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name          text NOT NULL,                        -- e.g. "Vegan Variant"
  reason        text,                                 -- e.g. "vegan", "gluten-free"
  swap_description text,                              -- human summary of what changes
  price_adjustment_cents integer DEFAULT 0 NOT NULL,  -- per-plate delta vs standard
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_variants_menu ON menu_variants(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_variants_tenant ON menu_variants(tenant_id);

-- 2. Per-dish swap within a variant (original dish -> substitute dish)
CREATE TABLE IF NOT EXISTS menu_variant_dishes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id        uuid NOT NULL REFERENCES menu_variants(id) ON DELETE CASCADE,
  original_dish_id  uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  substitute_dish_id uuid REFERENCES dishes(id) ON DELETE SET NULL,
  notes             text,                             -- e.g. "use cashew ricotta"
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_variant_dishes_variant ON menu_variant_dishes(variant_id);
CREATE INDEX IF NOT EXISTS idx_menu_variant_dishes_original ON menu_variant_dishes(original_dish_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_variant_dish_pair ON menu_variant_dishes(variant_id, original_dish_id);

-- 3. Guest-to-variant assignment
CREATE TABLE IF NOT EXISTS guest_variant_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    uuid NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  variant_id  uuid NOT NULL REFERENCES menu_variants(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES chefs(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_variant_guest ON guest_variant_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_variant_variant ON guest_variant_assignments(variant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_variant ON guest_variant_assignments(guest_id, variant_id);
