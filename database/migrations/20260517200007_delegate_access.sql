-- Delegate Access (Personal Assistants / Coordinator Access)
-- Allows clients to grant delegate access to PAs, event planners, or coordinators.
-- ADDITIVE ONLY: no drops, no deletes.

CREATE TABLE IF NOT EXISTS chef_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  delegate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delegate_email TEXT NOT NULL,
  delegate_name TEXT,
  delegate_phone TEXT,
  role TEXT NOT NULL DEFAULT 'view_coordinate'
    CHECK (role IN ('full_delegate', 'view_coordinate')),
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'revoked')),
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_chef_delegates_tenant ON chef_delegates(chef_tenant_id);
CREATE INDEX idx_chef_delegates_email ON chef_delegates(delegate_email);
CREATE INDEX idx_chef_delegates_status ON chef_delegates(chef_tenant_id, status);
CREATE UNIQUE INDEX idx_chef_delegates_invite_token ON chef_delegates(invite_token);

-- Prevent duplicate active delegates (same email per tenant)
CREATE UNIQUE INDEX idx_chef_delegates_active_email
  ON chef_delegates(chef_tenant_id, delegate_email)
  WHERE status != 'revoked';

CREATE TABLE IF NOT EXISTS delegate_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegate_id UUID NOT NULL REFERENCES chef_delegates(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delegate_activity_log_delegate ON delegate_activity_log(delegate_id);
CREATE INDEX idx_delegate_activity_log_time ON delegate_activity_log(created_at);
