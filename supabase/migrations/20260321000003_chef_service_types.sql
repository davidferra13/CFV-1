-- Migration: 20260321000003_chef_service_types
-- Adds chef_service_types table so chefs can define their named service offerings
-- (e.g. "Couples Tasting Menu", "Family Style Buffet", "Per-Person Dinner").
--
-- Used by the Revenue Path Calculator to decompose a monthly revenue gap into
-- a concrete mix of specific service slots, with per-slot client suggestions.
--
-- pricing_model is TEXT + CHECK (not the existing pricing_model DB enum) to avoid
-- colliding with the enum which lacks 'hybrid'. The three models are:
--   flat_rate  → effectivePrice = base_price_cents
--   per_person → effectivePrice = per_person_cents × typical_guest_count
--   hybrid     → effectivePrice = base_price_cents + (per_person_cents × typical_guest_count)

CREATE TABLE chef_service_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name                 TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description          TEXT,

  -- Pricing model stored as TEXT to avoid modifying the existing pricing_model enum
  pricing_model        TEXT NOT NULL DEFAULT 'flat_rate'
                         CHECK (pricing_model IN ('flat_rate', 'per_person', 'hybrid')),

  base_price_cents     INTEGER NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  per_person_cents     INTEGER NOT NULL DEFAULT 0 CHECK (per_person_cents >= 0),
  typical_guest_count  INTEGER NOT NULL DEFAULT 2 CHECK (typical_guest_count > 0),
  min_guests           INTEGER CHECK (min_guests IS NULL OR min_guests > 0),
  max_guests           INTEGER CHECK (max_guests IS NULL OR max_guests >= COALESCE(min_guests, 1)),

  is_active            BOOLEAN NOT NULL DEFAULT true,
  sort_order           INTEGER NOT NULL DEFAULT 0,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chef_service_types_tenant
  ON chef_service_types(tenant_id, is_active, sort_order);
CREATE TRIGGER trg_chef_service_types_updated_at
  BEFORE UPDATE ON chef_service_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE chef_service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY cst_select ON chef_service_types FOR SELECT
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
CREATE POLICY cst_insert ON chef_service_types FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
CREATE POLICY cst_update ON chef_service_types FOR UPDATE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
CREATE POLICY cst_delete ON chef_service_types FOR DELETE
  USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
