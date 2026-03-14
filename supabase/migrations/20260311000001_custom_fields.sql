-- Migration: 20260311000001_custom_fields
-- Feature 7.1: Custom Field Builder
-- Creates an EAV (Entity-Attribute-Value) system so chefs can add custom
-- metadata fields to events, clients, and recipes.
--
-- Tables:
--   custom_field_definitions  — one row per field a chef defines
--   custom_field_values       — one row per field value per entity instance

-- ─── ENUMs ───────────────────────────────────────────────────────────────────

CREATE TYPE custom_field_entity_type AS ENUM ('event', 'client', 'recipe');
CREATE TYPE custom_field_type AS ENUM (
  'text',
  'number',
  'date',
  'select',
  'multi_select',
  'toggle'
);

-- ─── custom_field_definitions ────────────────────────────────────────────────

CREATE TABLE custom_field_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  entity_type     custom_field_entity_type NOT NULL,
  field_name      TEXT NOT NULL,
  field_type      custom_field_type NOT NULL DEFAULT 'text',
  -- For select / multi_select: store choices as a JSON array of strings e.g. ["Option A","Option B"]
  options         JSONB,
  is_required     BOOLEAN NOT NULL DEFAULT false,
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Standard tenant-isolation policy: chef can only see/modify their own definitions
CREATE POLICY "tenant_isolation" ON custom_field_definitions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

CREATE INDEX idx_custom_field_definitions_tenant_entity
  ON custom_field_definitions (tenant_id, entity_type);

-- ─── custom_field_values ─────────────────────────────────────────────────────

CREATE TABLE custom_field_values (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  -- The UUID of the entity this value belongs to (event.id / client.id / recipe.id)
  entity_id             UUID NOT NULL,
  field_definition_id   UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  -- Only one of these value columns will be populated per row, matching field_type
  value_text            TEXT,
  value_number          NUMERIC,
  value_date            DATE,
  value_boolean         BOOLEAN,
  -- Used for multi_select (array of strings) and any future complex types
  value_json            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, field_definition_id)
);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON custom_field_values
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );

CREATE INDEX idx_custom_field_values_entity
  ON custom_field_values (entity_id);

CREATE INDEX idx_custom_field_values_tenant_entity
  ON custom_field_values (tenant_id, entity_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_field_values_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_field_values_updated_at
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_custom_field_values_updated_at();
