-- Add SMS channel support to cadence_schedule
-- Allows both email and SMS cadence items per event per cadence point.

-- Add channel column (existing rows are email)
ALTER TABLE cadence_schedule
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

-- Drop old unique constraint (event_id, cadence_point) and replace with
-- (event_id, cadence_point, channel) to allow both channels per point
ALTER TABLE cadence_schedule
  DROP CONSTRAINT IF EXISTS cadence_schedule_event_id_cadence_point_key;

ALTER TABLE cadence_schedule
  ADD CONSTRAINT cadence_schedule_event_point_channel_key
    UNIQUE (event_id, cadence_point, channel);
