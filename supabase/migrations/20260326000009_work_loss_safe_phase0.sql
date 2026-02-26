-- ============================================================
-- Phase 0: Work-Loss-Safe Editing hardening
-- - Soft delete columns for core entities
-- - Active-row partial indexes
-- - Idempotency ledger for mutation replay protection
-- ============================================================

-- ------------------------------------------------------------
-- 1) Soft delete columns
-- ------------------------------------------------------------

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS public.inquiries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS public.quotes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS public.menus
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- ------------------------------------------------------------
-- 2) Active-row indexes for default list/read paths
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_active_tenant_created_at
  ON public.events (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_active_tenant_created_at
  ON public.inquiries (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_active_tenant_created_at
  ON public.quotes (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_menus_active_tenant_created_at
  ON public.menus (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_active_tenant_created_at
  ON public.clients (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- 3) Mutation idempotency table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mutation_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  actor_id UUID,
  action_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mutation_idempotency_unique
  ON public.mutation_idempotency (tenant_id, action_name, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_mutation_idempotency_lookup
  ON public.mutation_idempotency (tenant_id, action_name, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_mutation_idempotency_updated_at ON public.mutation_idempotency;
    CREATE TRIGGER trg_mutation_idempotency_updated_at
      BEFORE UPDATE ON public.mutation_idempotency
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 4) RLS policies for idempotency table
-- ------------------------------------------------------------

ALTER TABLE public.mutation_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mutation_idempotency_select_tenant ON public.mutation_idempotency;
CREATE POLICY mutation_idempotency_select_tenant
  ON public.mutation_idempotency
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS mutation_idempotency_insert_tenant ON public.mutation_idempotency;
CREATE POLICY mutation_idempotency_insert_tenant
  ON public.mutation_idempotency
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS mutation_idempotency_update_tenant ON public.mutation_idempotency;
CREATE POLICY mutation_idempotency_update_tenant
  ON public.mutation_idempotency
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS mutation_idempotency_service_role_all ON public.mutation_idempotency;
CREATE POLICY mutation_idempotency_service_role_all
  ON public.mutation_idempotency
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
