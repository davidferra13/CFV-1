-- Client Meal Requests + Client Meal History Access
-- Enables self-serve recurring menu collaboration in the client portal:
-- 1) Clients can view their own served dish history
-- 2) Clients can submit meal requests (repeat dishes, new ideas, avoid dishes)

-- ============================================================================
-- 1) CLIENT MEAL REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_meal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  request_type TEXT NOT NULL
    CHECK (request_type IN ('repeat_dish', 'new_idea', 'avoid_dish')),
  dish_name TEXT NOT NULL,
  notes TEXT,
  requested_for_week_start DATE,

  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewed', 'scheduled', 'fulfilled', 'declined', 'withdrawn')),

  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_meal_requests_tenant_status
  ON client_meal_requests(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_meal_requests_client
  ON client_meal_requests(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_meal_requests_week
  ON client_meal_requests(tenant_id, requested_for_week_start)
  WHERE requested_for_week_start IS NOT NULL;
COMMENT ON TABLE client_meal_requests IS
  'Client-submitted meal requests for recurring service collaboration (repeat dishes, avoids, new ideas).';
DROP TRIGGER IF EXISTS trg_client_meal_requests_updated_at ON client_meal_requests;
CREATE TRIGGER trg_client_meal_requests_updated_at
  BEFORE UPDATE ON client_meal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- 2) RLS
-- ============================================================================

ALTER TABLE client_meal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cmr_chef_select ON client_meal_requests;
CREATE POLICY cmr_chef_select ON client_meal_requests
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cmr_chef_update ON client_meal_requests;
CREATE POLICY cmr_chef_update ON client_meal_requests
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cmr_chef_delete ON client_meal_requests;
CREATE POLICY cmr_chef_delete ON client_meal_requests
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cmr_client_select ON client_meal_requests;
CREATE POLICY cmr_client_select ON client_meal_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_meal_requests.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS cmr_client_insert ON client_meal_requests;
CREATE POLICY cmr_client_insert ON client_meal_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_meal_requests.client_id
        AND c.auth_user_id = auth.uid()
        AND c.tenant_id = client_meal_requests.tenant_id
    )
  );
DROP POLICY IF EXISTS cmr_client_update ON client_meal_requests;
CREATE POLICY cmr_client_update ON client_meal_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_meal_requests.client_id
        AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = client_meal_requests.client_id
        AND c.auth_user_id = auth.uid()
    )
    AND status IN ('requested', 'withdrawn')
  );
-- ============================================================================
-- 3) CLIENT READ ACCESS TO SERVED DISH HISTORY
-- ============================================================================

DROP POLICY IF EXISTS sdh_client_select ON served_dish_history;
CREATE POLICY sdh_client_select ON served_dish_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = served_dish_history.client_id
        AND c.auth_user_id = auth.uid()
    )
  );
