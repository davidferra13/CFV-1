-- Event prep timeline
-- Chef-tracked preparation milestones with per-step client visibility.

CREATE TABLE IF NOT EXISTS public.event_prep_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL CHECK (
    step_key IN (
      'menu_planning',
      'ingredient_sourcing',
      'prep_work',
      'packing',
      'travel',
      'setup',
      'cooking',
      'serving',
      'cleanup',
      'complete'
    )
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'skipped')
  ),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  chef_notes TEXT,
  client_visible_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_prep_steps_event_step_unique UNIQUE (event_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_event_prep_steps_event_id
  ON public.event_prep_steps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_prep_steps_tenant_id
  ON public.event_prep_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_prep_steps_status
  ON public.event_prep_steps(status);
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS prep_timeline_visibility JSONB
  NOT NULL
  DEFAULT '{
    "menu_planning": true,
    "ingredient_sourcing": true,
    "prep_work": true,
    "packing": true,
    "travel": true,
    "setup": true,
    "cooking": true,
    "serving": true,
    "cleanup": true,
    "complete": true
  }'::jsonb;
DROP TRIGGER IF EXISTS set_event_prep_steps_updated_at ON public.event_prep_steps;
CREATE TRIGGER set_event_prep_steps_updated_at
  BEFORE UPDATE ON public.event_prep_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.event_prep_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_prep_steps_chef_all ON public.event_prep_steps;
CREATE POLICY event_prep_steps_chef_all
  ON public.event_prep_steps
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
DROP POLICY IF EXISTS event_prep_steps_client_select ON public.event_prep_steps;
CREATE POLICY event_prep_steps_client_select
  ON public.event_prep_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.user_roles ur
        ON ur.auth_user_id = auth.uid()
       AND ur.role = 'client'
      JOIN public.chefs ch
        ON ch.id = event_prep_steps.tenant_id
      WHERE e.id = event_prep_steps.event_id
        AND e.client_id = ur.entity_id
        AND COALESCE((ch.prep_timeline_visibility ->> event_prep_steps.step_key)::BOOLEAN, true) = true
    )
  );
