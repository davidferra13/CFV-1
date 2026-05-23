CREATE TABLE IF NOT EXISTS public.chef_life_private_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  private_notes TEXT,
  state TEXT NOT NULL DEFAULT 'needs_review',
  visibility TEXT NOT NULL DEFAULT 'private_only',
  source TEXT NOT NULL DEFAULT 'structured_form',
  confidence TEXT NOT NULL DEFAULT 'medium',
  freshness TEXT NOT NULL DEFAULT 'review_due',
  last_confirmed_at TIMESTAMPTZ,
  stale_after TIMESTAMPTZ,
  evidence_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  overshare_warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_life_private_constraints_domain_check CHECK (
    domain IN ('body', 'family', 'compliance', 'finance', 'staff', 'household', 'strategy', 'sustainability')
  ),
  CONSTRAINT chef_life_private_constraints_state_check CHECK (
    state IN ('draft', 'needs_review', 'confirmed', 'stale', 'archived', 'deleted')
  ),
  CONSTRAINT chef_life_private_constraints_visibility_check CHECK (
    visibility IN ('private_only', 'chef_internal', 'staff_safe_summary', 'client_safe_summary', 'public_never')
  ),
  CONSTRAINT chef_life_private_constraints_confidence_check CHECK (
    confidence IN ('low', 'medium', 'high', 'confirmed')
  ),
  CONSTRAINT chef_life_private_constraints_freshness_check CHECK (
    freshness IN ('current', 'review_due', 'stale', 'unknown')
  ),
  CONSTRAINT chef_life_private_constraints_evidence_array_check CHECK (
    jsonb_typeof(evidence_attachments) = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_chef_life_constraints_tenant_state
  ON public.chef_life_private_constraints(tenant_id, state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_life_constraints_tenant_domain
  ON public.chef_life_private_constraints(tenant_id, domain, state);

CREATE INDEX IF NOT EXISTS idx_chef_life_constraints_stale
  ON public.chef_life_private_constraints(tenant_id, stale_after)
  WHERE state IN ('confirmed', 'needs_review');

ALTER TABLE public.chef_life_private_constraints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chef_life_private_constraints'
      AND policyname = 'chef_life_private_constraints_chef_all'
  ) THEN
    CREATE POLICY chef_life_private_constraints_chef_all
      ON public.chef_life_private_constraints
      FOR ALL
      USING (
        tenant_id IN (
          SELECT entity_id
          FROM public.user_roles
          WHERE auth_user_id = auth.uid()
            AND role = 'chef'
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT entity_id
          FROM public.user_roles
          WHERE auth_user_id = auth.uid()
            AND role = 'chef'
        )
      );
  END IF;
END $$;
