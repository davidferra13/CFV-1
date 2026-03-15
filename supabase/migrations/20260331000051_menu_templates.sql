-- Migration: 20260331000051_menu_templates.sql
-- Seasonal Menu Template system: 4 seasons x 4 weekly rotations = 16 unique menus/year
-- Additive only, no existing tables modified

-- Season enum for templates
DO $$ BEGIN
  CREATE TYPE menu_template_season AS ENUM ('spring', 'summer', 'fall', 'winter', 'all_season');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Template details
  name TEXT NOT NULL,
  season menu_template_season NOT NULL DEFAULT 'all_season',
  week_number INTEGER CHECK (week_number IS NULL OR (week_number >= 1 AND week_number <= 4)),
  description TEXT,

  -- Structured dish data (denormalized for template portability)
  -- Array of { courseName: string, courseNumber: number, components: [{ name: string, recipeId?: string }] }
  dishes JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Filtering and organization
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Usage tracking
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Active/archived toggle
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_menu_templates_tenant_id ON menu_templates(tenant_id);
CREATE INDEX idx_menu_templates_season ON menu_templates(season);
CREATE INDEX idx_menu_templates_tenant_season ON menu_templates(tenant_id, season);
CREATE INDEX idx_menu_templates_is_active ON menu_templates(is_active);
CREATE INDEX idx_menu_templates_tags ON menu_templates USING gin(tags);

-- updated_at trigger
CREATE TRIGGER update_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_menu_templates ON menu_templates
  FOR SELECT USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_insert_menu_templates ON menu_templates
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_update_menu_templates ON menu_templates
  FOR UPDATE USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_isolation_delete_menu_templates ON menu_templates
  FOR DELETE USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));
