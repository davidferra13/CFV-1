-- Creative Pipeline: capture -> content -> portfolio
-- New chef_captures table for persistent idea/note capture.
-- Extends event_content_drafts with scheduling + capture source.
-- Extends portfolio_items with categorization.

-- ── chef_captures ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chef_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  capture_type TEXT NOT NULL DEFAULT 'text' CHECK (capture_type IN ('text', 'photo', 'voice')),
  raw_content TEXT NOT NULL,
  parsed_items JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'processing', 'sorted', 'archived')),
  source TEXT NOT NULL DEFAULT 'manual',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_captures_tenant ON chef_captures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_captures_status ON chef_captures(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_chef_captures_tags ON chef_captures USING gin(tags);

ALTER TABLE chef_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can read own captures"
  ON chef_captures FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Chef can insert own captures"
  ON chef_captures FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Chef can update own captures"
  ON chef_captures FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Chef can delete own captures"
  ON chef_captures FOR DELETE USING (tenant_id = auth.uid());

CREATE OR REPLACE FUNCTION update_chef_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chef_captures_updated_at ON chef_captures;
CREATE TRIGGER trg_chef_captures_updated_at
  BEFORE UPDATE ON chef_captures
  FOR EACH ROW EXECUTE FUNCTION update_chef_captures_updated_at();

-- ── Extend event_content_drafts ────────────────────────────────────────────

-- Allow content drafts sourced from captures (not just events)
ALTER TABLE event_content_drafts
  ADD COLUMN IF NOT EXISTS capture_source_id UUID REFERENCES chef_captures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_for DATE,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Relax event_id requirement: content can come from captures (no event)
ALTER TABLE event_content_drafts ALTER COLUMN event_id DROP NOT NULL;

-- Expand status to include review + scheduled
ALTER TABLE event_content_drafts DROP CONSTRAINT IF EXISTS event_content_drafts_status_check;
ALTER TABLE event_content_drafts
  ADD CONSTRAINT event_content_drafts_status_check
  CHECK (status IN ('draft', 'review', 'scheduled', 'approved', 'posted'));

-- Expand platform options
ALTER TABLE event_content_drafts DROP CONSTRAINT IF EXISTS event_content_drafts_platform_check;
ALTER TABLE event_content_drafts
  ADD CONSTRAINT event_content_drafts_platform_check
  CHECK (platform IN ('instagram', 'story', 'blog', 'email', 'website', 'newsletter'));

-- ── Extend portfolio_items ─────────────────────────────────────────────────

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized',
  ADD COLUMN IF NOT EXISTS season TEXT,
  ADD COLUMN IF NOT EXISTS cuisine_type TEXT,
  ADD COLUMN IF NOT EXISTS event_link_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collection TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
