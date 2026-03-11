-- ============================================
-- ChefFlow V1 - Client Reviews & Feedback
-- Post-event client feedback system with Google Review integration
-- Additive only: one new column on chefs, one new table
-- ============================================

-- ============================================
-- 1. Add Google Review URL to chefs
-- ============================================
ALTER TABLE chefs ADD COLUMN google_review_url TEXT;
COMMENT ON COLUMN chefs.google_review_url IS
  'Chef Google Business review URL - clients are redirected here after leaving internal feedback';
-- ============================================
-- 2. Client Reviews Table
-- ============================================
CREATE TABLE client_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Feedback
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  what_they_loved TEXT,
  what_could_improve TEXT,

  -- Consent & tracking
  display_consent BOOLEAN DEFAULT false NOT NULL,
  google_review_clicked BOOLEAN DEFAULT false NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One review per event
  CONSTRAINT uq_client_reviews_event UNIQUE (event_id)
);
CREATE INDEX idx_client_reviews_tenant ON client_reviews(tenant_id);
CREATE INDEX idx_client_reviews_client ON client_reviews(client_id);
COMMENT ON TABLE client_reviews IS
  'Post-event client feedback - internal survey with optional public display consent';
-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;
-- Clients can insert their own review
CREATE POLICY client_reviews_insert_own ON client_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
    )
  );
-- Clients can read their own reviews
CREATE POLICY client_reviews_select_own ON client_reviews
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
    )
  );
-- Chefs can read all reviews for their tenant
CREATE POLICY client_reviews_select_chef ON client_reviews
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.entity_id FROM user_roles ur
      WHERE ur.auth_user_id = auth.uid() AND ur.role = 'chef'
    )
  );
-- ============================================
-- 4. Updated_at trigger
-- ============================================
CREATE TRIGGER set_client_reviews_updated_at
  BEFORE UPDATE ON client_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
