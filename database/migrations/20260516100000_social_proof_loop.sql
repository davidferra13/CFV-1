-- Social Proof Loop: portfolio_entries table + testimonials reminder tracking
-- Closes the review capture loop: event -> review request -> submission -> profile display.

-- ============================================
-- 1. Portfolio Entries (event-linked showcase items)
-- ============================================
-- Distinct from portfolio_items (individual photos). portfolio_entries represent
-- a completed event showcased as a whole: description, guest count, menu highlights,
-- linked photos, and an optional linked review.

CREATE TABLE IF NOT EXISTS portfolio_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  occasion_type     TEXT,
  guest_count_range TEXT CHECK (guest_count_range IN ('intimate', 'small', 'medium', 'large', 'xl')),
  menu_highlights   JSONB NOT NULL DEFAULT '[]',
  photos            JSONB NOT NULL DEFAULT '[]',
  linked_review_id  UUID,
  is_public         BOOLEAN NOT NULL DEFAULT true,
  display_order     INTEGER NOT NULL DEFAULT 0,
  event_date        DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_entries_chef
  ON portfolio_entries(chef_id, display_order);

CREATE INDEX IF NOT EXISTS idx_portfolio_entries_public
  ON portfolio_entries(chef_id, is_public) WHERE is_public = true;

CREATE TRIGGER trg_portfolio_entries_updated_at
  BEFORE UPDATE ON portfolio_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_entries_chef_all ON portfolio_entries;
CREATE POLICY portfolio_entries_chef_all ON portfolio_entries
  FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS portfolio_entries_public_read ON portfolio_entries;
CREATE POLICY portfolio_entries_public_read ON portfolio_entries
  FOR SELECT
  USING (is_public = true);

COMMENT ON TABLE portfolio_entries IS 'Event-level portfolio showcase items with description, guest count, menu highlights, and photos.';
COMMENT ON COLUMN portfolio_entries.guest_count_range IS 'intimate=2-4, small=5-8, medium=9-15, large=16-30, xl=30+';
COMMENT ON COLUMN portfolio_entries.menu_highlights IS 'JSON array of dish name strings showcased for this event.';
COMMENT ON COLUMN portfolio_entries.photos IS 'JSON array of {url, caption} objects.';

-- ============================================
-- 2. Testimonials: add reminder tracking column
-- ============================================

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN testimonials.reminder_sent_at IS 'When the 7-day follow-up reminder was sent. NULL means no reminder sent yet. Only one reminder per request.';
