-- Referral Tracking: extend client_referrals with status workflow,
-- revenue tracking, notes, and referral_source for the referral dashboard.
-- The base client_referrals table was created in 20260330000089.

ALTER TABLE client_referrals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'booked', 'completed')),
  ADD COLUMN IF NOT EXISTS revenue_generated_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Composite index for tenant + referrer lookups (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_client_referrals_tenant_referrer
  ON client_referrals(tenant_id, referrer_client_id);

-- RLS policies (table may already have some; these are additive)
ALTER TABLE client_referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_referrals' AND policyname = 'client_referrals_tenant_select'
  ) THEN
    EXECUTE 'CREATE POLICY client_referrals_tenant_select ON client_referrals FOR SELECT USING (tenant_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_referrals' AND policyname = 'client_referrals_tenant_insert'
  ) THEN
    EXECUTE 'CREATE POLICY client_referrals_tenant_insert ON client_referrals FOR INSERT WITH CHECK (tenant_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_referrals' AND policyname = 'client_referrals_tenant_update'
  ) THEN
    EXECUTE 'CREATE POLICY client_referrals_tenant_update ON client_referrals FOR UPDATE USING (tenant_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_referrals' AND policyname = 'client_referrals_tenant_delete'
  ) THEN
    EXECUTE 'CREATE POLICY client_referrals_tenant_delete ON client_referrals FOR DELETE USING (tenant_id = auth.uid())';
  END IF;
END $$;
