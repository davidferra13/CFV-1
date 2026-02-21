-- Operations: KDS Course Tracking, Document Comments, Split Billing
-- Closes gaps identified in competitive analysis vs Toast, Google Workspace

-- ============================================
-- ALTER: Add split billing to events
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS split_billing JSONB DEFAULT NULL;

-- ============================================
-- Extend document_versions entity_type
-- ============================================

DO $$ BEGIN
  ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_entity_type_check;
  ALTER TABLE document_versions ADD CONSTRAINT document_versions_entity_type_check
    CHECK (entity_type IN ('menu', 'quote', 'recipe', 'contract', 'prep_sheet'));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================
-- TABLE 1: SERVICE COURSES (KDS)
-- ============================================

CREATE TABLE IF NOT EXISTS service_courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  course_name     TEXT NOT NULL,
  course_number   INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'fired', 'plated', 'served', 'eighty_sixed')),
  fired_at        TIMESTAMPTZ,
  served_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_courses_event ON service_courses(event_id, course_number);
CREATE INDEX idx_service_courses_chef ON service_courses(chef_id);

CREATE TRIGGER trg_service_courses_updated_at
  BEFORE UPDATE ON service_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: DOCUMENT COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL
                  CHECK (document_type IN ('menu', 'quote', 'recipe', 'contract', 'prep_sheet')),
  entity_id       UUID NOT NULL,
  author_name     TEXT NOT NULL,
  comment_text    TEXT NOT NULL,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_comments_entity ON document_comments(chef_id, document_type, entity_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE service_courses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments  ENABLE ROW LEVEL SECURITY;

-- service_courses
CREATE POLICY sc_chef_select ON service_courses FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sc_chef_insert ON service_courses FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sc_chef_update ON service_courses FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY sc_chef_delete ON service_courses FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- document_comments
CREATE POLICY dc_chef_select ON document_comments FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dc_chef_insert ON document_comments FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dc_chef_update ON document_comments FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY dc_chef_delete ON document_comments FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
