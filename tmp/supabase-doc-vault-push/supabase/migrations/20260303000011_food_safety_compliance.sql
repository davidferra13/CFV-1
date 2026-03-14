-- Food Safety & Compliance
-- Tracks chef certifications (ServSafe, food handler cards, business licenses)
-- with expiry reminders, and event-level temperature logs for food safety auditing.

-- ============================================
-- TABLE 1: CHEF CERTIFICATIONS
-- ============================================

CREATE TABLE chef_certifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  cert_type           TEXT NOT NULL DEFAULT 'other'
                      CHECK (cert_type IN (
                        'food_handler',
                        'servsafe_manager',
                        'allergen_awareness',
                        'llc',
                        'business_license',
                        'liability_insurance',
                        'cottage_food',
                        'other'
                      )),

  name                TEXT NOT NULL,   -- descriptive name e.g. "ServSafe Manager Certification"
  issuing_body        TEXT,
  issued_date         DATE,
  expiry_date         DATE,
  reminder_days_before INTEGER NOT NULL DEFAULT 30 CHECK (reminder_days_before >= 0),
  cert_number         TEXT,
  document_url        TEXT,            -- link to scanned copy

  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'pending_renewal')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certifications_chef        ON chef_certifications(chef_id, status);
CREATE INDEX idx_certifications_expiry      ON chef_certifications(chef_id, expiry_date);
COMMENT ON TABLE chef_certifications IS 'Chef professional certifications and licenses with expiry tracking.';
COMMENT ON COLUMN chef_certifications.reminder_days_before IS 'How many days before expiry to trigger a reminder notification.';
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON chef_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: EVENT TEMPERATURE LOGS
-- ============================================

CREATE TABLE event_temp_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  item_description TEXT NOT NULL,
  temp_fahrenheit  NUMERIC(5,1) NOT NULL,
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  phase            TEXT NOT NULL DEFAULT 'hot_holding'
                   CHECK (phase IN (
                     'receiving',
                     'cold_holding',
                     'hot_holding',
                     'cooling',
                     'reheating'
                   )),

  -- Safe temperature ranges by phase (for display — not enforced by DB)
  -- receiving cold: 40°F or below
  -- cold_holding: 40°F or below
  -- hot_holding: 140°F or above
  -- cooling: must drop from 135°F to 70°F within 2 hours, 41°F within 6 hours
  -- reheating: must reach 165°F within 2 hours
  is_safe          BOOLEAN,  -- chef-assessed pass/fail at log time

  notes            TEXT
);
CREATE INDEX idx_temp_logs_event ON event_temp_logs(event_id, logged_at DESC);
CREATE INDEX idx_temp_logs_chef  ON event_temp_logs(chef_id);
COMMENT ON TABLE event_temp_logs IS 'Food temperature log per event phase. Used for food safety auditing and HACCP compliance awareness.';
COMMENT ON COLUMN event_temp_logs.is_safe IS 'Chef-assessed: was the temperature within the safe range for this phase?';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_temp_logs     ENABLE ROW LEVEL SECURITY;
CREATE POLICY cert_chef_select ON chef_certifications FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cert_chef_insert ON chef_certifications FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cert_chef_update ON chef_certifications FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cert_chef_delete ON chef_certifications FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tl_chef_select ON event_temp_logs FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tl_chef_insert ON event_temp_logs FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tl_chef_update ON event_temp_logs FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY tl_chef_delete ON event_temp_logs FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
