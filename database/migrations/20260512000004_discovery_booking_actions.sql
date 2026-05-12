-- Migration: 20260512000004_discovery_booking_actions.sql
-- Purpose: Allow booking conversion actions in the discovery learning stream.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_action_check'
  ) THEN
    ALTER TABLE discovery_interactions
      DROP CONSTRAINT discovery_interactions_action_check;
  END IF;

  ALTER TABLE discovery_interactions
    ADD CONSTRAINT discovery_interactions_action_check
    CHECK (action IN (
      'impression',
      'ignore',
      'click',
      'love',
      'hate',
      'hide',
      'save',
      'long_dwell',
      'quick_back',
      'search_submit',
      'inquiry_started',
      'inquiry_submitted',
      'book',
      'booking'
    ));
END $$;
