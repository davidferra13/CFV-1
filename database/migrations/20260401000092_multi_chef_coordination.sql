-- Multi-Chef Event Coordination
-- Allows chefs to assign collaborators to events with station assignments and revenue splits.

CREATE TABLE IF NOT EXISTS event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  collaborator_chef_id UUID,
  collaborator_name TEXT NOT NULL,
  collaborator_email TEXT,
  assigned_station TEXT,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('lead', 'collaborator', 'assistant')),
  revenue_split_pct INTEGER NOT NULL DEFAULT 0 CHECK (revenue_split_pct >= 0 AND revenue_split_pct <= 100),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_chef_id ON event_collaborators(chef_id);

-- Enable RLS
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- Host chef full access (chef_id = the host chef / tenant)
DROP POLICY IF EXISTS "chef_event_collaborator_access" ON event_collaborators;
CREATE POLICY "chef_event_collaborator_access" ON event_collaborators
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_event_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_collaborators_updated_at ON event_collaborators;
CREATE TRIGGER trg_event_collaborators_updated_at
  BEFORE UPDATE ON event_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_event_collaborators_updated_at();
