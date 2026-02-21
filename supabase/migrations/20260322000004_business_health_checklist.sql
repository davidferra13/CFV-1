-- Business Health Checklist: persistent 13-item checklist for business protection status
CREATE TABLE IF NOT EXISTS chef_business_health_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('complete','incomplete','not_applicable')),
  notes TEXT,
  document_url TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, item_key)
);

ALTER TABLE chef_business_health_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_business_health_own_tenant" ON chef_business_health_items
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chef_bh_tenant ON chef_business_health_items(tenant_id);

-- Valid item keys (enforced in application layer):
-- LLC_FORMED, SEPARATE_BANK, GENERAL_LIABILITY_INS, FOOD_HANDLER_CERT,
-- SERVSAFE_CERT, ATTORNEY_REVIEWED_CONTRACT, FINANCES_SEPARATED,
-- BACKUP_CHEF_CONTACT, EMERGENCY_CONTACT_DOCUMENTED, PHOTO_PERMISSION_POLICY,
-- DISABILITY_INSURANCE, BUSINESS_CONTINUITY_PLAN, CERTIFICATIONS_CURRENT
