-- Chef Knowledge System: ChefNotes + knowledge links + attachments + collections + ChefTips upgrades
-- Expands the personal chef learning journal into a full knowledge management system

-- ─── ALTER chef_tips: add pin, review, promoted_to ───────────

ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS promoted_to UUID;

-- ─── chef_notes ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chef_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'journal' CHECK (note_type IN ('journal', 'reference')),
  tags TEXT[] DEFAULT '{}',
  shared BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_notes_chef_created ON chef_notes (chef_id, created_at DESC);
CREATE INDEX idx_chef_notes_chef_type ON chef_notes (chef_id, note_type);
CREATE INDEX idx_chef_notes_tags ON chef_notes USING GIN (tags);

ALTER TABLE chef_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_notes_tenant_isolation ON chef_notes
  USING (chef_id = current_setting('app.current_tenant', true)::uuid);

-- Add FK for promoted_to now that chef_notes exists
ALTER TABLE chef_tips ADD CONSTRAINT fk_chef_tips_promoted_to
  FOREIGN KEY (promoted_to) REFERENCES chef_notes(id) ON DELETE SET NULL;

-- ─── chef_knowledge_links ────────────────────────────────────

CREATE TABLE IF NOT EXISTS chef_knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('tip', 'note')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'recipe', 'ingredient', 'tip', 'note')),
  target_id UUID NOT NULL,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, target_type, target_id)
);

CREATE INDEX idx_knowledge_links_source ON chef_knowledge_links (chef_id, source_type, source_id);
CREATE INDEX idx_knowledge_links_target ON chef_knowledge_links (chef_id, target_type, target_id);

ALTER TABLE chef_knowledge_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_knowledge_links_tenant_isolation ON chef_knowledge_links
  USING (chef_id = current_setting('app.current_tenant', true)::uuid);

-- ─── chef_knowledge_attachments ──────────────────────────────

CREATE TABLE IF NOT EXISTS chef_knowledge_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('tip', 'note')),
  source_id UUID NOT NULL,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_attachments_source ON chef_knowledge_attachments (chef_id, source_type, source_id);

ALTER TABLE chef_knowledge_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_knowledge_attachments_tenant_isolation ON chef_knowledge_attachments
  USING (chef_id = current_setting('app.current_tenant', true)::uuid);

-- ─── chef_knowledge_collections ──────────────────────────────

CREATE TABLE IF NOT EXISTS chef_knowledge_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT CHECK (char_length(description) <= 500),
  shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_collections_chef ON chef_knowledge_collections (chef_id, created_at DESC);

ALTER TABLE chef_knowledge_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_knowledge_collections_tenant_isolation ON chef_knowledge_collections
  USING (chef_id = current_setting('app.current_tenant', true)::uuid);

-- ─── chef_knowledge_collection_items ─────────────────────────

CREATE TABLE IF NOT EXISTS chef_knowledge_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES chef_knowledge_collections(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('tip', 'note')),
  source_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, source_type, source_id)
);

CREATE INDEX idx_collection_items_collection ON chef_knowledge_collection_items (collection_id, sort_order);

-- RLS through collection ownership (join to parent)
ALTER TABLE chef_knowledge_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_collection_items_tenant_isolation ON chef_knowledge_collection_items
  USING (
    EXISTS (
      SELECT 1 FROM chef_knowledge_collections c
      WHERE c.id = collection_id
      AND c.chef_id = current_setting('app.current_tenant', true)::uuid
    )
  );
