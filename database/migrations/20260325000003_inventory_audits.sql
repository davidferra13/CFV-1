-- Migration: Inventory Audits
-- Structured physical count workflow with variance tracking and adjustment posting.

-- ============================================
-- ENUM: Audit types
-- ============================================
DO $$ BEGIN
  CREATE TYPE inventory_audit_type AS ENUM (
    'full',        -- Count everything
    'cycle',       -- Rotating subset of items
    'spot',        -- Random check of specific items
    'pre_event',   -- Before an event, verify stock for prep
    'post_event'   -- After an event, count what came back
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_audit_status AS ENUM (
    'draft',
    'in_progress',
    'pending_review',
    'finalized'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLE: inventory_audits
-- ============================================
CREATE TABLE inventory_audits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  audit_type            inventory_audit_type NOT NULL DEFAULT 'full',
  status                inventory_audit_status NOT NULL DEFAULT 'draft',

  event_id              UUID REFERENCES events(id) ON DELETE SET NULL,
  location_id           UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  audit_date            DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Summary (computed on finalization)
  total_items_counted   INTEGER,
  items_with_variance   INTEGER,
  total_variance_cents  INTEGER,

  photo_url             TEXT,
  notes                 TEXT,
  started_at            TIMESTAMPTZ,
  finalized_at          TIMESTAMPTZ,
  finalized_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audits_chef_status ON inventory_audits(chef_id, status);
CREATE INDEX idx_audits_event ON inventory_audits(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_audits_chef_date ON inventory_audits(chef_id, audit_date DESC);

CREATE TRIGGER trg_audits_updated_at
  BEFORE UPDATE ON inventory_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: inventory_audit_items
-- ============================================
CREATE TABLE inventory_audit_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  ingredient_id     UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_name   TEXT NOT NULL,
  unit              TEXT NOT NULL,

  -- Expected vs actual
  expected_qty      NUMERIC(10,3),
  actual_qty        NUMERIC(10,3),
  variance_qty      NUMERIC(10,3),

  -- Cost impact
  unit_cost_cents   INTEGER,
  variance_cost_cents INTEGER,

  location_id       UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  photo_url         TEXT,
  notes             TEXT,
  counted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_items_audit ON inventory_audit_items(audit_id);
CREATE INDEX idx_audit_items_ingredient ON inventory_audit_items(ingredient_id) WHERE ingredient_id IS NOT NULL;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_items ENABLE ROW LEVEL SECURITY;

-- inventory_audits: chef-only CRUD
DROP POLICY IF EXISTS ia_chef_select ON inventory_audits;
CREATE POLICY ia_chef_select ON inventory_audits FOR SELECT
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
DROP POLICY IF EXISTS ia_chef_insert ON inventory_audits;
CREATE POLICY ia_chef_insert ON inventory_audits FOR INSERT
  WITH CHECK (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
DROP POLICY IF EXISTS ia_chef_update ON inventory_audits;
CREATE POLICY ia_chef_update ON inventory_audits FOR UPDATE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));
DROP POLICY IF EXISTS ia_chef_delete ON inventory_audits;
CREATE POLICY ia_chef_delete ON inventory_audits FOR DELETE
  USING (chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid));

-- inventory_audit_items: via parent audit join
DROP POLICY IF EXISTS iai_chef_select ON inventory_audit_items;
CREATE POLICY iai_chef_select ON inventory_audit_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inventory_audits ia
    WHERE ia.id = audit_id
    AND ia.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
DROP POLICY IF EXISTS iai_chef_insert ON inventory_audit_items;
CREATE POLICY iai_chef_insert ON inventory_audit_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM inventory_audits ia
    WHERE ia.id = audit_id
    AND ia.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
DROP POLICY IF EXISTS iai_chef_update ON inventory_audit_items;
CREATE POLICY iai_chef_update ON inventory_audit_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM inventory_audits ia
    WHERE ia.id = audit_id
    AND ia.chef_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  ));
