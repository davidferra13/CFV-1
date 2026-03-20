-- Post-Event Content Pipeline: draft management for social media content
-- Stores AI-generated drafts that chefs edit and approve before posting externally.

CREATE TABLE IF NOT EXISTS event_content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'story', 'blog')),
  draft_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  photo_ids UUID[] DEFAULT '{}',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_drafts_tenant ON event_content_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_event ON event_content_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON event_content_drafts(tenant_id, status);

-- RLS
ALTER TABLE event_content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can read own content drafts"
  ON event_content_drafts FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Chef can insert own content drafts"
  ON event_content_drafts FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Chef can update own content drafts"
  ON event_content_drafts FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Chef can delete own content drafts"
  ON event_content_drafts FOR DELETE
  USING (tenant_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_content_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_drafts_updated_at
  BEFORE UPDATE ON event_content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_content_drafts_updated_at();
