-- Staff Onboarding Checklist: per-staff vetting and documentation tracking
CREATE TABLE IF NOT EXISTS staff_onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','complete','not_applicable')),
  document_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_member_id, item_key)
);

ALTER TABLE staff_onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_onboarding_own_tenant" ON staff_onboarding_items
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

-- Per-event staff code of conduct acknowledgment
ALTER TABLE event_staff_assignments
  ADD COLUMN IF NOT EXISTS coc_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coc_acknowledged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_onboarding_member ON staff_onboarding_items(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_tenant ON staff_onboarding_items(tenant_id);
