-- Remy onboarding stage tracker
-- Tracks each chef's progress through the curated onboarding flow.
-- One row per chef. Created on first Remy drawer open.

CREATE TABLE IF NOT EXISTS remy_onboarding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'not_started'
    CHECK (stage IN ('not_started', 'greeted', 'toured', 'first_interaction', 'onboarded')),
  tour_beat int NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_checkin_at timestamptz,
  message_count int NOT NULL DEFAULT 0,
  UNIQUE (chef_id)
);
