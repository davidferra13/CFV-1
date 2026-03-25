-- Daily Ops Improvements: Shift Handoff Notes + Prep Timeline
-- Phase 2: shift_handoff_notes table for free-form shift communication
-- Phase 5: prep_timeline table for multi-day prep tracking

-- ============================================
-- SHIFT HANDOFF NOTES (Phase 2)
-- ============================================

CREATE TABLE IF NOT EXISTS shift_handoff_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  author_id   UUID, -- staff_member or chef entity id
  author_name TEXT NOT NULL DEFAULT 'Chef',
  shift       TEXT NOT NULL CHECK (shift IN ('opening', 'mid', 'closing')),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  content     TEXT NOT NULL,
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_handoff_notes_chef_date ON shift_handoff_notes(chef_id, date DESC);
CREATE INDEX idx_handoff_notes_pinned ON shift_handoff_notes(chef_id, pinned) WHERE pinned = true;

ALTER TABLE shift_handoff_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for shift_handoff_notes" ON shift_handoff_notes;
CREATE POLICY "Tenant isolation for shift_handoff_notes"
  ON shift_handoff_notes
  FOR ALL
  USING (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

-- ============================================
-- PREP TIMELINE (Phase 5)
-- ============================================

CREATE TABLE IF NOT EXISTS prep_timeline (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  start_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at                TIMESTAMPTZ NOT NULL,
  station_id            UUID REFERENCES stations(id) ON DELETE SET NULL,
  event_id              UUID REFERENCES events(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed')),
  alert_before_minutes  INTEGER NOT NULL DEFAULT 30,
  created_by            UUID,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prep_timeline_chef ON prep_timeline(chef_id, status);
CREATE INDEX idx_prep_timeline_end ON prep_timeline(chef_id, end_at) WHERE status = 'active';
CREATE INDEX idx_prep_timeline_event ON prep_timeline(event_id) WHERE event_id IS NOT NULL;

ALTER TABLE prep_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for prep_timeline" ON prep_timeline;
CREATE POLICY "Tenant isolation for prep_timeline"
  ON prep_timeline
  FOR ALL
  USING (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));
