-- =============================================================================
-- Migration: Social Event Hub — Media & Pinned Notes
-- Layer: Hub Foundation
-- Purpose: Shared photo albums and pinned sticky notes per group
-- =============================================================================

-- Shared media (photos across events)
CREATE TABLE IF NOT EXISTS hub_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  uploaded_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  storage_path TEXT NOT NULL,
  filename TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  caption TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_media_group
  ON hub_media(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_media_event
  ON hub_media(event_id)
  WHERE event_id IS NOT NULL;
-- Pinned notes (sticky notes board)
CREATE TABLE IF NOT EXISTS hub_pinned_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  title TEXT,
  body TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'default'
    CHECK (color IN ('default', 'yellow', 'pink', 'blue', 'green', 'purple', 'orange')),

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_pinned_notes_group
  ON hub_pinned_notes(group_id, sort_order);
-- Storage bucket for hub media
INSERT INTO storage.buckets (id, name, public)
VALUES ('hub-media', 'hub-media', true)
ON CONFLICT (id) DO NOTHING;
-- Storage policies for hub-media bucket
CREATE POLICY "hub_media_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'hub-media');
CREATE POLICY "hub_media_upload_all" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hub-media');
-- RLS
ALTER TABLE hub_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_pinned_notes ENABLE ROW LEVEL SECURITY;
-- Media: public read/insert
CREATE POLICY "hub_media_select_anon" ON hub_media
  FOR SELECT USING (true);
CREATE POLICY "hub_media_insert_anon" ON hub_media
  FOR INSERT WITH CHECK (true);
CREATE POLICY "hub_media_manage_service" ON hub_media
  FOR ALL USING (auth.role() = 'service_role');
-- Notes: public read/insert
CREATE POLICY "hub_pinned_notes_select_anon" ON hub_pinned_notes
  FOR SELECT USING (true);
CREATE POLICY "hub_pinned_notes_insert_anon" ON hub_pinned_notes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "hub_pinned_notes_manage_service" ON hub_pinned_notes
  FOR ALL USING (auth.role() = 'service_role');
