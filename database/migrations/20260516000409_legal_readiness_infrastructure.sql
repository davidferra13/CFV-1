-- Legal readiness infrastructure
-- This migration creates durable compliance tracking tables. Attorney/accountant-dependent
-- records default to draft or needs_review and cannot be marked approved without review metadata.

CREATE TABLE IF NOT EXISTS legal_readiness_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'tenant',
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  owner_role TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  jurisdiction TEXT,
  state TEXT,
  related_link TEXT,
  requires_professional_review BOOLEAN NOT NULL DEFAULT true,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_readiness_items_scope_check
    CHECK (scope IN ('global', 'tenant')),
  CONSTRAINT legal_readiness_items_tenant_scope_check
    CHECK (
      (scope = 'global' AND tenant_id IS NULL)
      OR (scope = 'tenant' AND tenant_id IS NOT NULL)
    ),
  CONSTRAINT legal_readiness_items_status_check
    CHECK (status IN ('missing', 'draft', 'needs_review', 'approved', 'not_applicable')),
  CONSTRAINT legal_readiness_items_review_check
    CHECK (
      status <> 'approved'
      OR requires_professional_review = false
      OR last_reviewed_at IS NOT NULL
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_readiness_items_global_key_idx
  ON legal_readiness_items (item_key)
  WHERE scope = 'global';

CREATE UNIQUE INDEX IF NOT EXISTS legal_readiness_items_tenant_key_idx
  ON legal_readiness_items (tenant_id, item_key)
  WHERE scope = 'tenant';

CREATE INDEX IF NOT EXISTS legal_readiness_items_tenant_status_idx
  ON legal_readiness_items (tenant_id, status);

CREATE TABLE IF NOT EXISTS legal_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  public_path TEXT NOT NULL,
  effective_at TIMESTAMPTZ,
  material_change BOOLEAN NOT NULL DEFAULT false,
  requires_reacceptance BOOLEAN NOT NULL DEFAULT false,
  requires_professional_review BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_policy_versions_policy_type_check
    CHECK (
      policy_type IN (
        'terms_of_service',
        'privacy_policy',
        'cookie_policy',
        'acceptable_use_policy',
        'refund_cancellation_policy',
        'dmca_policy',
        'chef_agreement',
        'client_terms',
        'guest_terms',
        'staff_terms',
        'vendor_agreement',
        'partner_terms'
      )
    ),
  CONSTRAINT legal_policy_versions_status_check
    CHECK (status IN ('draft', 'needs_review', 'approved', 'retired')),
  CONSTRAINT legal_policy_versions_review_check
    CHECK (
      status <> 'approved'
      OR requires_professional_review = false
      OR approved_at IS NOT NULL
    ),
  CONSTRAINT legal_policy_versions_type_version_key UNIQUE (policy_type, version)
);

CREATE INDEX IF NOT EXISTS legal_policy_versions_type_status_idx
  ON legal_policy_versions (policy_type, status);

CREATE TABLE IF NOT EXISTS legal_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id UUID REFERENCES legal_policy_versions(id) ON DELETE SET NULL,
  policy_type TEXT NOT NULL,
  version TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL DEFAULT 'user',
  subject_id TEXT,
  role TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'settings',
  reacceptance_required BOOLEAN NOT NULL DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_policy_acceptances_policy_type_check
    CHECK (
      policy_type IN (
        'terms_of_service',
        'privacy_policy',
        'cookie_policy',
        'acceptable_use_policy',
        'refund_cancellation_policy',
        'dmca_policy',
        'chef_agreement',
        'client_terms',
        'guest_terms',
        'staff_terms',
        'vendor_agreement',
        'partner_terms'
      )
    ),
  CONSTRAINT legal_policy_acceptances_subject_type_check
    CHECK (subject_type IN ('user', 'guest', 'email', 'staff', 'vendor', 'partner'))
);

CREATE INDEX IF NOT EXISTS legal_policy_acceptances_user_idx
  ON legal_policy_acceptances (user_id, policy_type, version);

