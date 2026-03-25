-- Dietary confirmation system
-- Chef acknowledgment of client dietary requirements with optional client-facing visibility.

CREATE TABLE IF NOT EXISTS public.dietary_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by_chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  dietary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  chef_notes TEXT,
  client_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dietary_confirmations_event_client_unique UNIQUE (event_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_dietary_confirmations_event
  ON public.dietary_confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_dietary_confirmations_tenant
  ON public.dietary_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dietary_confirmations_client
  ON public.dietary_confirmations(client_id);
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS show_dietary_confirmation BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.dietary_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dietary_confirmations_chef_all ON public.dietary_confirmations;
CREATE POLICY dietary_confirmations_chef_all
  ON public.dietary_confirmations
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  );
DROP POLICY IF EXISTS dietary_confirmations_client_select ON public.dietary_confirmations;
CREATE POLICY dietary_confirmations_client_select
  ON public.dietary_confirmations
  FOR SELECT TO authenticated
  USING (
    client_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'client'
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1
      FROM public.chefs ch
      WHERE ch.id = dietary_confirmations.tenant_id
        AND ch.show_dietary_confirmation = true
    )
  );
