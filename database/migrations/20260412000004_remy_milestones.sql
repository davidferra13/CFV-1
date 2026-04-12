-- Remy milestone celebration tracker
-- Prevents the same milestone from being celebrated more than once.
-- Data jsonb holds dynamic values (client name, revenue amount, etc.)

CREATE TABLE IF NOT EXISTS remy_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  celebrated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb,
  UNIQUE (chef_id, milestone_key)
);