CREATE INDEX IF NOT EXISTS legal_policy_acceptances_tenant_idx
  ON legal_policy_acceptances (tenant_id, role, accepted_at);

CREATE TABLE IF NOT EXISTS legal_data_rights_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_role TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  jurisdiction TEXT,
  due_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_identity_verification BOOLEAN NOT NULL DEFAULT true,
  audit_notes TEXT,
  request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_data_rights_cases_request_type_check
    CHECK (request_type IN ('access', 'export', 'deletion', 'correction', 'opt_out', 'appeal')),
  CONSTRAINT legal_data_rights_cases_status_check
    CHECK (status IN ('submitted', 'verifying', 'in_progress', 'fulfilled', 'denied', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS legal_data_rights_cases_tenant_status_idx
  ON legal_data_rights_cases (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS legal_marketing_sms_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  email TEXT,
  phone TEXT,
  channel TEXT NOT NULL,
  message_class TEXT NOT NULL,
  consent_state TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL,
  source_text_version TEXT,
  consented_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  stop_keyword_seen_at TIMESTAMPTZ,
  help_keyword_seen_at TIMESTAMPTZ,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_marketing_sms_consents_subject_type_check
    CHECK (subject_type IN ('user', 'client', 'guest', 'subscriber', 'phone')),
  CONSTRAINT legal_marketing_sms_consents_channel_check
    CHECK (channel IN ('email', 'sms')),
  CONSTRAINT legal_marketing_sms_consents_message_class_check
    CHECK (message_class IN ('transactional', 'marketing')),
  CONSTRAINT legal_marketing_sms_consents_consent_state_check
    CHECK (consent_state IN ('opted_in', 'opted_out', 'implied', 'unknown')),
  CONSTRAINT legal_marketing_sms_consents_marketing_explicit_check
    CHECK (message_class <> 'marketing' OR consent_state <> 'implied')
);

CREATE INDEX IF NOT EXISTS legal_marketing_sms_consents_tenant_idx
  ON legal_marketing_sms_consents (tenant_id, channel, message_class, consent_state);

CREATE TABLE IF NOT EXISTS legal_payment_tax_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  jurisdiction TEXT,
  state TEXT,
  owner_role TEXT,
  notes TEXT,
  related_link TEXT,
  requires_professional_review BOOLEAN NOT NULL DEFAULT true,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_payment_tax_marketplace_reviews_area_check
    CHECK (
      area IN (
        'saas_tax',
        'prepared_food_tax',
        'marketplace_facilitator',
        'stripe_connect_kyc',
        'refund_disclosures',
        'vendor_1099',
        'alcohol_cannabis',
        'worker_classification'
      )
    ),
  CONSTRAINT legal_payment_tax_marketplace_reviews_status_check
    CHECK (status IN ('draft', 'needs_review', 'not_applicable')),
  CONSTRAINT legal_payment_tax_marketplace_reviews_review_check
    CHECK (status <> 'approved')
);

CREATE INDEX IF NOT EXISTS legal_payment_tax_marketplace_reviews_tenant_idx
  ON legal_payment_tax_marketplace_reviews (tenant_id, area, status);

CREATE TABLE IF NOT EXISTS legal_dmca_takedown_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  complainant_name TEXT,
  complainant_email TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT,
  content_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  requires_professional_review BOOLEAN NOT NULL DEFAULT true,
  notices JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeat_infringer_subject_id TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_dmca_takedown_cases_status_check
    CHECK (
      status IN (
        'submitted',
        'needs_review',
        'action_taken',
        'rejected',
        'counter_notice',
        'repeat_infringer_review'
      )
    )
);

