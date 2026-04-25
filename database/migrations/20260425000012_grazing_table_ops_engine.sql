-- Grazing Table Ops Engine
-- Additive schema for deterministic grazing-board/table planning.

CREATE TABLE IF NOT EXISTS public.grazing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  format text NOT NULL CHECK (format IN ('small_board', 'mid_spread', 'large_table')),
  service_style text NOT NULL CHECK (service_style IN ('light_snack', 'standard_grazing', 'heavy_grazing', 'meal_replacement')),
  aesthetic_tags text[] NOT NULL DEFAULT '{}',
  default_density text NOT NULL DEFAULT 'standard' CHECK (default_density IN ('light', 'standard', 'abundant')),
  layout_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  component_mix jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grazing_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('cheese', 'charcuterie', 'fruit', 'cracker_bread', 'nut', 'dip_spread', 'pickle_olive', 'garnish', 'sweet', 'prop')),
  aesthetic_tags text[] NOT NULL DEFAULT '{}',
  season_tags text[] NOT NULL DEFAULT '{}',
  dietary_tags text[] NOT NULL DEFAULT '{}',
  default_unit text NOT NULL DEFAULT 'oz',
  default_vendor_id uuid NULL,
  cost_per_unit_cents integer NULL,
  client_description text NULL,
  prep_notes text NULL,
  storage_notes text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_grazing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  template_id uuid NULL REFERENCES public.grazing_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'client_sent', 'client_approved', 'locked')),
  event_format text NOT NULL CHECK (event_format IN ('small_board', 'mid_spread', 'large_table')),
  service_style text NOT NULL CHECK (service_style IN ('light_snack', 'standard_grazing', 'heavy_grazing', 'meal_replacement')),
  guest_count integer NOT NULL,
  table_length_ft numeric(6,2) NULL,
  table_width_ft numeric(6,2) NULL,
  density text NOT NULL CHECK (density IN ('light', 'standard', 'abundant')),
  budget_cents integer NULL,
  target_margin_percent numeric(5,2) NOT NULL DEFAULT 65,
  aesthetic_tags text[] NOT NULL DEFAULT '{}',
  inspiration_notes text NULL,
  inspiration_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  sourcing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_confirmation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_grazing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.event_grazing_plans(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  component_id uuid NULL REFERENCES public.grazing_components(id) ON DELETE SET NULL,
  category text NOT NULL,
  name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text NOT NULL,
  estimated_cost_cents integer NOT NULL DEFAULT 0,
  vendor_id uuid NULL,
  display_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT true,
  substitution_allowed boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_grazing_plans_event_id
  ON public.event_grazing_plans(event_id);

CREATE INDEX IF NOT EXISTS idx_grazing_templates_tenant_active
  ON public.grazing_templates(tenant_id, active);

CREATE INDEX IF NOT EXISTS idx_grazing_components_tenant_category_active
  ON public.grazing_components(tenant_id, category, active);

CREATE INDEX IF NOT EXISTS idx_event_grazing_plans_tenant_status
  ON public.event_grazing_plans(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_event_grazing_items_plan_order
  ON public.event_grazing_items(plan_id, display_order);

CREATE INDEX IF NOT EXISTS idx_event_grazing_items_tenant_category
  ON public.event_grazing_items(tenant_id, category);

ALTER TABLE public.grazing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grazing_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_grazing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_grazing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY grazing_templates_tenant_select ON public.grazing_templates
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_templates_tenant_insert ON public.grazing_templates
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_templates_tenant_update ON public.grazing_templates
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_templates_tenant_delete ON public.grazing_templates
  FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_components_tenant_select ON public.grazing_components
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_components_tenant_insert ON public.grazing_components
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_components_tenant_update ON public.grazing_components
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY grazing_components_tenant_delete ON public.grazing_components
  FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_plans_tenant_select ON public.event_grazing_plans
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_plans_tenant_insert ON public.event_grazing_plans
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_plans_tenant_update ON public.event_grazing_plans
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_plans_tenant_delete ON public.event_grazing_plans
  FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_items_tenant_select ON public.event_grazing_items
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_items_tenant_insert ON public.event_grazing_items
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_items_tenant_update ON public.event_grazing_items
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY event_grazing_items_tenant_delete ON public.event_grazing_items
  FOR DELETE USING (tenant_id = get_current_tenant_id());

CREATE TRIGGER grazing_templates_updated_at
BEFORE UPDATE ON public.grazing_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER grazing_components_updated_at
BEFORE UPDATE ON public.grazing_components
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER event_grazing_plans_updated_at
BEFORE UPDATE ON public.event_grazing_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER event_grazing_items_updated_at
BEFORE UPDATE ON public.event_grazing_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
