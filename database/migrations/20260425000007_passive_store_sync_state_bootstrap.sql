-- Bootstrap passive storefront dirty-state rows for chefs that already have
-- passive source data from before passive_product_sync_state existed.

WITH bootstrap_candidate_chefs AS (
  SELECT tenant_id AS chef_id
  FROM public.menus
  WHERE tenant_id IS NOT NULL
    AND COALESCE(status, '') <> 'archived'

  UNION

  SELECT tenant_id AS chef_id
  FROM public.recipes
  WHERE tenant_id IS NOT NULL
    AND archived = FALSE

  UNION

  SELECT tenant_id AS chef_id
  FROM public.events
  WHERE tenant_id IS NOT NULL
    AND status = 'completed'

  UNION

  SELECT chef_id
  FROM public.passive_products
  WHERE chef_id IS NOT NULL
)
INSERT INTO public.passive_product_sync_state (
  chef_id,
  dirty,
  last_requested_at,
  last_reason,
  last_source_type,
  last_source_id,
  updated_at
)
SELECT
  chefs.id,
  TRUE,
  NOW(),
  'bootstrap_existing_passive_sources',
  'bootstrap',
  NULL,
  NOW()
FROM public.chefs
INNER JOIN bootstrap_candidate_chefs
  ON bootstrap_candidate_chefs.chef_id = chefs.id
ON CONFLICT (chef_id) DO UPDATE SET
  dirty = TRUE,
  last_requested_at = EXCLUDED.last_requested_at,
  last_reason = 'bootstrap_existing_passive_sources',
  last_source_type = 'bootstrap',
  last_source_id = NULL,
  updated_at = NOW();
