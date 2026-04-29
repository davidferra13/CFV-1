-- Culinary Radar core intelligence layer.
-- Additive only: creates global source/item tables and chef-scoped preferences/matches.

CREATE TABLE IF NOT EXISTS culinary_radar_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  homepage_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'page', 'manual')),
  credibility_tier TEXT NOT NULL CHECK (
    credibility_tier IN ('official', 'mission_partner', 'academic', 'industry', 'local', 'experimental')
  ),
  default_category TEXT NOT NULL CHECK (
    default_category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')
  ),
  default_cadence_minutes INTEGER NOT NULL DEFAULT 1440,
  active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS culinary_radar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES culinary_radar_sources(id) ON DELETE RESTRICT,
  external_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_excerpt TEXT,
  source_published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL CHECK (
    category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')
  ),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  credibility_tier TEXT NOT NULL CHECK (
    credibility_tier IN ('official', 'mission_partner', 'academic', 'industry', 'local', 'experimental')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'stale', 'retracted')),
  affected_entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS chef_radar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')
  ),
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  min_alert_severity TEXT NOT NULL DEFAULT 'high' CHECK (
    min_alert_severity IN ('critical', 'high', 'medium', 'low', 'info')
  ),
  digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (
    digest_frequency IN ('immediate', 'daily', 'weekly', 'never')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, category)
);

CREATE TABLE IF NOT EXISTS chef_radar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES culinary_radar_items(id) ON DELETE CASCADE,
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_state TEXT NOT NULL DEFAULT 'unread' CHECK (
    delivery_state IN ('unread', 'read', 'dismissed', 'snoozed', 'archived')
  ),
  useful_feedback BOOLEAN,
  dismissed_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_culinary_radar_sources_active
  ON culinary_radar_sources(active, default_category);

CREATE INDEX IF NOT EXISTS idx_culinary_radar_items_category_seen
  ON culinary_radar_items(category, first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_culinary_radar_items_severity
  ON culinary_radar_items(severity, status);

CREATE INDEX IF NOT EXISTS idx_chef_radar_preferences_chef
  ON chef_radar_preferences(chef_id);

CREATE INDEX IF NOT EXISTS idx_chef_radar_matches_chef_state
  ON chef_radar_matches(chef_id, delivery_state, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_radar_matches_item
  ON chef_radar_matches(item_id);

ALTER TABLE chef_radar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_radar_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_radar_preferences_select ON chef_radar_preferences;
CREATE POLICY chef_radar_preferences_select
  ON chef_radar_preferences
  FOR SELECT USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_radar_preferences_insert ON chef_radar_preferences;
CREATE POLICY chef_radar_preferences_insert
  ON chef_radar_preferences
  FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_radar_preferences_update ON chef_radar_preferences;
CREATE POLICY chef_radar_preferences_update
  ON chef_radar_preferences
  FOR UPDATE USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_radar_matches_select ON chef_radar_matches;
CREATE POLICY chef_radar_matches_select
  ON chef_radar_matches
  FOR SELECT USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_radar_matches_update ON chef_radar_matches;
CREATE POLICY chef_radar_matches_update
  ON chef_radar_matches
  FOR UPDATE USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_culinary_radar_sources_updated_at'
    ) THEN
      CREATE TRIGGER set_culinary_radar_sources_updated_at
        BEFORE UPDATE ON culinary_radar_sources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_culinary_radar_items_updated_at'
    ) THEN
      CREATE TRIGGER set_culinary_radar_items_updated_at
        BEFORE UPDATE ON culinary_radar_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_chef_radar_preferences_updated_at'
    ) THEN
      CREATE TRIGGER set_chef_radar_preferences_updated_at
        BEFORE UPDATE ON chef_radar_preferences
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_chef_radar_matches_updated_at'
    ) THEN
      CREATE TRIGGER set_chef_radar_matches_updated_at
        BEFORE UPDATE ON chef_radar_matches
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
  END IF;
END $$;

INSERT INTO culinary_radar_sources (
  key,
  name,
  homepage_url,
  source_type,
  credibility_tier,
  default_category,
  default_cadence_minutes
)
VALUES
  ('fda_recalls', 'FDA Recalls and Outbreaks', 'https://www.fda.gov/food/recalls-outbreaks-emergencies', 'page', 'official', 'safety', 360),
  ('fsis_recalls', 'USDA FSIS Recalls and Public Health Alerts', 'https://www.fsis.usda.gov/recalls', 'api', 'official', 'safety', 360),
  ('cdc_foodborne_outbreaks', 'CDC Foodborne Outbreak Notices', 'https://www.cdc.gov/foodborne-outbreaks/outbreaks/index.html', 'page', 'official', 'safety', 360),
  ('wck_opportunities', 'World Central Kitchen Opportunities', 'https://wck.org', 'page', 'mission_partner', 'opportunity', 1440),
  ('worldchefs_sustainability', 'Worldchefs Sustainability Education', 'https://feedtheplanet.worldchefs.org', 'page', 'mission_partner', 'sustainability', 1440),
  ('ift_food_science', 'IFT Food Science and Policy Signals', 'https://www.ift.org', 'page', 'industry', 'craft', 1440)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  homepage_url = EXCLUDED.homepage_url,
  source_type = EXCLUDED.source_type,
  credibility_tier = EXCLUDED.credibility_tier,
  default_category = EXCLUDED.default_category,
  default_cadence_minutes = EXCLUDED.default_cadence_minutes,
  updated_at = now();
