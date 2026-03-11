-- Client Notes System
-- Quick note-taking for chefs to capture observations about clients.
-- Separate from CRM messages (Layer 2) -- these are internal quick notes.
--
-- New table: client_notes
-- New enum: note_category

-- ─── Enum ──────────────────────────────────────────────────────────────────

CREATE TYPE note_category AS ENUM (
  'general',
  'dietary',
  'preference',
  'logistics',
  'relationship'
);
COMMENT ON TYPE note_category IS 'Categories for client notes: general, dietary, preference, logistics, relationship';
-- ─── Table ─────────────────────────────────────────────────────────────────

CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  note_text TEXT NOT NULL,
  category note_category NOT NULL DEFAULT 'general',
  pinned BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'ai_insight'

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE client_notes IS 'Quick notes about clients. Chef-only, tenant-scoped. Separate from CRM message log.';
-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_client_notes_tenant_client
  ON client_notes(tenant_id, client_id);
CREATE INDEX idx_client_notes_pinned
  ON client_notes(tenant_id, client_id, pinned DESC, created_at DESC);
-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_notes_chef_all ON client_notes
  FOR ALL USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- ─── Trigger ───────────────────────────────────────────────────────────────

CREATE TRIGGER client_notes_updated_at
BEFORE UPDATE ON client_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
