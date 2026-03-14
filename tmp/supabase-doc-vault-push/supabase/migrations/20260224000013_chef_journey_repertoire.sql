-- ============================================
-- CHEF JOURNEY REPERTOIRE
-- ============================================
-- Long-term culinary growth tracking for chefs.
-- Captures travel journeys, detailed log entries, and idea backlogs
-- so chefs can turn experiences into repeatable craft improvements.
-- ============================================

CREATE TYPE chef_journey_status AS ENUM (
  'planning',
  'in_progress',
  'completed',
  'archived'
);
CREATE TYPE chef_journey_entry_type AS ENUM (
  'destination',
  'meal',
  'lesson',
  'experience',
  'idea',
  'reflection',
  'technique',
  'ingredient'
);
CREATE TYPE chef_journey_idea_status AS ENUM (
  'backlog',
  'testing',
  'adopted',
  'parked'
);
CREATE TYPE chef_journey_idea_area AS ENUM (
  'menu',
  'technique',
  'service',
  'sourcing',
  'team',
  'operations'
);
CREATE TABLE chef_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  destination_city TEXT,
  destination_region TEXT,
  destination_country TEXT,
  started_on DATE,
  ended_on DATE,
  status chef_journey_status NOT NULL DEFAULT 'planning',
  trip_summary TEXT NOT NULL DEFAULT '',
  favorite_meal TEXT NOT NULL DEFAULT '',
  favorite_experience TEXT NOT NULL DEFAULT '',
  key_learnings TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  inspiration_ideas TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  culinary_focus_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  collaborators TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_journeys_title_length
    CHECK (char_length(trim(title)) BETWEEN 3 AND 140),
  CONSTRAINT chef_journeys_date_range_valid
    CHECK (started_on IS NULL OR ended_on IS NULL OR ended_on >= started_on),

  CONSTRAINT chef_journeys_id_tenant_unique
    UNIQUE (id, tenant_id)
);
COMMENT ON TABLE chef_journeys IS
  'Chef-authored culinary journeys (trips, stages, research tours) used to capture growth over time.';
COMMENT ON COLUMN chef_journeys.key_learnings IS
  'Short bullet learnings from the journey; powers the chef learning repertoire.';
COMMENT ON COLUMN chef_journeys.inspiration_ideas IS
  'High-level ideas chefs want to bring back into their own practice.';
CREATE INDEX idx_chef_journeys_tenant_status_updated
  ON chef_journeys(tenant_id, status, updated_at DESC);
CREATE INDEX idx_chef_journeys_tenant_dates
  ON chef_journeys(tenant_id, started_on DESC NULLS LAST, ended_on DESC NULLS LAST);
CREATE INDEX idx_chef_journeys_focus_tags
  ON chef_journeys USING GIN(culinary_focus_tags);
CREATE TABLE chef_journey_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  entry_type chef_journey_entry_type NOT NULL DEFAULT 'reflection',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  narrative TEXT NOT NULL DEFAULT '',
  favorite_meal TEXT NOT NULL DEFAULT '',
  favorite_experience TEXT NOT NULL DEFAULT '',
  what_i_learned TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  inspiration_taken TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  dishes_to_explore TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  source_links TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_journey_entries_title_length
    CHECK (char_length(trim(title)) BETWEEN 3 AND 180),
  CONSTRAINT chef_journey_entries_id_tenant_unique
    UNIQUE (id, tenant_id),

  CONSTRAINT chef_journey_entries_journey_fk
    FOREIGN KEY (journey_id, tenant_id)
    REFERENCES chef_journeys(id, tenant_id)
    ON DELETE CASCADE
);
COMMENT ON TABLE chef_journey_entries IS
  'Detailed chronological entries inside a chef journey (meals, lessons, reflections, techniques).';
COMMENT ON COLUMN chef_journey_entries.what_i_learned IS
  'Concrete lessons extracted from the entry.';
CREATE INDEX idx_chef_journey_entries_tenant_journey_date
  ON chef_journey_entries(tenant_id, journey_id, entry_date DESC, created_at DESC);
CREATE INDEX idx_chef_journey_entries_tenant_type_created
  ON chef_journey_entries(tenant_id, entry_type, created_at DESC);
CREATE INDEX idx_chef_journey_entries_tenant_highlights
  ON chef_journey_entries(tenant_id, created_at DESC)
  WHERE is_highlight = true;
CREATE TABLE chef_journey_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source_entry_id UUID,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  concept_notes TEXT NOT NULL DEFAULT '',
  application_area chef_journey_idea_area NOT NULL DEFAULT 'menu',
  status chef_journey_idea_status NOT NULL DEFAULT 'backlog',
  priority SMALLINT NOT NULL DEFAULT 3,
  expected_impact TEXT NOT NULL DEFAULT '',
  test_plan TEXT NOT NULL DEFAULT '',
  first_test_date DATE,
  adopted_on DATE,
  adopted_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_journey_ideas_priority_range
    CHECK (priority BETWEEN 1 AND 5),
  CONSTRAINT chef_journey_ideas_title_length
    CHECK (char_length(trim(title)) BETWEEN 3 AND 180),
  CONSTRAINT chef_journey_ideas_adopted_requires_date
    CHECK (status <> 'adopted' OR adopted_on IS NOT NULL),

  CONSTRAINT chef_journey_ideas_journey_fk
    FOREIGN KEY (journey_id, tenant_id)
    REFERENCES chef_journeys(id, tenant_id)
    ON DELETE CASCADE,

  CONSTRAINT chef_journey_ideas_source_entry_fk
    FOREIGN KEY (source_entry_id, tenant_id)
    REFERENCES chef_journey_entries(id, tenant_id)
    ON DELETE SET NULL
);
COMMENT ON TABLE chef_journey_ideas IS
  'Idea pipeline derived from journey learnings, tracked from backlog to adoption.';
CREATE INDEX idx_chef_journey_ideas_tenant_status_priority
  ON chef_journey_ideas(tenant_id, status, priority ASC, updated_at DESC);
CREATE INDEX idx_chef_journey_ideas_tenant_journey_created
  ON chef_journey_ideas(tenant_id, journey_id, created_at DESC);
CREATE INDEX idx_chef_journey_ideas_tenant_area
  ON chef_journey_ideas(tenant_id, application_area, updated_at DESC);
CREATE TRIGGER chef_journeys_updated_at
  BEFORE UPDATE ON chef_journeys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chef_journey_entries_updated_at
  BEFORE UPDATE ON chef_journey_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chef_journey_ideas_updated_at
  BEFORE UPDATE ON chef_journey_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE chef_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_journey_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_journey_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY chef_journeys_select_own ON chef_journeys
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journeys_insert_own ON chef_journeys
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );
CREATE POLICY chef_journeys_update_own ON chef_journeys
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journeys_delete_own ON chef_journeys
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_entries_select_own ON chef_journey_entries
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_entries_insert_own ON chef_journey_entries
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );
CREATE POLICY chef_journey_entries_update_own ON chef_journey_entries
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_entries_delete_own ON chef_journey_entries
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_ideas_select_own ON chef_journey_ideas
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_ideas_insert_own ON chef_journey_ideas
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND created_by = auth.uid()
  );
CREATE POLICY chef_journey_ideas_update_own ON chef_journey_ideas
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY chef_journey_ideas_delete_own ON chef_journey_ideas
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
