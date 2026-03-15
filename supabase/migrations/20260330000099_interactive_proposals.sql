-- Interactive Proposals with Photos
-- Enhances the Smart Proposal flow with visual, Curate-style proposals.
-- Adds proposal sections (hero, menu, gallery, text, testimonials) and
-- cover photo / chef message to quotes.
-- Additive only.

-- ============================================
-- TABLE: PROPOSAL SECTIONS
-- Ordered sections on a proposal page.
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  section_type  TEXT NOT NULL CHECK (section_type IN ('hero', 'menu', 'text', 'gallery', 'testimonial', 'divider')),
  title         TEXT,
  body_text     TEXT,
  photo_url     TEXT,
  photo_urls    TEXT[] NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposal_sections_quote ON proposal_sections(quote_id);
CREATE INDEX idx_proposal_sections_tenant ON proposal_sections(tenant_id);
COMMENT ON TABLE proposal_sections IS 'Ordered visual sections for interactive proposals (hero, menu, text, gallery, testimonial, divider).';
COMMENT ON COLUMN proposal_sections.section_type IS 'Type of section: hero, menu, text, gallery, testimonial, divider.';
COMMENT ON COLUMN proposal_sections.photo_urls IS 'Array of photo URLs for gallery sections.';
-- ============================================
-- ADDITIVE COLUMNS ON QUOTES
-- ============================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS chef_message TEXT;
COMMENT ON COLUMN quotes.cover_photo_url IS 'Cover photo URL for the interactive proposal hero section.';
COMMENT ON COLUMN quotes.chef_message IS 'Personal message from the chef displayed on the proposal.';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;
-- Chef: full CRUD on their own sections
DROP POLICY IF EXISTS ps_chef_all ON proposal_sections;
CREATE POLICY ps_chef_all ON proposal_sections
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- Service role: full access (for public proposal page via admin client)
DROP POLICY IF EXISTS ps_service_all ON proposal_sections;
CREATE POLICY ps_service_all ON proposal_sections
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
