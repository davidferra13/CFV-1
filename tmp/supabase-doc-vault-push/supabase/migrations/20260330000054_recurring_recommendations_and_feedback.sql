-- Recurring Recommendations + Client Meal Feedback
-- Adds:
-- 1) Persistent weekly recommendation records with client approval/revision flow
-- 2) Client feedback metadata on served dish history

-- ============================================================================
-- 1) RECURRING MENU RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_menu_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  week_start DATE,
  recommendation_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'approved', 'revision_requested')),

  client_response_notes TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rmr_tenant_client
  ON recurring_menu_recommendations(tenant_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rmr_status
  ON recurring_menu_recommendations(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rmr_week
  ON recurring_menu_recommendations(tenant_id, week_start)
  WHERE week_start IS NOT NULL;
COMMENT ON TABLE recurring_menu_recommendations IS
  'Chef weekly recommendation drafts sent to recurring clients, with client approval/revision status.';
DROP TRIGGER IF EXISTS trg_rmr_updated_at ON recurring_menu_recommendations;
CREATE TRIGGER trg_rmr_updated_at
  BEFORE UPDATE ON recurring_menu_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE recurring_menu_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rmr_chef_select ON recurring_menu_recommendations;
CREATE POLICY rmr_chef_select ON recurring_menu_recommendations
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS rmr_chef_insert ON recurring_menu_recommendations;
CREATE POLICY rmr_chef_insert ON recurring_menu_recommendations
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS rmr_chef_update ON recurring_menu_recommendations;
CREATE POLICY rmr_chef_update ON recurring_menu_recommendations
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS rmr_chef_delete ON recurring_menu_recommendations;
CREATE POLICY rmr_chef_delete ON recurring_menu_recommendations
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS rmr_client_select ON recurring_menu_recommendations;
CREATE POLICY rmr_client_select ON recurring_menu_recommendations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = recurring_menu_recommendations.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS rmr_client_update ON recurring_menu_recommendations;
CREATE POLICY rmr_client_update ON recurring_menu_recommendations
  FOR UPDATE
  USING (
    status = 'sent'
    AND EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = recurring_menu_recommendations.client_id
        AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('approved', 'revision_requested')
    AND responded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = recurring_menu_recommendations.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
-- ============================================================================
-- 2) CLIENT FEEDBACK METADATA ON SERVED DISH HISTORY
-- ============================================================================

ALTER TABLE served_dish_history
  ADD COLUMN IF NOT EXISTS client_feedback_at TIMESTAMPTZ;
DROP POLICY IF EXISTS sdh_client_update ON served_dish_history;
CREATE POLICY sdh_client_update ON served_dish_history
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = served_dish_history.client_id
        AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = served_dish_history.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
