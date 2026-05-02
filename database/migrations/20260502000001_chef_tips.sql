-- ChefTips: daily learning log for chefs
-- "What did you learn today?" - personal culinary growth journal

CREATE TABLE IF NOT EXISTS chef_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  tags TEXT[] DEFAULT '{}',
  shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_tips_chef_created ON chef_tips (chef_id, created_at DESC);
CREATE INDEX idx_chef_tips_tags ON chef_tips USING GIN (tags);

-- RLS
ALTER TABLE chef_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_tips_tenant_isolation ON chef_tips
  USING (chef_id = current_setting('app.current_tenant', true)::uuid);