CREATE INDEX IF NOT EXISTS legal_dmca_takedown_cases_tenant_status_idx
  ON legal_dmca_takedown_cases (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS legal_content_ownership_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledgment_version TEXT NOT NULL,
  source TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_content_ownership_ack_tenant_idx
  ON legal_content_ownership_acknowledgments (tenant_id, content_type, acknowledged_at);

DO $$
BEGIN
  IF to_regproc('update_updated_at_column') IS NOT NULL THEN
    CREATE TRIGGER legal_readiness_items_updated_at
      BEFORE UPDATE ON legal_readiness_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER legal_policy_versions_updated_at
      BEFORE UPDATE ON legal_policy_versions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER legal_data_rights_cases_updated_at
      BEFORE UPDATE ON legal_data_rights_cases
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER legal_marketing_sms_consents_updated_at
      BEFORE UPDATE ON legal_marketing_sms_consents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER legal_payment_tax_marketplace_reviews_updated_at
      BEFORE UPDATE ON legal_payment_tax_marketplace_reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER legal_dmca_takedown_cases_updated_at
      BEFORE UPDATE ON legal_dmca_takedown_cases
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO legal_readiness_items (
  scope,
  item_key,
  category,
  title,
  status,
  owner_role,
  related_link,
  requires_professional_review
)
VALUES
  ('global', 'policy_terms_privacy', 'policy', 'Terms and privacy policy professional review', 'needs_review', 'admin', '/admin/legal-readiness', true),
  ('global', 'data_rights_workflow', 'privacy', 'Data rights request workflow', 'draft', 'admin', '/data-request', true),
  ('global', 'dmca_takedown_agent', 'ugc', 'DMCA designated-agent and takedown workflow', 'needs_review', 'admin', '/dmca', true)
ON CONFLICT DO NOTHING;

INSERT INTO legal_policy_versions (
  policy_type,
  version,
  title,
  status,
  public_path,
  material_change,
  requires_reacceptance,
  requires_professional_review,
  notes
)
VALUES
  ('terms_of_service', '2026-05-16-draft', 'Terms of Service', 'draft', '/terms', false, false, true, 'Placeholder inventory record. Requires attorney review.'),
  ('privacy_policy', '2026-05-16-draft', 'Privacy Policy', 'draft', '/privacy', false, false, true, 'Placeholder inventory record. Requires attorney review.'),
  ('cookie_policy', '2026-05-16-draft', 'Cookie Policy', 'draft', '/cookie-policy', false, false, true, 'Placeholder policy page. Requires attorney review.'),
  ('acceptable_use_policy', '2026-05-16-draft', 'Acceptable Use Policy', 'draft', '/acceptable-use', false, false, true, 'Placeholder policy page. Requires attorney review.'),
  ('refund_cancellation_policy', '2026-05-16-draft', 'Refund and Cancellation Policy', 'draft', '/refund-cancellation', false, false, true, 'Placeholder policy page. Requires attorney/accountant review.'),
  ('dmca_policy', '2026-05-16-draft', 'DMCA Policy', 'draft', '/dmca', false, false, true, 'Placeholder policy page. Requires attorney review.'),
  ('chef_agreement', '2026-05-16-draft', 'Chef Agreement', 'draft', '/chef-agreement', false, false, true, 'Placeholder role terms. Requires attorney review.'),
  ('client_terms', '2026-05-16-draft', 'Client Terms', 'draft', '/client-terms', false, false, true, 'Placeholder role terms. Requires attorney review.'),
  ('guest_terms', '2026-05-16-draft', 'Guest Terms', 'draft', '/guest-terms', false, false, true, 'Placeholder role terms. Requires attorney review.'),
  ('staff_terms', '2026-05-16-draft', 'Staff Terms', 'draft', '/staff-terms', false, false, true, 'Placeholder role terms. Requires attorney review.'),
  ('vendor_agreement', '2026-05-16-draft', 'Vendor Agreement', 'draft', '/vendor-agreement', false, false, true, 'Placeholder role terms. Requires attorney review.'),
  ('partner_terms', '2026-05-16-draft', 'Partner Terms', 'draft', '/partner-terms', false, false, true, 'Placeholder role terms. Requires attorney review.')
ON CONFLICT (policy_type, version) DO NOTHING;
