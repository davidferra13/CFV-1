-- Contingency & Emergency Planning
-- Tracks chef emergency contacts and per-event contingency scenarios
-- (illness, equipment failure, ingredient unavailability, weather, etc.)

-- ============================================
-- TABLE 1: CHEF EMERGENCY CONTACTS
-- ============================================

CREATE TABLE chef_emergency_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name         TEXT NOT NULL,
  relationship TEXT NOT NULL,   -- e.g. "Sous chef", "Business partner", "Spouse"
  phone        TEXT,
  email        TEXT,
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_chef ON chef_emergency_contacts(chef_id, sort_order);

COMMENT ON TABLE chef_emergency_contacts IS 'People to contact if the chef is incapacitated or needs backup on an event.';

CREATE TRIGGER trg_emergency_contacts_updated_at
  BEFORE UPDATE ON chef_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: EVENT CONTINGENCY NOTES
-- ============================================

CREATE TABLE event_contingency_notes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  scenario_type      TEXT NOT NULL DEFAULT 'other'
                     CHECK (scenario_type IN (
                       'chef_illness',
                       'equipment_failure',
                       'ingredient_unavailable',
                       'venue_issue',
                       'weather',
                       'other'
                     )),

  mitigation_notes   TEXT NOT NULL,   -- what the chef plans to do
  backup_contact_id  UUID REFERENCES chef_emergency_contacts(id) ON DELETE SET NULL,

  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_contingency_event ON event_contingency_notes(event_id);
CREATE INDEX idx_event_contingency_chef  ON event_contingency_notes(chef_id);

COMMENT ON TABLE event_contingency_notes IS 'Per-event contingency plans for common failure scenarios. Structured notes only — no workflow automation.';

CREATE TRIGGER trg_contingency_updated_at
  BEFORE UPDATE ON event_contingency_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_emergency_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_contingency_notes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY ec_chef_select ON chef_emergency_contacts FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ec_chef_insert ON chef_emergency_contacts FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ec_chef_update ON chef_emergency_contacts FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY ec_chef_delete ON chef_emergency_contacts FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY cn_chef_select ON event_contingency_notes FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cn_chef_insert ON event_contingency_notes FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cn_chef_update ON event_contingency_notes FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cn_chef_delete ON event_contingency_notes FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
