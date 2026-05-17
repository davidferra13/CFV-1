CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID,
  assignee_id UUID,
  assignee_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'unassigned',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_tasks_tenant ON staff_tasks(tenant_id, status);
CREATE INDEX idx_staff_tasks_assignee ON staff_tasks(tenant_id, assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_staff_tasks_event ON staff_tasks(tenant_id, event_id) WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  event_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shifts_event ON shift_assignments(tenant_id, event_id);
CREATE INDEX idx_shifts_staff ON shift_assignments(tenant_id, staff_id);
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
