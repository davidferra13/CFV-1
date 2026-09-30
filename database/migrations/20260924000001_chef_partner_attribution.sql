-- Chef Partner Network: agreement snapshots + booking attribution ledger
-- 2026-09-24
--
-- This is intentionally separate from referral_partners.
-- referral_partners models venues/hosts/referrers; this migration models chefs
-- who accept incremental ChefFlow-originated booking opportunities.

CREATE TABLE IF NOT EXISTS chef_partner_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  commission_rate_bps INTEGER NOT NULL,
  commission_basis TEXT NOT NULL DEFAULT 'service_subtotal',
  effective_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  accepted_name TEXT,
  service_territory JSONB NOT NULL DEFAULT '{}'::jsonb,
  payout_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancellation_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  credential_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  negotiated_exceptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  no_exclusivity BOOLEAN NOT NULL DEFAULT true,
  existing_client_protection BOOLEAN NOT NULL DEFAULT true,
  direct_rebook_tail_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_partner_agreements_status_check
    CHECK (status IN ('draft', 'offered', 'accepted', 'paused', 'terminated')),
  CONSTRAINT chef_partner_agreements_commission_rate_check
    CHECK (commission_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT chef_partner_agreements_basis_check
    CHECK (commission_basis = 'service_subtotal'),
  CONSTRAINT chef_partner_agreements_rebook_tail_check
    CHECK (direct_rebook_tail_days >= 0)
);

COMMENT ON TABLE chef_partner_agreements IS
  'Versioned chef-specific commercial schedules for ChefFlow-originated booking opportunities.';
COMMENT ON COLUMN chef_partner_agreements.commission_rate_bps IS
  'ChefFlow commission rate in basis points. 1500 = 15%. Snapshotted again per booking.';
COMMENT ON COLUMN chef_partner_agreements.direct_rebook_tail_days IS
  'Default 0: no perpetual commission merely because ChefFlow made an earlier introduction.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_partner_agreements_one_accepted
  ON chef_partner_agreements(chef_id)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_chef_partner_agreements_chef
  ON chef_partner_agreements(chef_id, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES chef_partner_agreements(id) ON DELETE SET NULL,

  source_owner TEXT NOT NULL,
  booking_route TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  attribution_status TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  decision_version TEXT NOT NULL,

  source_channel TEXT,
  source_token TEXT,
  chef_prior_relationship BOOLEAN NOT NULL DEFAULT false,
  chefflow_first_touch_at TIMESTAMPTZ,
  chef_first_touch_at TIMESTAMPTZ,
  source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

  commission_rate_bps INTEGER,
  commission_basis_cents INTEGER,
  commission_amount_cents INTEGER,
  refunded_service_cents INTEGER NOT NULL DEFAULT 0,

  dispute_status TEXT NOT NULL DEFAULT 'none',
  dispute_note TEXT,
  locked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT booking_attributions_record_check
    CHECK (inquiry_id IS NOT NULL OR event_id IS NOT NULL),
  CONSTRAINT booking_attributions_source_owner_check
    CHECK (source_owner IN ('chefflow', 'chef', 'unknown')),
  CONSTRAINT booking_attributions_route_check
    CHECK (booking_route IN ('chefflow', 'direct')),
  CONSTRAINT booking_attributions_relationship_check
    CHECK (relationship_type IN ('new', 'repeat', 'referral')),
  CONSTRAINT booking_attributions_status_check
    CHECK (attribution_status IN ('commissionable', 'non_commissionable', 'needs_review')),
  CONSTRAINT booking_attributions_dispute_check
    CHECK (dispute_status IN ('none', 'open', 'resolved')),
  CONSTRAINT booking_attributions_rate_check
    CHECK (commission_rate_bps IS NULL OR commission_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT booking_attributions_basis_check
    CHECK (commission_basis_cents IS NULL OR commission_basis_cents >= 0),
  CONSTRAINT booking_attributions_amount_check
    CHECK (commission_amount_cents IS NULL OR commission_amount_cents >= 0),
  CONSTRAINT booking_attributions_refund_check
    CHECK (refunded_service_cents >= 0)
);

COMMENT ON TABLE booking_attributions IS
  'Source-of-truth attribution and commission snapshot for ChefFlow network bookings.';
COMMENT ON COLUMN booking_attributions.source_owner IS
  'chefflow = incremental demand ChefFlow originated; chef = pre-existing/chef-generated demand; unknown = manual review required.';
COMMENT ON COLUMN booking_attributions.locked_at IS
  'Timestamp when source and commercial evidence were frozen for the accepted booking. Corrections require an audit entry.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attributions_inquiry
  ON booking_attributions(inquiry_id)
  WHERE inquiry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attributions_event
  ON booking_attributions(event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_attributions_chef
  ON booking_attributions(assigned_chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_attributions_review
  ON booking_attributions(attribution_status, dispute_status)
  WHERE attribution_status = 'needs_review' OR dispute_status = 'open';

CREATE TABLE IF NOT EXISTS booking_attribution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id UUID NOT NULL REFERENCES booking_attributions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT NOT NULL DEFAULT 'system',
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE booking_attribution_audit IS
  'Append-only evidence trail for attribution decisions, disputes, corrections, and commission recalculations.';

CREATE INDEX IF NOT EXISTS idx_booking_attribution_audit_attribution
  ON booking_attribution_audit(attribution_id, created_at DESC);

DROP TRIGGER IF EXISTS chef_partner_agreements_updated_at ON chef_partner_agreements;
CREATE TRIGGER chef_partner_agreements_updated_at
  BEFORE UPDATE ON chef_partner_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS booking_attributions_updated_at ON booking_attributions;
CREATE TRIGGER booking_attributions_updated_at
  BEFORE UPDATE ON booking_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chef_partner_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attribution_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_partner_agreements_select_own ON chef_partner_agreements;
CREATE POLICY chef_partner_agreements_select_own
  ON chef_partner_agreements
  FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS booking_attributions_select_assigned ON booking_attributions;
CREATE POLICY booking_attributions_select_assigned
  ON booking_attributions
  FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND assigned_chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS booking_attribution_audit_select_assigned ON booking_attribution_audit;
CREATE POLICY booking_attribution_audit_select_assigned
  ON booking_attribution_audit
  FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND EXISTS (
      SELECT 1
      FROM booking_attributions attribution
      WHERE attribution.id = booking_attribution_audit.attribution_id
        AND attribution.assigned_chef_id = get_current_tenant_id()
    )
  );
