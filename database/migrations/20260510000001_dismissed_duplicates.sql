-- Dismissed Duplicates Table
-- Stores pairs of entities that the chef has confirmed are NOT duplicates.
-- Prevents them from reappearing in the duplicate detection results.

CREATE TABLE IF NOT EXISTS dismissed_duplicates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'ingredient', 'recipe')),
  entity_id_1 uuid NOT NULL,
  entity_id_2 uuid NOT NULL,
  dismissed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, entity_type, entity_id_1, entity_id_2)
);

CREATE INDEX idx_dismissed_duplicates_tenant_type
  ON dismissed_duplicates (tenant_id, entity_type);

-- Enable RLS
ALTER TABLE dismissed_duplicates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "tenant_isolation_select_dismissed_duplicates"
  ON dismissed_duplicates FOR SELECT TO public
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_insert_dismissed_duplicates"
  ON dismissed_duplicates FOR INSERT TO public
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_delete_dismissed_duplicates"
  ON dismissed_duplicates FOR DELETE TO public
  USING (tenant_id = get_current_tenant_id());
