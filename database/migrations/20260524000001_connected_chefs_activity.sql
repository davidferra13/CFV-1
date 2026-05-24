-- Connected Chefs Activity: materialized activity snapshots
-- Lets chefs share aggregate booking signals with connections (opt-in)

CREATE TABLE chef_activity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  upcoming_event_count INT NOT NULL DEFAULT 0,
  current_week_count INT NOT NULL DEFAULT 0,
  current_month_count INT NOT NULL DEFAULT 0,
  last_event_date DATE,
  busiest_day TEXT,
  streak_weeks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chef_activity_snapshot UNIQUE (chef_id)
);

CREATE INDEX idx_chef_activity_snapshots_chef ON chef_activity_snapshots(chef_id);
CREATE INDEX idx_chef_activity_snapshots_upcoming ON chef_activity_snapshots(upcoming_event_count)
  WHERE upcoming_event_count > 0;

ALTER TABLE chef_preferences
  ADD COLUMN share_activity_with_connections BOOLEAN NOT NULL DEFAULT false;
