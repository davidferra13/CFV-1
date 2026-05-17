-- Client Change Request Review Center
CREATE TABLE IF NOT EXISTS client_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  tenant_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  client_notes TEXT,
  chef_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  impact TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_tenant_event ON client_change_requests(tenant_id, event_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_tenant_status ON client_change_requests(tenant_id, status);
