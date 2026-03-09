-- Event live tracker
-- Day-of status updates with chef-controlled client visibility.

CREATE TABLE IF NOT EXISTS public.event_live_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL CHECK (
    status_key IN (
      'en_route',
      'arrived',
      'setting_up',
      'prep_underway',
      'first_course',
      'main_course',
      'dessert',
      'cleanup',
      'complete'
    )
  ),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  chef_note TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_live_status_event_status_unique UNIQUE (event_id, status_key)
);

CREATE INDEX IF NOT EXISTS idx_event_live_status_event
  ON public.event_live_status(event_id);
CREATE INDEX IF NOT EXISTS idx_event_live_status_tenant
  ON public.event_live_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_live_status_timestamp
  ON public.event_live_status(timestamp DESC);

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS live_tracker_visibility JSONB
  NOT NULL
  DEFAULT '{
    "en_route": true,
    "arrived": true,
    "setting_up": false,
    "prep_underway": false,
    "first_course": true,
    "main_course": true,
    "dessert": true,
    "cleanup": false,
    "complete": true
  }'::jsonb;

ALTER TABLE public.event_live_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_live_status_chef_all ON public.event_live_status;
CREATE POLICY event_live_status_chef_all
  ON public.event_live_status
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

DROP POLICY IF EXISTS event_live_status_client_select ON public.event_live_status;
CREATE POLICY event_live_status_client_select
  ON public.event_live_status
  FOR SELECT TO authenticated
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.user_roles ur
        ON ur.auth_user_id = auth.uid()
       AND ur.role = 'client'
      JOIN public.chefs ch
        ON ch.id = event_live_status.tenant_id
      WHERE e.id = event_live_status.event_id
        AND e.client_id = ur.entity_id
        AND COALESCE((ch.live_tracker_visibility ->> event_live_status.status_key)::BOOLEAN, true) = true
    )
  );
