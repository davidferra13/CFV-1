-- Community template sharing between chefs
CREATE TABLE IF NOT EXISTS community_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('menu', 'recipe', 'message', 'quote')),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cuisine_type TEXT,
  occasion_type TEXT,
  dietary_tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_templates_type ON community_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_community_templates_published ON community_templates(is_published);

ALTER TABLE community_templates ENABLE ROW LEVEL SECURITY;

-- Published templates are visible to all authenticated chefs
CREATE POLICY "Published templates visible to all chefs" ON community_templates
  FOR SELECT USING (
    is_published = true OR author_tenant_id = (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
    )
  );

CREATE POLICY "Chef manages own templates" ON community_templates
  FOR ALL USING (author_tenant_id = (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
