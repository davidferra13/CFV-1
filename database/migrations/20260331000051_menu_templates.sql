-- Migration: 20260331000051_menu_templates.sql
-- Seasonal Menu Template system: extends existing menu_templates table
-- Additive only

-- Season enum for templates
DO $$ BEGIN
  CREATE TYPE menu_template_season AS ENUM ('spring', 'summer', 'fall', 'winter', 'all_season');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The menu_templates table may already exist from a prior migration.
-- Create if not exists, then add any missing columns.
CREATE TABLE IF NOT EXISTS menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns that may be missing from the existing table
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS season TEXT DEFAULT 'all_season';
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS dishes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS times_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_menu_templates_tenant_id ON menu_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_templates_season ON menu_templates(season);
CREATE INDEX IF NOT EXISTS idx_menu_templates_tenant_season ON menu_templates(tenant_id, season);
CREATE INDEX IF NOT EXISTS idx_menu_templates_is_active ON menu_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_templates_tags ON menu_templates USING gin(tags);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_menu_templates_updated_at ON menu_templates;
CREATE TRIGGER update_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select_menu_templates ON menu_templates;
CREATE POLICY tenant_isolation_select_menu_templates ON menu_templates
  FOR SELECT USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS tenant_isolation_insert_menu_templates ON menu_templates;
CREATE POLICY tenant_isolation_insert_menu_templates ON menu_templates
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS tenant_isolation_update_menu_templates ON menu_templates;
CREATE POLICY tenant_isolation_update_menu_templates ON menu_templates
  FOR UPDATE USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS tenant_isolation_delete_menu_templates ON menu_templates;
CREATE POLICY tenant_isolation_delete_menu_templates ON menu_templates
  FOR DELETE USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));
