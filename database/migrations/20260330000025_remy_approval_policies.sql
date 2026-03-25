-- Remy Approval Policies
-- Centralized, tenant-scoped approval decisions by task_type.
-- Safety defaults still apply in application logic:
-- - restricted actions are always blocked
-- - other actions require approval unless overridden to block

CREATE TABLE IF NOT EXISTS remy_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('require_approval', 'block')),
  reason text,
  enabled boolean NOT NULL DEFAULT true,
  created_by_auth_user_id uuid,
  updated_by_auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, task_type)
);

CREATE INDEX idx_remy_approval_policies_tenant_task
  ON remy_approval_policies (tenant_id, task_type);

CREATE INDEX idx_remy_approval_policies_tenant_enabled
  ON remy_approval_policies (tenant_id, enabled, task_type);

ALTER TABLE remy_approval_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS remy_approval_policies_select ON remy_approval_policies;
CREATE POLICY remy_approval_policies_select
  ON remy_approval_policies FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_approval_policies_insert ON remy_approval_policies;
CREATE POLICY remy_approval_policies_insert
  ON remy_approval_policies FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_approval_policies_update ON remy_approval_policies;
CREATE POLICY remy_approval_policies_update
  ON remy_approval_policies FOR UPDATE
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS remy_approval_policies_delete ON remy_approval_policies;
CREATE POLICY remy_approval_policies_delete
  ON remy_approval_policies FOR DELETE
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
