-- ============================================
-- Beta Survey System
-- ============================================
-- Timestamp: 20260330000021
-- Purpose: Pre-beta and post-beta surveys for gathering product feedback
--          and market validation from all beta participants (chefs, clients, testers).
-- Architecture: Hybrid schema — fixed columns for key metrics (NPS, satisfaction,
--              would_pay, tech_comfort) for SQL aggregation + JSONB for flexible answers.
-- Dependencies: auth.users (Supabase Auth)

-- ============================================
-- TABLE 1: beta_survey_definitions — survey templates
-- ============================================

CREATE TABLE IF NOT EXISTS beta_survey_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT,
  survey_type     TEXT NOT NULL CHECK (survey_type IN ('pre_beta', 'post_beta')),
  questions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE beta_survey_definitions IS 'Survey templates for pre-beta and post-beta feedback collection. Platform-level (no tenant scoping).';
COMMENT ON COLUMN beta_survey_definitions.slug IS 'URL-safe unique identifier, e.g. pre-beta-v1, post-beta-v1';
COMMENT ON COLUMN beta_survey_definitions.questions IS 'JSON array of question objects: [{id, type, label, options?, required, order}]. Types: single_select, multi_select, textarea, rating_scale, nps, yes_no, number';
COMMENT ON COLUMN beta_survey_definitions.is_active IS 'Only one survey per type should be active at a time. Controls banner visibility.';
CREATE INDEX idx_beta_survey_defs_type_active ON beta_survey_definitions(survey_type, is_active) WHERE is_active = true;
-- ============================================
-- TABLE 2: beta_survey_responses — all responses
-- ============================================

