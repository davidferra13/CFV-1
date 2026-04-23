-- Post-Event Learning Loop
-- Creates canonical event outcomes plus per-dish outcome rows, and extends
-- guest feedback with structured dish-level sentiment.

CREATE TABLE IF NOT EXISTS event_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  hub_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  capture_status TEXT NOT NULL DEFAULT 'pending',
  planned_menu_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  planned_dish_count INTEGER NOT NULL DEFAULT 0,
  actual_dish_count INTEGER NOT NULL DEFAULT 0,
  matched_dish_count INTEGER NOT NULL DEFAULT 0,
  added_dish_count INTEGER NOT NULL DEFAULT 0,
  removed_dish_count INTEGER NOT NULL DEFAULT 0,
  substituted_dish_count INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  prep_accuracy TEXT,
  time_accuracy TEXT,
  execution_change_notes TEXT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  chef_notes TEXT,
  guest_response_count INTEGER NOT NULL DEFAULT 0,
  guest_avg_overall NUMERIC(4,2),
  guest_avg_food NUMERIC(4,2),
  guest_avg_experience NUMERIC(4,2),
  positive_feedback_rate NUMERIC(5,2),
  guest_feedback_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  deviation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_score NUMERIC(5,2),
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chef_capture_started_at TIMESTAMPTZ,
  chef_capture_completed_at TIMESTAMPTZ,
  guest_feedback_last_received_at TIMESTAMPTZ,
  last_learning_refresh_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_outcomes_capture_status_check CHECK (
    capture_status = ANY (ARRAY['pending', 'captured', 'learning_complete'])
  ),
  CONSTRAINT event_outcomes_prep_accuracy_check CHECK (
    prep_accuracy IS NULL OR prep_accuracy = ANY (ARRAY['under', 'on_target', 'over'])
  ),
  CONSTRAINT event_outcomes_time_accuracy_check CHECK (
    time_accuracy IS NULL OR time_accuracy = ANY (ARRAY['ahead', 'on_time', 'behind'])
  )
);

CREATE INDEX IF NOT EXISTS idx_event_outcomes_event ON event_outcomes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_outcomes_tenant ON event_outcomes(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_outcomes_success ON event_outcomes(tenant_id, success_score DESC);
CREATE INDEX IF NOT EXISTS idx_event_outcomes_capture_status
  ON event_outcomes(tenant_id, capture_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS event_outcome_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_outcome_id UUID NOT NULL REFERENCES event_outcomes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,
  dish_index_id UUID REFERENCES dish_index(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  course_name TEXT,
  planned_name TEXT NOT NULL,
  actual_name TEXT,
  outcome_status TEXT NOT NULL DEFAULT 'planned',
  was_served BOOLEAN NOT NULL DEFAULT false,
  issue_flags TEXT[] NOT NULL DEFAULT '{}'::text[],
  average_rating NUMERIC(4,2),
  guest_feedback_count INTEGER NOT NULL DEFAULT 0,
  positive_feedback_count INTEGER NOT NULL DEFAULT 0,
  negative_feedback_count INTEGER NOT NULL DEFAULT 0,
  neutral_feedback_count INTEGER NOT NULL DEFAULT 0,
  chef_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_outcome_dishes_status_check CHECK (
    outcome_status = ANY (ARRAY['planned', 'planned_served', 'substituted', 'removed', 'added'])
  )
);

CREATE INDEX IF NOT EXISTS idx_event_outcome_dishes_event ON event_outcome_dishes(event_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_event_outcome_dishes_outcome ON event_outcome_dishes(event_outcome_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_event_outcome_dishes_dish_index
  ON event_outcome_dishes(dish_index_id)
  WHERE dish_index_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_outcome_dishes_menu_dish
  ON event_outcome_dishes(menu_dish_id)
  WHERE menu_dish_id IS NOT NULL;

ALTER TABLE guest_feedback
  ADD COLUMN IF NOT EXISTS dish_feedback JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON TABLE event_outcomes IS
  'Canonical post-event learning record for a completed event. Stores structured chef capture, guest aggregates, deviations, and success score.';
COMMENT ON TABLE event_outcome_dishes IS
  'Structured planned-vs-actual per-dish event outcomes tied to event_outcomes, menu dishes, and canonical dish index rows.';
COMMENT ON COLUMN guest_feedback.dish_feedback IS
  'Structured dish-level guest feedback payload: like/dislike/neutral sentiment, optional rating, and optional notes.';
