-- Drop the 1-year event date constraint
-- Chefs need to import historical events from years ago during onboarding.
-- The constraint was preventing any event older than 1 year from being entered.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_date_not_too_old;
