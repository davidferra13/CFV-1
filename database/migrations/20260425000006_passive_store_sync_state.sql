-- Passive storefront source-driven sync state.
-- Tracks chef storefronts that need product regeneration after source data changes.

CREATE TABLE IF NOT EXISTS public.passive_product_sync_state (
  chef_id UUID PRIMARY KEY REFERENCES public.chefs(id) ON DELETE CASCADE,
  dirty BOOLEAN NOT NULL DEFAULT TRUE,
  last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  last_reason TEXT,
  last_source_type TEXT,
  last_source_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passive_product_sync_state_dirty_requested
  ON public.passive_product_sync_state (dirty, last_requested_at);

DROP TRIGGER IF EXISTS passive_product_sync_state_updated_at ON public.passive_product_sync_state;
CREATE TRIGGER passive_product_sync_state_updated_at
  BEFORE UPDATE ON public.passive_product_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.mark_passive_store_dirty(
  p_chef_id UUID,
  p_reason TEXT,
  p_source_type TEXT,
  p_source_id TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_chef_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.passive_product_sync_state (
    chef_id,
    dirty,
    last_requested_at,
    last_reason,
    last_source_type,
    last_source_id,
    updated_at
  )
  VALUES (
    p_chef_id,
    TRUE,
    NOW(),
    p_reason,
    p_source_type,
    p_source_id,
    NOW()
  )
  ON CONFLICT (chef_id) DO UPDATE SET
    dirty = TRUE,
    last_requested_at = EXCLUDED.last_requested_at,
    last_reason = EXCLUDED.last_reason,
    last_source_type = EXCLUDED.last_source_type,
    last_source_id = EXCLUDED.last_source_id,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_passive_store_dirty_from_menu()
RETURNS TRIGGER AS $$
DECLARE
  target_row RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_row := OLD;
  ELSE
    target_row := NEW;
  END IF;

  PERFORM public.mark_passive_store_dirty(
    target_row.tenant_id,
    'menu_source_changed',
    'menu',
    target_row.id::TEXT
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_passive_store_dirty_from_recipe()
RETURNS TRIGGER AS $$
DECLARE
  target_row RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_row := OLD;
  ELSE
    target_row := NEW;
  END IF;

  PERFORM public.mark_passive_store_dirty(
    target_row.tenant_id,
    'recipe_source_changed',
    'recipe',
    target_row.id::TEXT
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_passive_store_dirty_from_event()
RETURNS TRIGGER AS $$
DECLARE
  target_row RECORD;
  old_completed BOOLEAN := FALSE;
  new_completed BOOLEAN := FALSE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_completed := OLD.status = 'completed';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_completed := NEW.status = 'completed';
  END IF;

  IF NOT (old_completed OR new_completed) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_row := OLD;
  ELSE
    target_row := NEW;
  END IF;

  PERFORM public.mark_passive_store_dirty(
    target_row.tenant_id,
    'completed_event_source_changed',
    'event',
    target_row.id::TEXT
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS passive_store_dirty_from_menus ON public.menus;
CREATE TRIGGER passive_store_dirty_from_menus
  AFTER INSERT OR UPDATE OR DELETE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_passive_store_dirty_from_menu();

DROP TRIGGER IF EXISTS passive_store_dirty_from_recipes ON public.recipes;
CREATE TRIGGER passive_store_dirty_from_recipes
  AFTER INSERT OR UPDATE OR DELETE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_passive_store_dirty_from_recipe();

DROP TRIGGER IF EXISTS passive_store_dirty_from_events ON public.events;
CREATE TRIGGER passive_store_dirty_from_events
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_passive_store_dirty_from_event();

COMMENT ON TABLE public.passive_product_sync_state IS
  'Dirty-state queue for passive storefront product regeneration from menus, recipes, and completed events.';
