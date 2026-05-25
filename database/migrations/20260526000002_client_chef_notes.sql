-- Client-to-Chef Notes
-- Clients can write private notes about their chef relationship.
-- Optionally shareable with the chef (shared_with_chef flag).

-- New table: client_chef_notes
-- New enum: client_chef_note_category

-- Enum

CREATE TYPE client_chef_note_category AS ENUM (
  'general',
  'service_quality',
  'food',
  'communication',
  'logistics'
);

COMMENT ON TYPE client_chef_note_category IS 'Categories for client notes about their chef';

-- Table

CREATE TABLE client_chef_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  note_text TEXT NOT NULL,
  category client_chef_note_category NOT NULL DEFAULT 'general',
  pinned BOOLEAN NOT NULL DEFAULT false,
  shared_with_chef BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE client_chef_notes IS 'Client-authored notes about their chef. Private by default, optionally shared.';

-- Indexes

CREATE INDEX idx_client_chef_notes_client_chef
  ON client_chef_notes(client_id, chef_id);

CREATE INDEX idx_client_chef_notes_shared
  ON client_chef_notes(chef_id, shared_with_chef, created_at DESC)
  WHERE shared_with_chef = true;

CREATE INDEX idx_client_chef_notes_pinned
  ON client_chef_notes(client_id, chef_id, pinned DESC, created_at DESC);

-- RLS

ALTER TABLE client_chef_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_chef_notes_client_own ON client_chef_notes;
CREATE POLICY client_chef_notes_client_own ON client_chef_notes
  FOR ALL USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_user_id()
  );

DROP POLICY IF EXISTS client_chef_notes_chef_shared ON client_chef_notes;
CREATE POLICY client_chef_notes_chef_shared ON client_chef_notes
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id() AND
    shared_with_chef = true
  );

-- Trigger

CREATE TRIGGER client_chef_notes_updated_at
BEFORE UPDATE ON client_chef_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
