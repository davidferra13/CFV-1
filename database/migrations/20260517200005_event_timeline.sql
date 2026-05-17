-- Day-Of Timeline Auto-Generation
-- Planning-side timeline that auto-generates from service time, menu, and venue data.
-- Complements service_executions (execution-side tracker).
-- ADDITIVE ONLY.

CREATE TABLE IF NOT EXISTS event_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  service_time TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'in_progress', 'completed')),
  travel_minutes INTEGER,
  setup_minutes INTEGER NOT NULL DEFAULT 30,
  cleanup_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_timelines_event ON event_timelines(event_id);
CREATE INDEX idx_event_timelines_tenant ON event_timelines(tenant_id);

-- One timeline per event
CREATE UNIQUE INDEX idx_event_timelines_event_unique ON event_timelines(event_id);

CREATE TABLE IF NOT EXISTS timeline_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES event_timelines(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL
    CHECK (block_type IN ('travel', 'setup', 'prep', 'cook', 'fire', 'plate', 'serve', 'cleanup', 'advance_prep', 'custom')),
  label TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  sequence INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  course_number INTEGER,
  is_parallel BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_blocks_timeline ON timeline_blocks(timeline_id);
CREATE INDEX idx_timeline_blocks_sequence ON timeline_blocks(timeline_id, sequence);
CREATE INDEX idx_timeline_blocks_type ON timeline_blocks(block_type);
