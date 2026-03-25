-- ============================================
-- CHEF JOURNAL EXPANSION
-- ============================================
-- Adds deeper career tracking features:
-- - richer timeline entries (mistakes, proud moments, map coordinates)
-- - media gallery (photos/video/docs)
-- - recipe progression links tied to journal entries
-- ============================================

CREATE TYPE chef_journal_media_type AS ENUM (
  'photo',
  'video',
  'document'
);

ALTER TABLE chef_journey_entries
  ADD COLUMN formatted_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN mistakes_made TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN proud_moments TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN what_to_change_next_time TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

COMMENT ON COLUMN chef_journey_entries.formatted_address IS
  'Optional structured address for map rendering and historical context.';

COMMENT ON COLUMN chef_journey_entries.mistakes_made IS
  'What went wrong in this moment so chefs can learn and improve over time.';

COMMENT ON COLUMN chef_journey_entries.proud_moments IS
  'Wins worth celebrating and revisiting to reinforce growth.';

CREATE INDEX idx_chef_journey_entries_tenant_coordinates
  ON chef_journey_entries(tenant_id, entry_date DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE chef_journal_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL,
  entry_id UUID,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  media_type chef_journal_media_type NOT NULL DEFAULT 'photo',
  media_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  taken_on DATE,
  location_label TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_journal_media_url_length
    CHECK (char_length(trim(media_url)) BETWEEN 8 AND 2000),
  CONSTRAINT chef_journal_media_caption_length
    CHECK (char_length(caption) <= 1000),

  CONSTRAINT chef_journal_media_journey_fk
    FOREIGN KEY (journey_id, tenant_id)
    REFERENCES chef_journeys(id, tenant_id)
    ON DELETE CASCADE,

  CONSTRAINT chef_journal_media_entry_fk
    FOREIGN KEY (entry_id, tenant_id)
    REFERENCES chef_journey_entries(id, tenant_id)
    ON DELETE SET NULL
);

COMMENT ON TABLE chef_journal_media IS
  'Media memories for a chef journal: photos, videos, and document references.';

CREATE INDEX idx_chef_journal_media_tenant_journey
  ON chef_journal_media(tenant_id, journey_id, created_at DESC);

CREATE INDEX idx_chef_journal_media_tenant_type
  ON chef_journal_media(tenant_id, media_type, created_at DESC);

CREATE INDEX idx_chef_journal_media_tenant_coordinates
  ON chef_journal_media(tenant_id, created_at DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE chef_journal_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL,
  entry_id UUID,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  adaptation_notes TEXT NOT NULL DEFAULT '',
  outcome_notes TEXT NOT NULL DEFAULT '',
  outcome_rating SMALLINT,
  first_tested_on DATE,
  would_repeat BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_journal_recipe_links_outcome_rating
    CHECK (outcome_rating IS NULL OR outcome_rating BETWEEN 1 AND 5),

  CONSTRAINT chef_journal_recipe_links_journey_fk
    FOREIGN KEY (journey_id, tenant_id)
    REFERENCES chef_journeys(id, tenant_id)
    ON DELETE CASCADE,

  CONSTRAINT chef_journal_recipe_links_entry_fk
    FOREIGN KEY (entry_id, tenant_id)
    REFERENCES chef_journey_entries(id, tenant_id)
    ON DELETE SET NULL
);

COMMENT ON TABLE chef_journal_recipe_links IS
  'Links journal moments to concrete recipes, tests, ratings, and progression notes.';

CREATE INDEX idx_chef_journal_recipe_links_tenant_journey
  ON chef_journal_recipe_links(tenant_id, journey_id, created_at DESC);

CREATE INDEX idx_chef_journal_recipe_links_tenant_recipe
  ON chef_journal_recipe_links(tenant_id, recipe_id, updated_at DESC);

CREATE TRIGGER chef_journal_media_updated_at
  BEFORE UPDATE ON chef_journal_media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER chef_journal_recipe_links_updated_at
  BEFORE UPDATE ON chef_journal_recipe_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chef_journal_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_journal_recipe_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_journal_media_select_own ON chef_journal_media;
CREATE POLICY chef_journal_media_select_own ON chef_journal_media
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_journal_media_insert_own ON chef_journal_media;
CREATE POLICY chef_journal_media_insert_own ON chef_journal_media
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS chef_journal_media_update_own ON chef_journal_media;
CREATE POLICY chef_journal_media_update_own ON chef_journal_media
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_journal_media_delete_own ON chef_journal_media;
CREATE POLICY chef_journal_media_delete_own ON chef_journal_media
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_journal_recipe_links_select_own ON chef_journal_recipe_links;
CREATE POLICY chef_journal_recipe_links_select_own ON chef_journal_recipe_links
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_journal_recipe_links_insert_own ON chef_journal_recipe_links;
CREATE POLICY chef_journal_recipe_links_insert_own ON chef_journal_recipe_links
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS chef_journal_recipe_links_update_own ON chef_journal_recipe_links;
CREATE POLICY chef_journal_recipe_links_update_own ON chef_journal_recipe_links
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS chef_journal_recipe_links_delete_own ON chef_journal_recipe_links;
CREATE POLICY chef_journal_recipe_links_delete_own ON chef_journal_recipe_links
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
