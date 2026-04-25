-- Corporate approval gate tracking for Dinner Circle events.
-- Each gate represents one approval step (menu sign-off, budget approval, legal review, etc.).
-- Gates are ordered per event and tracked independently from the JSONB circle config.

CREATE TABLE IF NOT EXISTS circle_approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  gate_name TEXT NOT NULL,
  gate_order INTEGER NOT NULL DEFAULT 0,

  assignee_name TEXT,
  assignee_email TEXT,
  assignee_role TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'skipped')),

  deadline_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  notes TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_gates_event ON circle_approval_gates(event_id);
CREATE INDEX idx_approval_gates_tenant ON circle_approval_gates(tenant_id);
CREATE INDEX idx_approval_gates_pending ON circle_approval_gates(status)
  WHERE status NOT IN ('approved', 'skipped');
