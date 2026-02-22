-- ================================================================
-- Prospecting Hub
-- AI-powered outbound lead scrubbing, prospect database, call
-- scripts, and daily call queue. Admin-only feature.
-- ================================================================

-- ============================================
-- TABLE 1: PROSPECT SCRUB SESSIONS
-- Logs each AI scrubbing run with the exact free-form query.
-- ============================================

CREATE TABLE prospect_scrub_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  query            TEXT NOT NULL,  -- free-form input, e.g. "Top 100 car dealerships in Maine"
  prospect_count   INTEGER NOT NULL DEFAULT 0,
  enriched_count   INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'enriching', 'completed', 'failed')),
  error_message    TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scrub_sessions_chef ON prospect_scrub_sessions(chef_id, created_at DESC);

-- ============================================
-- TABLE 2: PROSPECTS
-- The permanent lead scrubbing database. Maximally detailed
-- dossier per prospect — identity, location, contact, gatekeeper
-- intel, intelligence, source, status, call tracking, conversion.
-- ============================================

CREATE TABLE prospects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                 UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  scrub_session_id        UUID REFERENCES prospect_scrub_sessions(id) ON DELETE SET NULL,

  -- Identity
  name                    TEXT NOT NULL,
  prospect_type           TEXT NOT NULL DEFAULT 'organization'
                          CHECK (prospect_type IN ('organization', 'individual')),
  category                TEXT NOT NULL DEFAULT 'other'
                          CHECK (category IN (
                            'yacht_club', 'country_club', 'golf_club', 'marina',
                            'luxury_hotel', 'resort_concierge', 'estate_manager',
                            'wedding_planner', 'event_coordinator', 'corporate_events',
                            'luxury_realtor', 'personal_assistant', 'concierge_service',
                            'business_owner', 'ceo_executive', 'real_estate_developer',
                            'philanthropist', 'celebrity', 'athlete', 'high_net_worth',
                            'other'
                          )),
  description             TEXT,

  -- Location
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  zip                     TEXT,
  region                  TEXT,

  -- Contact (primary)
  phone                   TEXT,
  email                   TEXT,
  website                 TEXT,

  -- Gatekeeper Intel
  contact_person          TEXT,
  contact_title           TEXT,
  contact_direct_phone    TEXT,
  contact_direct_email    TEXT,
  gatekeeper_name         TEXT,
  gatekeeper_notes        TEXT,
  best_time_to_call       TEXT,

  -- Intelligence
  social_profiles         JSONB NOT NULL DEFAULT '{}',
  annual_events_estimate  TEXT,
  membership_size         TEXT,
  avg_event_budget        TEXT,
  event_types_hosted      TEXT[],
  seasonal_notes          TEXT,
  competitors_present     TEXT,
  luxury_indicators       TEXT[],
  talking_points          TEXT,
  approach_strategy       TEXT,

  -- Source & Status
  source                  TEXT NOT NULL DEFAULT 'ai_scrub'
                          CHECK (source IN ('ai_scrub', 'web_enriched', 'manual')),
  status                  TEXT NOT NULL DEFAULT 'new'
                          CHECK (status IN (
                            'new', 'queued', 'called', 'follow_up',
                            'not_interested', 'converted', 'dead'
                          )),

  -- Call Tracking
  last_called_at          TIMESTAMPTZ,
  call_count              INTEGER NOT NULL DEFAULT 0,
  last_outcome            TEXT,
  next_follow_up_at       TIMESTAMPTZ,

  -- Conversion
  converted_to_inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  converted_at            TIMESTAMPTZ,

  -- Notes & History
  notes                   TEXT,
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  priority                TEXT NOT NULL DEFAULT 'normal'
                          CHECK (priority IN ('high', 'normal', 'low')),

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_chef_status   ON prospects(chef_id, status);
CREATE INDEX idx_prospects_chef_category ON prospects(chef_id, category);
CREATE INDEX idx_prospects_chef_region   ON prospects(chef_id, region);
CREATE INDEX idx_prospects_chef_priority ON prospects(chef_id, priority);
CREATE INDEX idx_prospects_follow_up     ON prospects(next_follow_up_at)
  WHERE status = 'follow_up';
CREATE INDEX idx_prospects_session       ON prospects(scrub_session_id);

CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: PROSPECT NOTES
-- Append-only note log. Every interaction, observation, or intel
-- update gets a timestamped entry. Never deleted, only added.
-- ============================================

CREATE TABLE prospect_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id      UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  note_type        TEXT NOT NULL DEFAULT 'general'
                   CHECK (note_type IN (
                     'call_note', 'research', 'observation', 'follow_up', 'general'
                   )),
  content          TEXT NOT NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_notes_prospect ON prospect_notes(prospect_id, created_at DESC);

-- ============================================
-- TABLE 4: PROSPECT CALL SCRIPTS
-- Reusable cold-calling scripts matched to prospect categories.
-- ============================================

CREATE TABLE prospect_call_scripts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name             TEXT NOT NULL,
  category         TEXT,  -- matches prospect categories for auto-suggest
  script_body      TEXT NOT NULL,
  is_default       BOOLEAN NOT NULL DEFAULT false,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_scripts_chef ON prospect_call_scripts(chef_id);

CREATE TRIGGER trg_call_scripts_updated_at
  BEFORE UPDATE ON prospect_call_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ALTER: SCHEDULED_CALLS
-- Add prospect_id FK and 'prospecting' call type.
-- ============================================

ALTER TABLE scheduled_calls
  ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_prospect ON scheduled_calls(prospect_id);

-- Widen the call_type CHECK to include 'prospecting'.
-- PostgreSQL ALTER CHECK requires drop+add.
ALTER TABLE scheduled_calls DROP CONSTRAINT IF EXISTS scheduled_calls_call_type_check;
ALTER TABLE scheduled_calls ADD CONSTRAINT scheduled_calls_call_type_check
  CHECK (call_type IN (
    'discovery', 'follow_up', 'proposal_walkthrough', 'pre_event_logistics',
    'vendor_supplier', 'partner', 'general', 'prospecting'
  ));

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE prospect_scrub_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_call_scripts   ENABLE ROW LEVEL SECURITY;

-- prospect_scrub_sessions
CREATE POLICY pss_chef_select ON prospect_scrub_sessions FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pss_chef_insert ON prospect_scrub_sessions FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pss_chef_update ON prospect_scrub_sessions FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- prospects
CREATE POLICY p_chef_select ON prospects FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p_chef_insert ON prospects FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p_chef_update ON prospects FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p_chef_delete ON prospects FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- prospect_notes
CREATE POLICY pn_chef_select ON prospect_notes FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pn_chef_insert ON prospect_notes FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- prospect_call_scripts
CREATE POLICY pcs_chef_select ON prospect_call_scripts FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pcs_chef_insert ON prospect_call_scripts FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pcs_chef_update ON prospect_call_scripts FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pcs_chef_delete ON prospect_call_scripts FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

COMMENT ON TABLE prospect_scrub_sessions IS 'Logs each AI lead scrubbing run with the free-form query and result counts.';
COMMENT ON TABLE prospects IS 'Permanent prospect database. Full dossier per prospect — identity, contact, gatekeeper intel, intelligence, call tracking.';
COMMENT ON TABLE prospect_notes IS 'Append-only note log for prospects. Every interaction and observation is timestamped.';
COMMENT ON TABLE prospect_call_scripts IS 'Reusable cold-calling scripts for outbound prospecting.';
