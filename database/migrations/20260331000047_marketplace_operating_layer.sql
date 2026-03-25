-- Marketplace Operating Layer
-- Canonical marketplace records, snapshots, actions, and payout summaries.
-- This runs alongside legacy inquiry.external_* fields so rollout can be incremental.

CREATE TABLE IF NOT EXISTS platform_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  external_inquiry_id TEXT NULL,
  external_uri_token TEXT NULL,
  external_url TEXT NULL,
  request_url TEXT NULL,
  proposal_url TEXT NULL,
  guest_contact_url TEXT NULL,
  booking_url TEXT NULL,
  menu_url TEXT NULL,
  status_on_platform TEXT NULL,
  status_detail TEXT NULL,
  last_capture_type TEXT NULL,
  next_action_required TEXT NULL,
  next_action_by TEXT NULL,
  link_health TEXT NOT NULL DEFAULT 'unknown',
  last_link_error TEXT NULL,
  last_snapshot_at TIMESTAMPTZ NULL,
  last_action_at TIMESTAMPTZ NULL,
  summary TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT platform_records_link_health_check
    CHECK (link_health IN ('unknown', 'working', 'login_required', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_records_inquiry_unique
  ON platform_records(inquiry_id);

CREATE INDEX IF NOT EXISTS idx_platform_records_tenant_platform
  ON platform_records(tenant_id, platform, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_records_external_inquiry_unique
  ON platform_records(tenant_id, platform, external_inquiry_id)
  WHERE external_inquiry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_records_external_uri_unique
  ON platform_records(tenant_id, platform, external_uri_token)
  WHERE external_uri_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform_record_id UUID NOT NULL REFERENCES platform_records(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  capture_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'capture',
  page_url TEXT NULL,
  page_title TEXT NULL,
  summary TEXT NULL,
  text_excerpt TEXT NULL,
  extracted_client_name TEXT NULL,
  extracted_email TEXT NULL,
  extracted_phone TEXT NULL,
  extracted_booking_date DATE NULL,
  extracted_guest_count INTEGER NULL,
  extracted_location TEXT NULL,
  extracted_occasion TEXT NULL,
  extracted_amount_cents INTEGER NULL CHECK (extracted_amount_cents IS NULL OR extracted_amount_cents >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_snapshots_record_snapshot
  ON platform_snapshots(platform_record_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_snapshots_tenant_platform
  ON platform_snapshots(tenant_id, inquiry_id, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS platform_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform_record_id UUID NOT NULL REFERENCES platform_records(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  action_source TEXT NOT NULL DEFAULT 'chef_flow',
  action_url TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  acted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_action_log_record_acted_at
  ON platform_action_log(platform_record_id, acted_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_action_log_tenant_inquiry
  ON platform_action_log(tenant_id, inquiry_id, acted_at DESC);

CREATE TABLE IF NOT EXISTS platform_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  platform_record_id UUID NOT NULL REFERENCES platform_records(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  gross_booking_cents INTEGER NULL CHECK (gross_booking_cents IS NULL OR gross_booking_cents >= 0),
  commission_percent NUMERIC(6,2) NULL CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100)),
  commission_amount_cents INTEGER NULL CHECK (commission_amount_cents IS NULL OR commission_amount_cents >= 0),
  net_payout_cents INTEGER NULL CHECK (net_payout_cents IS NULL OR net_payout_cents >= 0),
  payout_status TEXT NOT NULL DEFAULT 'untracked',
  payout_arrival_date DATE NULL,
  payout_reference TEXT NULL,
  notes TEXT NULL,
  source TEXT NOT NULL DEFAULT 'inquiry',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT platform_payouts_status_check
    CHECK (payout_status IN ('untracked', 'pending', 'scheduled', 'paid', 'issue'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_payouts_record_unique
  ON platform_payouts(platform_record_id);

CREATE INDEX IF NOT EXISTS idx_platform_payouts_tenant_platform
  ON platform_payouts(tenant_id, platform, payout_status);

DROP TRIGGER IF EXISTS trg_platform_records_updated_at ON platform_records;
CREATE TRIGGER trg_platform_records_updated_at
  BEFORE UPDATE ON platform_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_platform_payouts_updated_at ON platform_payouts;
CREATE TRIGGER trg_platform_payouts_updated_at
  BEFORE UPDATE ON platform_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE platform_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs manage own platform records" ON platform_records;
CREATE POLICY "Chefs manage own platform records"
  ON platform_records
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Chefs manage own platform snapshots" ON platform_snapshots;
CREATE POLICY "Chefs manage own platform snapshots"
  ON platform_snapshots
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Chefs manage own platform action log" ON platform_action_log;
CREATE POLICY "Chefs manage own platform action log"
  ON platform_action_log
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Chefs manage own platform payouts" ON platform_payouts;
CREATE POLICY "Chefs manage own platform payouts"
  ON platform_payouts
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS "Service role manages platform records" ON platform_records;
CREATE POLICY "Service role manages platform records"
  ON platform_records
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages platform snapshots" ON platform_snapshots;
CREATE POLICY "Service role manages platform snapshots"
  ON platform_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages platform action log" ON platform_action_log;
CREATE POLICY "Service role manages platform action log"
  ON platform_action_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages platform payouts" ON platform_payouts;
CREATE POLICY "Service role manages platform payouts"
  ON platform_payouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
