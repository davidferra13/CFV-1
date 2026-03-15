-- Readiness storage and policy compatibility
-- Ensures readiness persistence exists in environments that missed the original
-- migration, and repairs tenant-scoped RLS policies for related ops tables.

CREATE TABLE IF NOT EXISTS public.event_readiness_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'passed', 'overridden')),
  resolved_at TIMESTAMPTZ,
  overridden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  override_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_readiness_gates_event_gate
  ON public.event_readiness_gates(event_id, gate);
CREATE INDEX IF NOT EXISTS idx_event_readiness_gates_event_status
  ON public.event_readiness_gates(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_readiness_gates_tenant_pending
  ON public.event_readiness_gates(tenant_id, status)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.update_readiness_gate_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS readiness_gate_updated_at ON public.event_readiness_gates;
DROP TRIGGER IF EXISTS readiness_gate_updated_at ON public;
CREATE TRIGGER readiness_gate_updated_at
  BEFORE UPDATE ON public.event_readiness_gates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_readiness_gate_updated_at();

ALTER TABLE public.event_readiness_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS readiness_gates_chef_all ON public.event_readiness_gates;
DROP POLICY IF EXISTS readiness_gates_chef_all ON public;
CREATE POLICY readiness_gates_chef_all
  ON public.event_readiness_gates
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

GRANT SELECT, INSERT, UPDATE ON public.event_readiness_gates TO authenticated;

ALTER TABLE public.dop_task_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage their own DOP completions" ON public.dop_task_completions;
DROP POLICY IF EXISTS dop_task_completions_chef_all ON public.dop_task_completions;
DROP POLICY IF EXISTS dop_task_completions_chef_all ON public;
CREATE POLICY dop_task_completions_chef_all
  ON public.dop_task_completions
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dop_task_completions TO authenticated;

ALTER TABLE public.packing_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage own packing confirmations" ON public.packing_confirmations;
DROP POLICY IF EXISTS packing_confirmations_chef_all ON public.packing_confirmations;
DROP POLICY IF EXISTS packing_confirmations_chef_all ON public;
CREATE POLICY packing_confirmations_chef_all
  ON public.packing_confirmations
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_confirmations TO authenticated;
