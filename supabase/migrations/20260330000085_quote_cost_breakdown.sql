-- Quote cost breakdown
-- Optional client-facing line items, exclusions, and sourcing notes.

CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  percentage NUMERIC(5,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  source_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote
  ON public.quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_tenant
  ON public.quote_line_items(tenant_id);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS show_cost_breakdown BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusions_note TEXT;

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS default_show_cost_breakdown BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_exclusions_note TEXT;

ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_line_items_chef_all ON public.quote_line_items;
CREATE POLICY quote_line_items_chef_all
  ON public.quote_line_items
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

DROP POLICY IF EXISTS quote_line_items_client_select ON public.quote_line_items;
CREATE POLICY quote_line_items_client_select
  ON public.quote_line_items
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1
      FROM public.quotes q
      JOIN public.user_roles ur
        ON ur.auth_user_id = auth.uid()
       AND ur.role = 'client'
      WHERE q.id = quote_line_items.quote_id
        AND q.client_id = ur.entity_id
        AND q.show_cost_breakdown = true
    )
  );
