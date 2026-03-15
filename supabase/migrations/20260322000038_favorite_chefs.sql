-- Favorite Chefs — culinary heroes, mentors, and celebrity chefs a chef admires
-- Fun profile enrichment feature. Public-readable for sharing / public profile.
-- Mirrors profile_highlights pattern.

-- ============================================
-- TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS favorite_chefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  chef_name       TEXT NOT NULL,
  reason          TEXT,
  image_url       TEXT,
  website_url     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_favorite_chefs_chef ON favorite_chefs(chef_id, sort_order);

CREATE TRIGGER trg_favorite_chefs_updated_at
  BEFORE UPDATE ON favorite_chefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE favorite_chefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fc_chef_select ON favorite_chefs;
CREATE POLICY fc_chef_select ON favorite_chefs FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS fc_public_select ON favorite_chefs;
CREATE POLICY fc_public_select ON favorite_chefs FOR SELECT
  USING (true);
DROP POLICY IF EXISTS fc_chef_insert ON favorite_chefs;
CREATE POLICY fc_chef_insert ON favorite_chefs FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS fc_chef_update ON favorite_chefs;
CREATE POLICY fc_chef_update ON favorite_chefs FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS fc_chef_delete ON favorite_chefs;
CREATE POLICY fc_chef_delete ON favorite_chefs FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
