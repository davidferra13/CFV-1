-- ============================================
-- ChefFlow V1 - Chef Feedback Logging
-- Manual logging of verbal feedback, Google reviews, external testimonials.
-- Separate from client_reviews (which has NOT NULL event/client constraints).
-- Additive only: one new table, no changes to existing tables.
-- ============================================

-- ============================================
-- 1. Chef Feedback Table
-- ============================================
CREATE TABLE chef_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Optional links (feedback may not map to a specific client or event)
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Feedback content
  source          TEXT NOT NULL CHECK (source IN (
    'verbal', 'google', 'yelp', 'email', 'social_media', 'text_message', 'other'
  )),
  rating          INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback_text   TEXT NOT NULL,
  source_url      TEXT,

  -- Metadata
  feedback_date   DATE DEFAULT CURRENT_DATE NOT NULL,
  logged_by       UUID NOT NULL REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chef_feedback_tenant ON chef_feedback(tenant_id);
CREATE INDEX idx_chef_feedback_client ON chef_feedback(client_id);
CREATE INDEX idx_chef_feedback_source ON chef_feedback(source);

COMMENT ON TABLE chef_feedback IS
  'Chef-logged external feedback: verbal, Google reviews, Yelp, social media, etc. Separate from client_reviews (client-submitted).';

-- ============================================
-- 2. RLS Policies (chef-only, using user_roles pattern from client_reviews)
-- ============================================
ALTER TABLE chef_feedback ENABLE ROW LEVEL SECURITY;

-- Chefs can read all feedback for their tenant
CREATE POLICY chef_feedback_select_chef ON chef_feedback
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );

-- Chefs can insert feedback for their tenant
CREATE POLICY chef_feedback_insert_chef ON chef_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );

-- Chefs can update their own feedback
CREATE POLICY chef_feedback_update_chef ON chef_feedback
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );

-- ============================================
-- 3. Updated_at trigger
-- ============================================
CREATE TRIGGER set_chef_feedback_updated_at
  BEFORE UPDATE ON chef_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
