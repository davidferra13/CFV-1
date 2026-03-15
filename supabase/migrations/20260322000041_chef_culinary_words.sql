-- Chef Culinary Words — user-added words for the Culinary Composition Board
-- Each chef can add their own words that appear on their personal board.
-- Admins can view all user-submitted words across all chefs.

CREATE TABLE IF NOT EXISTS chef_culinary_words (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  word        TEXT NOT NULL,
  tier        INTEGER NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 4),
  category    TEXT NOT NULL DEFAULT 'texture'
              CHECK (category IN (
                'texture', 'flavor', 'temperature', 'mouthfeel',
                'aroma', 'technique', 'visual', 'composition',
                'emotion', 'sauce', 'action'
              )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_culinary_words_chef ON chef_culinary_words(chef_id);

-- ROW LEVEL SECURITY
ALTER TABLE chef_culinary_words ENABLE ROW LEVEL SECURITY;

-- Chefs can read their own words
DROP POLICY IF EXISTS cw_chef_select ON chef_culinary_words;
CREATE POLICY cw_chef_select ON chef_culinary_words FOR SELECT
  USING (chef_id = get_current_tenant_id());

-- Chefs can insert their own words
DROP POLICY IF EXISTS cw_chef_insert ON chef_culinary_words;
CREATE POLICY cw_chef_insert ON chef_culinary_words FOR INSERT
  WITH CHECK (chef_id = get_current_tenant_id());

-- Chefs can delete their own words
DROP POLICY IF EXISTS cw_chef_delete ON chef_culinary_words;
CREATE POLICY cw_chef_delete ON chef_culinary_words FOR DELETE
  USING (chef_id = get_current_tenant_id());
