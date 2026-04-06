-- Quick Notes: raw capture pad for chefs
-- Notes are typed/dictated on phone widget or dashboard, then triaged into tasks/events/calendar items
CREATE TABLE chef_quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raw'
    CHECK (status IN ('raw', 'triaged', 'dismissed')),
  triaged_to TEXT,
  triaged_ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quick_notes_chef ON chef_quick_notes(chef_id, status, created_at DESC);
