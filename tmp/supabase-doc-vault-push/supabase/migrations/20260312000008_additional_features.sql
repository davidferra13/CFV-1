-- Additional Features: Daily Briefings, Dietary Conflict Detection, Client Preference Learning
-- 15 additional improvements from competitive analysis

-- ============================================
-- TABLE 1: CHEF DAILY BRIEFINGS
-- ============================================

CREATE TABLE IF NOT EXISTS chef_daily_briefings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  briefing_date   DATE NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, briefing_date)
);
CREATE INDEX idx_chef_briefings_date ON chef_daily_briefings(chef_id, briefing_date DESC);
-- ============================================
-- TABLE 2: DIETARY CONFLICT ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS dietary_conflict_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  guest_name        TEXT NOT NULL,
  allergy           TEXT NOT NULL,
  conflicting_dish  TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'warning'
                    CHECK (severity IN ('critical', 'warning', 'info')),
  acknowledged      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dietary_conflicts_event ON dietary_conflict_alerts(event_id, chef_id);
-- ============================================
-- TABLE 3: CLIENT PREFERENCE PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS client_preference_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pattern_type    TEXT NOT NULL,
  pattern_value   TEXT NOT NULL,
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  occurrences     INTEGER NOT NULL DEFAULT 1,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, client_id, pattern_type, pattern_value)
);
CREATE INDEX idx_client_patterns_chef ON client_preference_patterns(chef_id, client_id);
CREATE TRIGGER trg_client_patterns_updated_at
  BEFORE UPDATE ON client_preference_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_daily_briefings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_conflict_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_preference_patterns ENABLE ROW LEVEL SECURITY;
-- chef_daily_briefings
CREATE POLICY cdb_chef_select ON chef_daily_briefings FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cdb_chef_insert ON chef_daily_briefings FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cdb_chef_update ON chef_daily_briefings FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cdb_chef_delete ON chef_daily_briefings FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- dietary_conflict_alerts
CREATE POLICY dca_chef_select ON dietary_conflict_alerts FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dca_chef_insert ON dietary_conflict_alerts FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dca_chef_update ON dietary_conflict_alerts FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dca_chef_delete ON dietary_conflict_alerts FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- client_preference_patterns
CREATE POLICY cpp_chef_select ON client_preference_patterns FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cpp_chef_insert ON client_preference_patterns FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cpp_chef_update ON client_preference_patterns FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cpp_chef_delete ON client_preference_patterns FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
