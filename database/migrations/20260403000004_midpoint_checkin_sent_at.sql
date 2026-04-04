-- Add midpoint_checkin_sent_at to events table for dedup tracking
-- The midpoint check-in is an automated "everything is on track" email sent
-- at the midpoint between booking confirmation and event date.

ALTER TABLE events ADD COLUMN IF NOT EXISTS midpoint_checkin_sent_at timestamptz;
