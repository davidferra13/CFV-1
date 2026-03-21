-- Menu Collaboration: revisions, dish feedback, guest count changes

-- Menu revision history (version tracking for proposals)
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
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(menu_id, version)
);

ALTER TABLE menu_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_menu_revision_access" ON menu_revisions;
CREATE POLICY "chef_menu_revision_access" ON menu_revisions
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "client_menu_revision_read" ON menu_revisions;
CREATE POLICY "client_menu_revision_read" ON menu_revisions
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

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

DROP POLICY IF EXISTS "chef_dish_feedback_access" ON menu_dish_feedback;
CREATE POLICY "chef_dish_feedback_access" ON menu_dish_feedback
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "client_dish_feedback_access" ON menu_dish_feedback;
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
  requested_by UUID NOT NULL,
  requested_by_role TEXT NOT NULL CHECK (requested_by_role IN ('chef', 'client')),
  price_impact_cents INTEGER,
  surcharge_applied BOOLEAN DEFAULT false,
  surcharge_cents INTEGER DEFAULT 0,
  acknowledged_by_client BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE guest_count_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_guest_count_access" ON guest_count_changes;
CREATE POLICY "chef_guest_count_access" ON guest_count_changes
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "client_guest_count_read" ON guest_count_changes;
CREATE POLICY "client_guest_count_read" ON guest_count_changes
  FOR SELECT USING (event_id IN (
    SELECT e.id FROM events e
    JOIN clients c ON e.client_id = c.id
    JOIN user_roles ur ON c.auth_user_id = ur.auth_user_id
    WHERE ur.auth_user_id = auth.uid() AND ur.role = 'client'
  ));

-- Extend events table for revision tracking
ALTER TABLE events ADD COLUMN IF NOT EXISTS menu_revision_count INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS menu_last_client_feedback_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS guest_count_change_log JSONB DEFAULT '[]';
