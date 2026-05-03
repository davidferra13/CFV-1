-- Add settlement tracking to event_collaborators
-- Tracks when the primary host pays out co-host revenue splits.

ALTER TABLE event_collaborators
  ADD COLUMN IF NOT EXISTS revenue_settled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revenue_settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenue_settled_method TEXT,
  ADD COLUMN IF NOT EXISTS revenue_settled_notes TEXT;
