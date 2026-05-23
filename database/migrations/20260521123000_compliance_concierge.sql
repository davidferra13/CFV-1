-- Compliance Concierge foundation
-- Chef-owned private compliance profile, proof vault, and event packet snapshots.

CREATE TABLE IF NOT EXISTS compliance_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES chefs(id) ON DELETE CASCADE,
  default_jurisdiction TEXT,
  regulated_service_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  private_notes TEXT,
  disclaimer_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_proof_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private_only',
  status TEXT NOT NULL DEFAULT 'active',
  evidence_url TEXT,
  expires_at DATE,
  jurisdiction TEXT,
  public_label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT compliance_proof_vault_category_check CHECK (
    category IN (
      'license',
      'insurance',
      'permit',
      'food_safety',
      'allergen',
      'alcohol',
      'cannabis',
      'staff_vendor',
      'venue',
      'other'
    )
  ),
  CONSTRAINT compliance_proof_vault_visibility_check CHECK (
    visibility IN (
      'private_only',
      'chef_internal',
      'client_safe',
      'public_profile',
      'requires_evidence',
      'expired',
      'never_publish'
    )
  ),
  CONSTRAINT compliance_proof_vault_status_check CHECK (
    status IN ('active', 'expiring_soon', 'expired', 'missing', 'needs_review')
  ),
  CONSTRAINT compliance_proof_vault_public_label_check CHECK (
    visibility <> 'public_profile'
    OR (public_label IS NOT NULL AND length(trim(public_label)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS compliance_proof_vault_tenant_category_idx
  ON compliance_proof_vault (tenant_id, category, status);

CREATE INDEX IF NOT EXISTS compliance_proof_vault_tenant_expiry_idx
  ON compliance_proof_vault (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS compliance_event_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  readiness_state TEXT NOT NULL,
  packet JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT compliance_event_packets_state_check CHECK (
    readiness_state IN (
      'clear',
      'needs-review',
      'blocked',
      'expired-proof',
      'unknown-jurisdiction',
      'consult-professional'
    )
  ),
  CONSTRAINT compliance_event_packets_event_tenant_unique UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS compliance_event_packets_tenant_state_idx
  ON compliance_event_packets (tenant_id, readiness_state, updated_at DESC);

ALTER TABLE compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_proof_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_event_packets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compliance_profiles_own_tenant ON compliance_profiles;
CREATE POLICY compliance_profiles_own_tenant ON compliance_profiles
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS compliance_proof_vault_own_tenant ON compliance_proof_vault;
CREATE POLICY compliance_proof_vault_own_tenant ON compliance_proof_vault
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS compliance_event_packets_own_tenant ON compliance_event_packets;
CREATE POLICY compliance_event_packets_own_tenant ON compliance_event_packets
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DO $$
BEGIN
  IF to_regproc('update_updated_at_column') IS NOT NULL THEN
    CREATE TRIGGER compliance_profiles_updated_at
      BEFORE UPDATE ON compliance_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER compliance_proof_vault_updated_at
      BEFORE UPDATE ON compliance_proof_vault
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER compliance_event_packets_updated_at
      BEFORE UPDATE ON compliance_event_packets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