CREATE TABLE IF NOT EXISTS beta_survey_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id             UUID NOT NULL REFERENCES beta_survey_definitions(id) ON DELETE CASCADE,

  -- Identity — one of these identifies the respondent
  auth_user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token                 UUID UNIQUE DEFAULT gen_random_uuid(),

  -- Respondent metadata (denormalized for admin queries)
  respondent_role       TEXT CHECK (respondent_role IN ('chef', 'client', 'tester', 'staff', 'partner')),
  respondent_name       TEXT,
  respondent_email      TEXT,

  -- Fixed metric columns for fast SQL aggregation
  nps_score             SMALLINT CHECK (nps_score >= 0 AND nps_score <= 10),
  overall_satisfaction  SMALLINT CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 10),
  would_pay             BOOLEAN,
  tech_comfort          SMALLINT CHECK (tech_comfort >= 1 AND tech_comfort <= 5),

  -- Flexible answers for all other questions
  answers               JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate submissions for logged-in users
  CONSTRAINT beta_survey_one_per_user UNIQUE (survey_id, auth_user_id)
);
COMMENT ON TABLE beta_survey_responses IS 'Stores all beta survey responses. Logged-in users identified by auth_user_id, external testers by token.';
COMMENT ON COLUMN beta_survey_responses.token IS 'Public access token for viewing/editing this response. Used for external tester links.';
COMMENT ON COLUMN beta_survey_responses.answers IS 'JSONB object keyed by question ID, e.g. {"role": "chef", "pain_points": "..."}';
COMMENT ON COLUMN beta_survey_responses.submitted_at IS 'NULL means the response is in progress (started but not finished).';
CREATE INDEX idx_beta_survey_responses_survey ON beta_survey_responses(survey_id);
CREATE INDEX idx_beta_survey_responses_submitted ON beta_survey_responses(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_beta_survey_responses_role ON beta_survey_responses(respondent_role);
CREATE INDEX idx_beta_survey_responses_user ON beta_survey_responses(auth_user_id) WHERE auth_user_id IS NOT NULL;
-- ============================================
-- TABLE 3: beta_survey_invites — external tester tokens
-- ============================================

CREATE TABLE IF NOT EXISTS beta_survey_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID NOT NULL REFERENCES beta_survey_definitions(id) ON DELETE CASCADE,
  token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name            TEXT,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'tester' CHECK (role IN ('chef', 'client', 'tester')),
  claimed_at      TIMESTAMPTZ,
  response_id     UUID REFERENCES beta_survey_responses(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE beta_survey_invites IS 'Invite tokens for external testers to access beta surveys without an account.';
COMMENT ON COLUMN beta_survey_invites.token IS 'UUID token used in the public URL: /beta-survey/{token}';
COMMENT ON COLUMN beta_survey_invites.claimed_at IS 'Set when the invite link is first opened.';
COMMENT ON COLUMN beta_survey_invites.response_id IS 'Linked to the response after the invite is used to submit.';
CREATE INDEX idx_beta_survey_invites_token ON beta_survey_invites(token);
CREATE INDEX idx_beta_survey_invites_survey ON beta_survey_invites(survey_id);
-- ============================================
-- RLS — all access through admin/service role client
-- ============================================

ALTER TABLE beta_survey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_survey_invites ENABLE ROW LEVEL SECURITY;
-- ============================================
-- TRIGGERS — auto-update updated_at
-- ============================================

CREATE TRIGGER beta_survey_definitions_updated_at
  BEFORE UPDATE ON beta_survey_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- SEED DATA — initial survey definitions
-- ============================================

INSERT INTO beta_survey_definitions (slug, title, description, survey_type, questions, is_active)
VALUES
  (
    'pre-beta-v1',
    'Pre-Beta Survey',
    'Help us understand who you are and what you need. This takes about 3 minutes.',
    'pre_beta',
    '[
      {
        "id": "role",
        "type": "single_select",
        "label": "What best describes you?",
        "options": ["Private chef", "Client (I hire private chefs)", "Industry professional", "External tester"],
        "required": true,
        "order": 1
      },
      {
        "id": "current_workflow",
        "type": "multi_select",
        "label": "How do you currently manage your private chef business or bookings?",
        "options": ["Spreadsheets (Excel, Google Sheets)", "Other software (HoneyBook, 17hats, etc.)", "Pen and paper", "Email/text only", "Nothing formal", "Not applicable"],
        "required": true,
        "order": 2
      },
      {
        "id": "pain_points",
        "type": "textarea",
        "label": "What are your biggest pain points in managing events, clients, or finances?",
        "placeholder": "Tell us what frustrates you most...",
        "required": true,
        "order": 3
      },
      {
        "id": "hopes",
        "type": "textarea",
        "label": "What do you hope ChefFlow will solve for you?",
        "placeholder": "What would make your life easier?",
        "required": true,
        "order": 4
      },
      {
        "id": "tech_comfort",
        "type": "rating_scale",
        "label": "How comfortable are you with technology?",
        "min": 1,
        "max": 5,
        "min_label": "Not at all",
        "max_label": "Very comfortable",
        "required": true,
        "order": 5
      },
      {
        "id": "would_pay",
        "type": "single_select",
        "label": "Would you pay for a platform that solves these problems?",
        "options": ["Yes, definitely", "Maybe, depends on the price", "Probably not", "No"],
        "required": true,
        "order": 6
      },
      {
        "id": "heard_about",
        "type": "single_select",
        "label": "How did you hear about ChefFlow?",
        "options": ["Instagram", "Facebook", "Google search", "Word of mouth", "Chef community/forum", "Other"],
        "required": true,
        "order": 7
      }
    ]'::jsonb,
    true
  ),
  (
    'post-beta-v1',
    'Post-Beta Feedback',
    'Your feedback shapes what we build next. This takes about 5 minutes.',
    'post_beta',
    '[
      {
        "id": "nps_score",
        "type": "nps",
        "label": "How likely are you to recommend ChefFlow to a colleague?",
        "required": true,
        "order": 1
      },
      {
        "id": "overall_satisfaction",
        "type": "rating_scale",
        "label": "How satisfied are you with your overall ChefFlow experience?",
        "min": 1,
        "max": 10,
        "min_label": "Very unsatisfied",
        "max_label": "Extremely satisfied",
        "required": true,
        "order": 2
      },
      {
        "id": "features_used",
        "type": "multi_select",
        "label": "Which features did you use during the beta?",
        "options": ["Dashboard", "Event management", "Client management", "Quotes & invoicing", "Calendar/schedule", "Recipes", "Financial tracking", "Remy AI assistant", "Email/notifications", "Loyalty program", "Documents/contracts", "Prospecting/leads"],
        "required": true,
        "order": 3
      },
      {
        "id": "broken_confusing",
        "type": "textarea",
        "label": "Which features felt broken, confusing, or hard to use?",
        "placeholder": "Be honest — this helps us the most...",
        "required": false,
        "order": 4
      },
      {
        "id": "missing_features",
        "type": "textarea",
        "label": "What features or capabilities are missing that you expected?",
        "placeholder": "What did you wish ChefFlow could do?",
        "required": false,
        "order": 5
      },
      {
        "id": "would_pay",
        "type": "single_select",
        "label": "Would you pay for ChefFlow?",
        "options": ["Yes, definitely", "Yes, if the price is right", "Maybe", "No"],
        "required": true,
        "order": 6
      },
      {
        "id": "price_range",
        "type": "single_select",
        "label": "What monthly price feels fair for the features you used?",
        "options": ["Under $20/month", "$20-$40/month", "$40-$60/month", "$60-$100/month", "Over $100/month"],
        "required": true,
        "order": 7
      },
      {
        "id": "worth_paying_for",
        "type": "multi_select",
        "label": "Which features would be worth paying extra for?",
        "options": ["AI assistant (Remy)", "Advanced financial reporting", "Automated client follow-ups", "Recipe costing & grocery integration", "Loyalty program", "Contract/document generation", "Prospecting tools", "Calendar integrations", "Team/staff management"],
        "required": true,
        "order": 8
      },
      {
        "id": "would_recommend",
        "type": "rating_scale",
        "label": "How likely are you to recommend ChefFlow to another private chef?",
        "min": 1,
        "max": 10,
        "min_label": "Not at all",
        "max_label": "Absolutely",
        "required": true,
        "order": 9
      },
      {
        "id": "best_thing",
        "type": "textarea",
        "label": "What was the single best thing about ChefFlow?",
        "placeholder": "Your favorite feature or moment...",
        "required": true,
        "order": 10
      },
      {
        "id": "worst_thing",
        "type": "textarea",
        "label": "What was the single worst thing about ChefFlow?",
        "placeholder": "What nearly made you give up?",
        "required": false,
        "order": 11
      },
      {
        "id": "one_wish",
        "type": "textarea",
        "label": "If you could change one thing about ChefFlow, what would it be?",
        "placeholder": "Your one wish...",
        "required": true,
        "order": 12
      }
    ]'::jsonb,
    false
  );
-- ============================================
-- SUMMARY
-- ============================================
-- Tables created: 3 (beta_survey_definitions, beta_survey_responses, beta_survey_invites)
-- Indexes: 7
-- RLS: enabled on all 3 tables (admin client access only)
-- Triggers: 1 (updated_at on definitions)
-- Seed data: 2 survey definitions (pre-beta-v1 active, post-beta-v1 inactive);
