-- Analytics: Client Satisfaction Surveys
-- Post-event NPS + multi-dimension rating surveys sent to clients.
-- Separate from chef-entered client_reviews: these are client-reported.
-- Purely additive — no existing tables or data are modified.

CREATE TABLE IF NOT EXISTS client_satisfaction_surveys (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id              UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id             UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id            UUID        REFERENCES clients(id) ON DELETE SET NULL,

  -- Survey delivery
  token                TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  sent_at              TIMESTAMPTZ,
  responded_at         TIMESTAMPTZ,
  reminder_sent_at     TIMESTAMPTZ,

  -- NPS: 0–10 (0-6 = detractor, 7-8 = passive, 9-10 = promoter)
  nps_score            SMALLINT    CHECK (nps_score BETWEEN 0 AND 10),

  -- Multi-dimension ratings (1–5)
  overall_rating       SMALLINT    CHECK (overall_rating BETWEEN 1 AND 5),
  food_quality_rating  SMALLINT    CHECK (food_quality_rating BETWEEN 1 AND 5),
  service_rating       SMALLINT    CHECK (service_rating BETWEEN 1 AND 5),
  value_rating         SMALLINT    CHECK (value_rating BETWEEN 1 AND 5),
  presentation_rating  SMALLINT    CHECK (presentation_rating BETWEEN 1 AND 5),

  -- Open-ended feedback
  would_rebook         BOOLEAN,
  highlight_text       TEXT,       -- what they loved most
  improvement_text     TEXT,       -- what could have been better
  testimonial_text     TEXT,       -- public-use quote if consent given

  -- Display consent for testimonial
  consent_to_display   BOOLEAN     NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One survey per event (chef can resend, but only one response captured)
  CONSTRAINT css_event_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS css_chef_idx        ON client_satisfaction_surveys (chef_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS css_token_idx       ON client_satisfaction_surveys (token);
CREATE INDEX IF NOT EXISTS css_event_idx       ON client_satisfaction_surveys (event_id);
CREATE INDEX IF NOT EXISTS css_nps_idx         ON client_satisfaction_surveys (chef_id, nps_score) WHERE nps_score IS NOT NULL;

CREATE TRIGGER css_updated_at
  BEFORE UPDATE ON client_satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE client_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Chef sees their own surveys
DROP POLICY IF EXISTS "chef_css_select" ON client_satisfaction_surveys;
CREATE POLICY "chef_css_select"
  ON client_satisfaction_surveys FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_css_insert" ON client_satisfaction_surveys;
CREATE POLICY "chef_css_insert"
  ON client_satisfaction_surveys FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_css_update" ON client_satisfaction_surveys;
CREATE POLICY "chef_css_update"
  ON client_satisfaction_surveys FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- Public token-based access (used by client survey page — service role writes the response)
DROP POLICY IF EXISTS "public_css_token_select" ON client_satisfaction_surveys;
CREATE POLICY "public_css_token_select"
  ON client_satisfaction_surveys FOR SELECT
  USING (auth.role() = 'anon');

COMMENT ON TABLE client_satisfaction_surveys IS
  'Post-event satisfaction surveys sent to clients. Captures NPS, multi-dimension ratings, and open feedback. Token-authenticated so no client login required.';

COMMENT ON COLUMN client_satisfaction_surveys.token IS
  'Unique hex token for the survey link. Allows clients to respond without logging in.';

COMMENT ON COLUMN client_satisfaction_surveys.nps_score IS
  '0–10 Net Promoter Score. 0–6 = detractor, 7–8 = passive, 9–10 = promoter.';
