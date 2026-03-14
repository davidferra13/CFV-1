-- ============================================================
-- Inquiry Notes System
-- Adds a first-class, rich note-taking system to inquiries.
-- Replaces the single unknown_fields.notes text blob with a
-- full notes table supporting categories, pins, image attachments,
-- and recipe linking.
-- ============================================================

-- ============================================================
-- 1. ENUM: inquiry_note_category
-- ============================================================

CREATE TYPE inquiry_note_category AS ENUM (
  'general',
  'inspiration',
  'menu_planning',
  'sourcing',
  'logistics',
  'staffing',
  'post_event'
);

-- ============================================================
-- 2. TABLE: inquiry_notes
-- ============================================================

CREATE TABLE inquiry_notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id    UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  note_text     TEXT        NOT NULL CHECK (char_length(note_text) BETWEEN 1 AND 5000),
  category      inquiry_note_category NOT NULL DEFAULT 'general',
  pinned        BOOLEAN     NOT NULL DEFAULT false,
  attachment_url      TEXT,
  attachment_filename TEXT,
  source        TEXT        NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_inquiry_notes_inquiry_id ON inquiry_notes(inquiry_id);
CREATE INDEX idx_inquiry_notes_tenant_id  ON inquiry_notes(tenant_id);
CREATE INDEX idx_inquiry_notes_pinned     ON inquiry_notes(inquiry_id, pinned) WHERE pinned = true;

-- updated_at trigger (reuses the function already defined in earlier migrations)
CREATE TRIGGER inquiry_notes_updated_at
  BEFORE UPDATE ON inquiry_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. TABLE: inquiry_recipe_links
-- ============================================================

CREATE TABLE inquiry_recipe_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id  UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  recipe_id   UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inquiry_id, recipe_id)
);

-- Indexes
CREATE INDEX idx_inquiry_recipe_links_inquiry_id ON inquiry_recipe_links(inquiry_id);
CREATE INDEX idx_inquiry_recipe_links_recipe_id  ON inquiry_recipe_links(recipe_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE inquiry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_recipe_links ENABLE ROW LEVEL SECURITY;

-- Chefs can manage their own tenant's notes
CREATE POLICY "chefs_manage_inquiry_notes"
  ON inquiry_notes
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Chefs can manage their own tenant's recipe links
CREATE POLICY "chefs_manage_inquiry_recipe_links"
  ON inquiry_recipe_links
  FOR ALL
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 5. STORAGE BUCKET: inquiry-note-attachments
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inquiry-note-attachments',
  'inquiry-note-attachments',
  true,
  15728640,  -- 15 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS for inquiry-note-attachments
CREATE POLICY "inquiry_note_attachments_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inquiry-note-attachments');

CREATE POLICY "inquiry_note_attachments_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inquiry-note-attachments');

CREATE POLICY "inquiry_note_attachments_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'inquiry-note-attachments');
