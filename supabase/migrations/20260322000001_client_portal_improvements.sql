-- Client Portal Improvements: Pre-event checklist, dietary protocols, client journey notes
-- Additive only — no existing data touched.

-- ─── 1. Pre-event checklist confirmation tracking on events ─────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS pre_event_checklist_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_event_checklist_confirmed_by  UUID REFERENCES auth.users(id);

-- ─── 2. Client journey note: free-text note the client can write on any event ─
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS client_journey_note TEXT;

-- ─── 3. Dietary protocol tags on client profiles ────────────────────────────
-- Stores structured protocol codes like 'glp1', 'longevity', 'low_fodmap', etc.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS dietary_protocols TEXT[] DEFAULT '{}';

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_pre_event_checklist
  ON events(pre_event_checklist_confirmed_at)
  WHERE pre_event_checklist_confirmed_at IS NOT NULL;
