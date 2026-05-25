-- Business Operations Dashboard
-- Tracks credentials, insurance, trusted staff contacts, and equipment inventory.

-- ============================================
-- TABLE 1: CREDENTIAL TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS chef_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  credential_name TEXT NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('food_handler', 'business_license', 'event_permit', 'certification', 'other')),
  issuing_authority TEXT,
  credential_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_url TEXT,
  document_path TEXT,
  notes TEXT,
  reminder_sent_30d BOOLEAN DEFAULT false,
  reminder_sent_7d BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_credentials_tenant ON chef_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_credentials_expiry ON chef_credentials(tenant_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- ============================================
-- TABLE 2: INSURANCE TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS chef_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('general_liability', 'professional_liability', 'auto', 'health', 'equipment', 'workers_comp', 'other')),
  provider_name TEXT NOT NULL,
  policy_number TEXT,
  coverage_amount_cents INTEGER,
  premium_cents INTEGER,
  premium_frequency TEXT CHECK (premium_frequency IS NULL OR premium_frequency IN ('annual', 'semi_annual', 'quarterly', 'monthly')),
  renewal_date DATE,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  portal_url TEXT,
  document_path TEXT,
  notes TEXT,
  reminder_sent_30d BOOLEAN DEFAULT false,
  reminder_sent_7d BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_insurance_tenant ON chef_insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_insurance_renewal ON chef_insurance_policies(tenant_id, renewal_date)
  WHERE renewal_date IS NOT NULL;

-- ============================================
-- TABLE 3: TRUSTED STAFF ROSTER (external contacts)
-- ============================================

CREATE TABLE IF NOT EXISTS trusted_staff_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('sous_chef', 'line_cook', 'server', 'bartender', 'dishwasher', 'assistant', 'driver', 'other')),
  phone TEXT,
  email TEXT,
  hourly_rate_cents INTEGER,
  day_rate_cents INTEGER,
  availability_notes TEXT,
  reliability_rating INTEGER CHECK (reliability_rating IS NULL OR (reliability_rating >= 1 AND reliability_rating <= 5)),
  last_worked_date DATE,
  last_worked_event TEXT,
  has_food_handler_cert BOOLEAN DEFAULT false,
  has_servsafe BOOLEAN DEFAULT false,
  dietary_restrictions TEXT,
  notes TEXT,
  promoted_to_staff_id UUID REFERENCES staff_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trusted_staff_tenant ON trusted_staff_roster(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trusted_staff_role ON trusted_staff_roster(tenant_id, role);

-- ============================================
-- TABLE 4: EQUIPMENT INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS chef_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cooking', 'prep', 'transport', 'service', 'storage', 'other')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price_cents INTEGER,
  purchase_source TEXT,
  condition TEXT CHECK (condition IS NULL OR condition IN ('excellent', 'good', 'fair', 'needs_service', 'retired')),
  warranty_expiry DATE,
  service_contact_name TEXT,
  service_contact_phone TEXT,
  service_contact_url TEXT,
  notes TEXT,
  retired_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_equipment_tenant ON chef_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_equipment_warranty ON chef_equipment(tenant_id, warranty_expiry)
  WHERE warranty_expiry IS NOT NULL;
