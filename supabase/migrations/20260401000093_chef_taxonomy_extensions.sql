-- Chef Taxonomy Extensions
-- Lets chefs add custom values to any taxonomy category (cuisines, occasions, courses, etc.)
-- and hide system defaults they don't use.

-- Custom taxonomy entries added by chefs
CREATE TABLE IF NOT EXISTS chef_taxonomy_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  display_label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, category, value)
);

-- System defaults hidden by a chef
CREATE TABLE IF NOT EXISTS chef_taxonomy_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, category, value)
);

-- Indexes
CREATE INDEX idx_taxonomy_ext_chef_cat ON chef_taxonomy_extensions(chef_id, category);
CREATE INDEX idx_taxonomy_hidden_chef_cat ON chef_taxonomy_hidden(chef_id, category);

-- RLS
ALTER TABLE chef_taxonomy_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_taxonomy_hidden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own taxonomy extensions"
  ON chef_taxonomy_extensions FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Chefs manage own taxonomy hidden"
  ON chef_taxonomy_hidden FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));
