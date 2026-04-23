CREATE TABLE IF NOT EXISTS public.partner_location_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.partner_locations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  partner_note TEXT,
  review_note TEXT,
  requested_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'partner_location_change_requests_status_check'
  ) THEN
    ALTER TABLE public.partner_location_change_requests
      ADD CONSTRAINT partner_location_change_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_location_change_requests_one_pending
  ON public.partner_location_change_requests (location_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_partner_location_change_requests_partner_status_created
  ON public.partner_location_change_requests (partner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_location_change_requests_location_status_created
  ON public.partner_location_change_requests (location_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_location_change_requests_tenant_status_created
  ON public.partner_location_change_requests (tenant_id, status, created_at DESC);
