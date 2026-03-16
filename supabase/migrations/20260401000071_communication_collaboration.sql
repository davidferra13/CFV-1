-- Communication Platform Phase 2: Collaboration Layer
-- Adds menu revisions, guest count changes, payment milestones
-- NOTE: response_templates table already exists (created in earlier migration with tenant_id)

-- Add missing columns to existing response_templates if needed
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email';
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS channel_filter TEXT;
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS occasion_filter TEXT;
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Menu revision history (version tracking for menu proposals)
CREATE TABLE IF NOT EXISTS menu_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('initial', 'chef_update', 'client_feedback', 'allergen_resolution')),
  snapshot JSONB NOT NULL,
  changes_summary TEXT,
  allergen_conflicts JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  client_notes TEXT,
  chef_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE(menu_id, version)
);

ALTER TABLE menu_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_menu_revision_access" ON menu_revisions
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE POLICY "client_menu_revision_read" ON menu_revisions
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

CREATE INDEX IF NOT EXISTS idx_menu_revisions_menu ON menu_revisions(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_revisions_event ON menu_revisions(event_id);

-- Per-dish feedback from clients on menu proposals
CREATE TABLE IF NOT EXISTS menu_dish_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_revision_id UUID NOT NULL REFERENCES menu_revisions(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'flagged', 'pending')),
  comment TEXT,
  allergen_conflict BOOLEAN DEFAULT false,
  allergen_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE menu_dish_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_dish_feedback_access" ON menu_dish_feedback
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE POLICY "client_dish_feedback_access" ON menu_dish_feedback
  FOR ALL USING (client_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
  ))
  WITH CHECK (client_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
  ));

CREATE INDEX IF NOT EXISTS idx_menu_dish_feedback_revision ON menu_dish_feedback(menu_revision_id);

-- Guest count change audit log
CREATE TABLE IF NOT EXISTS guest_count_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  previous_count INTEGER NOT NULL,
  new_count INTEGER NOT NULL,
  reason TEXT,
  cost_impact_cents INTEGER,
  approved BOOLEAN DEFAULT false,
  requested_by UUID NOT NULL,
  requested_by_role TEXT NOT NULL DEFAULT 'chef' CHECK (requested_by_role IN ('chef', 'client')),
  surcharge_applied BOOLEAN DEFAULT false,
  surcharge_cents INTEGER DEFAULT 0,
  acknowledged_by_client BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

ALTER TABLE guest_count_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_guest_count_access" ON guest_count_changes
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE POLICY "client_guest_count_read" ON guest_count_changes
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

CREATE INDEX IF NOT EXISTS idx_guest_count_changes_event ON guest_count_changes(event_id);

-- Payment milestones (per-event payment schedule)
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  paid_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_milestone_access" ON payment_milestones
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE POLICY "client_milestone_read" ON payment_milestones
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

CREATE INDEX IF NOT EXISTS idx_payment_milestones_event ON payment_milestones(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_status ON payment_milestones(status) WHERE status IN ('pending', 'overdue');
