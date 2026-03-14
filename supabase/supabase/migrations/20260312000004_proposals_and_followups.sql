-- Proposals & Follow-ups: Visual Proposals, Add-ons, View Tracking, Smart Fields, Follow-up Rules
-- Closes gaps identified in competitive analysis vs HoneyBook, Dubsado

-- ============================================
-- TABLE 1: PROPOSAL TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  cover_photo_url   TEXT,
  description       TEXT,
  default_menu_id   UUID REFERENCES menus(id) ON DELETE SET NULL,
  base_price_cents  INTEGER NOT NULL DEFAULT 0,
  included_services JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_templates_chef ON proposal_templates(chef_id);

CREATE TRIGGER trg_proposal_templates_updated_at
  BEFORE UPDATE ON proposal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: PROPOSAL ADD-ONS
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_addons (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  price_cents_per_person  INTEGER NOT NULL DEFAULT 0,
  is_default              BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_addons_chef ON proposal_addons(chef_id);

CREATE TRIGGER trg_proposal_addons_updated_at
  BEFORE UPDATE ON proposal_addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: PROPOSAL VIEWS (tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_views (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  viewer_ip             TEXT,
  viewed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_on_page_seconds  INTEGER NOT NULL DEFAULT 0,
  sections_viewed       JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_proposal_views_quote ON proposal_views(quote_id);

-- ============================================
-- TABLE 4: SMART FIELD VALUES
-- ============================================

CREATE TABLE IF NOT EXISTS smart_field_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,
  field_value TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chef_id, field_key)
);

CREATE INDEX idx_smart_field_values_chef ON smart_field_values(chef_id);

CREATE TRIGGER trg_smart_field_values_updated_at
  BEFORE UPDATE ON smart_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 5: FOLLOW-UP RULES
-- ============================================

CREATE TABLE IF NOT EXISTS followup_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  trigger_type  TEXT NOT NULL
                CHECK (trigger_type IN ('proposal_sent', 'proposal_viewed', 'booking_confirmed', 'event_completed', 'dormant')),
  delay_days    INTEGER NOT NULL DEFAULT 3,
  template_id   UUID,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_followup_rules_chef ON followup_rules(chef_id, trigger_type);

CREATE TRIGGER trg_followup_rules_updated_at
  BEFORE UPDATE ON followup_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE proposal_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_addons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_views      ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_field_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_rules      ENABLE ROW LEVEL SECURITY;

-- proposal_templates
CREATE POLICY pt_chef_select ON proposal_templates FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pt_chef_insert ON proposal_templates FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pt_chef_update ON proposal_templates FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pt_chef_delete ON proposal_templates FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- proposal_addons
CREATE POLICY pa_chef_select ON proposal_addons FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pa_chef_insert ON proposal_addons FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pa_chef_update ON proposal_addons FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pa_chef_delete ON proposal_addons FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- proposal_views (via parent join to quotes)
CREATE POLICY pv_chef_select ON proposal_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.tenant_id = get_current_tenant_id() AND get_current_user_role() = 'chef')
);
CREATE POLICY pv_chef_insert ON proposal_views FOR INSERT WITH CHECK (true);

-- smart_field_values
CREATE POLICY sfv_chef_select ON smart_field_values FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sfv_chef_insert ON smart_field_values FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sfv_chef_update ON smart_field_values FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sfv_chef_delete ON smart_field_values FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- followup_rules
CREATE POLICY fr_chef_select ON followup_rules FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY fr_chef_insert ON followup_rules FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY fr_chef_update ON followup_rules FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY fr_chef_delete ON followup_rules FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
