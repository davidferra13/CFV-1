-- Live service course progression for active event execution.
-- Additive table used only for in-progress events.

CREATE TABLE IF NOT EXISTS event_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,
  course_name TEXT NOT NULL,
  course_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'firing', 'served', 'skipped')),
  planned_time TEXT,
  fired_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_progress_event
  ON event_course_progress(event_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_tenant
  ON event_course_progress(tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_progress_event_order
  ON event_course_progress(event_id, course_order);
