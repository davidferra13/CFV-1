-- National Price Intelligence Contract + Governor
--
-- First executable slice for:
--   1. Canonical price graph
--   2. Coverage denominator + KPI governor
--
-- Additive only. This migration creates contract views over the existing
-- OpenClaw + ChefFlow pricing schemas without mutating historical data.

CREATE OR REPLACE VIEW openclaw.price_intelligence_contract_v1 AS
WITH product_identity AS (
  SELECT
    p.id AS product_id,
    CASE
      WHEN NULLIF(BTRIM(p.upc), '') IS NOT NULL THEN 'upc:' || LOWER(BTRIM(p.upc))
      ELSE
        'name:' || LOWER(BTRIM(p.name)) ||
        '|brand:' || LOWER(BTRIM(COALESCE(p.brand, ''))) ||
        '|size:' || LOWER(BTRIM(COALESCE(p.size, '')))
    END AS duplicate_group_key
  FROM openclaw.products p
),
product_identity_groups AS (
  SELECT
    duplicate_group_key,
    COUNT(*)::int AS duplicate_candidate_count
  FROM product_identity
  GROUP BY duplicate_group_key
),
product_link_raw AS (
  SELECT
    p.id AS product_id,
    pi.duplicate_group_key,
    nm.canonical_ingredient_id,
    ci.name AS canonical_ingredient_name,
    ci.category AS canonical_category,
    ci.standard_unit AS canonical_unit
  FROM openclaw.products p
  JOIN product_identity pi
    ON pi.product_id = p.id
  LEFT JOIN openclaw.normalization_map nm
    ON LOWER(BTRIM(nm.raw_name)) = LOWER(BTRIM(p.name))
  LEFT JOIN openclaw.canonical_ingredients ci
    ON ci.ingredient_id = nm.canonical_ingredient_id
),
product_link_groups AS (
  SELECT
    duplicate_group_key,
    (
      COUNT(DISTINCT canonical_ingredient_id)
      FILTER (WHERE canonical_ingredient_id IS NOT NULL)
    )::int AS mapping_candidate_count
  FROM product_link_raw
  GROUP BY duplicate_group_key
),
normalized_product_links AS (
  SELECT DISTINCT ON (plr.product_id, plr.canonical_ingredient_id)
    plr.product_id,
    plr.duplicate_group_key,
    pig.duplicate_candidate_count,
    COALESCE(plg.mapping_candidate_count, 0) AS mapping_candidate_count,
    plr.canonical_ingredient_id,
    plr.canonical_ingredient_name,
    plr.canonical_category,
    plr.canonical_unit
  FROM product_link_raw plr
  JOIN product_identity_groups pig
    ON pig.duplicate_group_key = plr.duplicate_group_key
  LEFT JOIN product_link_groups plg
    ON plg.duplicate_group_key = plr.duplicate_group_key
  ORDER BY plr.product_id, plr.canonical_ingredient_id NULLS LAST
),
observed_base AS (
  SELECT
    'v1'::text AS contract_version,
    'observation:' || sp.id::text AS fact_id,
    'observation'::text AS fact_kind,
    COALESCE(sm.source_name, c.name) AS entity_source_name,
    COALESCE(sm.source_type, c.scraper_type, c.source_type, 'chain') AS entity_source_type,
    COALESCE(
      sm.status,
      CASE
        WHEN c.is_active = false OR s.is_active = false THEN 'skipped'
        ELSE 'complete'
      END
    ) AS entity_source_status,
    COALESCE(sm.priority, 'medium') AS entity_source_priority,
    c.id AS entity_chain_id,
    c.slug AS entity_chain_slug,
    c.name AS entity_chain_name,
    s.id AS entity_store_id,
    s.name AS entity_store_name,
    s.city AS entity_store_city,
    s.state AS entity_store_state,
    s.zip AS entity_store_zip,
    s.store_type AS entity_store_type,
    COALESCE(NULLIF(zc.pricing_region, ''), NULLIF(zc.region, ''), LOWER(s.city || '-' || s.state))
      AS entity_market_key,
    COALESCE(NULLIF(zc.pricing_region, ''), NULLIF(zc.region, ''), s.city || ', ' || s.state)
      AS entity_market_label,
    zc.region AS entity_geo_region,
    zc.pricing_region AS entity_pricing_region,
    p.id AS entity_product_id,
    p.name AS entity_product_name,
    p.brand AS entity_product_brand,
    p.upc AS entity_product_upc,
    p.size AS entity_product_size,
    COALESCE(p.is_food, true) AS entity_product_is_food,
    npl.canonical_ingredient_id AS entity_ingredient_id,
    npl.canonical_ingredient_name AS entity_ingredient_name,
    npl.canonical_category AS entity_ingredient_category,
    npl.canonical_unit AS entity_ingredient_unit,
    sp.price_type,
    sp.observation_method,
    COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents) AS price_cents,
    COALESCE(
      sp.price_per_standard_unit_cents,
      COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)
    ) AS normalized_price_cents,
    sp.in_stock,
    sp.last_seen_at AS observed_at,
    NULL::text AS inference_model,
    CONCAT_WS(
      ' / ',
      COALESCE(sm.source_name, c.name),
      COALESCE(NULLIF(sp.source, ''), c.scraper_type, c.source_type),
      sp.observation_method
    ) AS provenance_label,
    npl.duplicate_group_key,
    COALESCE(npl.duplicate_candidate_count, 1) AS duplicate_candidate_count,
    COALESCE(npl.mapping_candidate_count, 0) AS mapping_candidate_count,
    COALESCE(npl.mapping_candidate_count, 0) > 1 AS duplicate_link_conflict,
    ROUND(
      LEAST(
        1.0,
        GREATEST(
          0.05,
          COALESCE(c.reliability_weight, 0.75)
          * CASE
              WHEN sp.last_seen_at > NOW() - INTERVAL '7 days' THEN 1.00
              WHEN sp.last_seen_at > NOW() - INTERVAL '14 days' THEN 0.85
              WHEN sp.last_seen_at > NOW() - INTERVAL '30 days' THEN 0.65
              WHEN sp.last_seen_at > NOW() - INTERVAL '60 days' THEN 0.35
              ELSE 0.15
            END
          * CASE WHEN sp.in_stock = false THEN 0.92 ELSE 1.00 END
          * CASE WHEN COALESCE(p.is_food, true) THEN 1.00 ELSE 0.10 END
          * CASE WHEN npl.canonical_ingredient_id IS NOT NULL THEN 1.00 ELSE 0.45 END
        )
      )::numeric,
      3
    ) AS confidence,
    CASE
      WHEN COALESCE(p.is_food, true) = false THEN 'closed'
      WHEN c.is_active = false OR s.is_active = false THEN 'closed'
      WHEN COALESCE(sm.status, 'complete') = 'failed' THEN 'unreachable'
      WHEN COALESCE(sm.status, 'complete') = 'queued' THEN 'discoverable'
      WHEN npl.canonical_ingredient_id IS NULL THEN 'needs_review'
      WHEN COALESCE(npl.mapping_candidate_count, 0) > 1 THEN 'conflicting'
      WHEN sp.last_seen_at < NOW() - INTERVAL '30 days' THEN 'stale'
      ELSE 'observed'
    END AS lifecycle_state,
    CASE
      WHEN COALESCE(p.is_food, true) = false THEN 'internal_only'
      WHEN npl.canonical_ingredient_id IS NULL THEN 'review'
      WHEN COALESCE(npl.mapping_candidate_count, 0) > 1 THEN 'review'
      WHEN sp.last_seen_at < NOW() - INTERVAL '30 days' THEN 'internal_only'
      WHEN (
        COALESCE(c.reliability_weight, 0.75)
        * CASE
            WHEN sp.last_seen_at > NOW() - INTERVAL '7 days' THEN 1.00
            WHEN sp.last_seen_at > NOW() - INTERVAL '14 days' THEN 0.85
            WHEN sp.last_seen_at > NOW() - INTERVAL '30 days' THEN 0.65
            WHEN sp.last_seen_at > NOW() - INTERVAL '60 days' THEN 0.35
            ELSE 0.15
          END
      ) >= 0.70 THEN 'surfaceable'
      WHEN (
        COALESCE(c.reliability_weight, 0.75)
        * CASE
            WHEN sp.last_seen_at > NOW() - INTERVAL '7 days' THEN 1.00
            WHEN sp.last_seen_at > NOW() - INTERVAL '14 days' THEN 0.85
            WHEN sp.last_seen_at > NOW() - INTERVAL '30 days' THEN 0.65
            WHEN sp.last_seen_at > NOW() - INTERVAL '60 days' THEN 0.35
            ELSE 0.15
          END
      ) >= 0.55 THEN 'internal_only'
      ELSE 'review'
    END AS publication_eligibility
  FROM openclaw.store_products sp
  JOIN openclaw.stores s
    ON s.id = sp.store_id
  JOIN openclaw.chains c
    ON c.id = s.chain_id
  JOIN openclaw.products p
    ON p.id = sp.product_id
  LEFT JOIN openclaw.zip_centroids zc
    ON zc.zip = s.zip
  LEFT JOIN normalized_product_links npl
    ON npl.product_id = p.id
  LEFT JOIN LATERAL (
    SELECT sm.*
    FROM openclaw.source_manifest sm
    WHERE LOWER(BTRIM(sm.source_name)) IN (
      LOWER(BTRIM(c.name)),
      LOWER(BTRIM(c.slug)),
      LOWER(BTRIM(COALESCE(sp.source, '')))
    )
    ORDER BY
      CASE sm.status
        WHEN 'complete' THEN 1
        WHEN 'scanning' THEN 2
        WHEN 'queued' THEN 3
        WHEN 'failed' THEN 4
        WHEN 'skipped' THEN 5
        ELSE 6
      END,
      sm.updated_at DESC NULLS LAST,
      sm.created_at DESC
    LIMIT 1
  ) sm ON TRUE
  WHERE sp.price_cents > 0
),
inferred_base AS (
  SELECT
    'v1'::text AS contract_version,
    'inference:' || MD5(
      COALESCE(ep.item_name, '') || '|' ||
      COALESCE(ep.store_type, '') || '|' ||
      COALESCE(ep.region, '') || '|' ||
      COALESCE(ep.model_name, '')
    ) AS fact_id,
    'inference'::text AS fact_kind,
    ep.model_name AS entity_source_name,
    'model'::text AS entity_source_type,
    'complete'::text AS entity_source_status,
    'low'::text AS entity_source_priority,
    NULL::uuid AS entity_chain_id,
    NULL::text AS entity_chain_slug,
    NULL::text AS entity_chain_name,
    NULL::uuid AS entity_store_id,
    NULL::text AS entity_store_name,
    NULL::text AS entity_store_city,
    NULL::text AS entity_store_state,
    NULL::text AS entity_store_zip,
    ep.store_type AS entity_store_type,
    ep.region AS entity_market_key,
    ep.region AS entity_market_label,
    ep.region AS entity_geo_region,
    NULL::text AS entity_pricing_region,
    NULL::uuid AS entity_product_id,
    NULL::text AS entity_product_name,
    NULL::text AS entity_product_brand,
    NULL::text AS entity_product_upc,
    NULL::text AS entity_product_size,
    TRUE AS entity_product_is_food,
    ci.ingredient_id AS entity_ingredient_id,
    ci.name AS entity_ingredient_name,
    ci.category AS entity_ingredient_category,
    ci.standard_unit AS entity_ingredient_unit,
    ep.price_type,
    'estimate'::text AS observation_method,
    ep.category_adjusted_cents AS price_cents,
    ep.category_adjusted_cents AS normalized_price_cents,
    NULL::boolean AS in_stock,
    ep.observation_date::timestamp AS observed_at,
    ep.model_name AS inference_model,
    'estimated from ' || ep.model_name || ' / ' || COALESCE(ep.region, 'us_average')
      AS provenance_label,
    'estimate:' || LOWER(BTRIM(ep.item_name)) AS duplicate_group_key,
    1 AS duplicate_candidate_count,
    CASE WHEN ci.ingredient_id IS NULL THEN 0 ELSE 1 END AS mapping_candidate_count,
    FALSE AS duplicate_link_conflict,
    ROUND(
      LEAST(
        1.0,
        GREATEST(
          0.05,
          COALESCE(ep.confidence, 0.50)
          * CASE
              WHEN ep.observation_date >= CURRENT_DATE - INTERVAL '30 days' THEN 0.85
              WHEN ep.observation_date >= CURRENT_DATE - INTERVAL '90 days' THEN 0.65
              ELSE 0.45
            END
        )
      )::numeric,
      3
    ) AS confidence,
    CASE
      WHEN ci.ingredient_id IS NULL THEN 'needs_review'
      WHEN ep.observation_date < CURRENT_DATE - INTERVAL '90 days' THEN 'stale'
      ELSE 'inferable'
    END AS lifecycle_state,
    CASE
      WHEN ci.ingredient_id IS NULL THEN 'review'
      WHEN COALESCE(ep.confidence, 0.50) >= 0.75 THEN 'surfaceable'
      WHEN COALESCE(ep.confidence, 0.50) >= 0.55 THEN 'internal_only'
      ELSE 'review'
    END AS publication_eligibility
  FROM openclaw.estimated_prices ep
  LEFT JOIN LATERAL (
    SELECT ci.*
    FROM openclaw.canonical_ingredients ci
    WHERE LOWER(BTRIM(ci.name)) = LOWER(BTRIM(ep.item_name))
    ORDER BY ci.updated_at DESC NULLS LAST, ci.created_at DESC
    LIMIT 1
  ) ci ON TRUE
),
manifest_base AS (
  SELECT
    'v1'::text AS contract_version,
    'source:' || sm.id::text AS fact_id,
    'source'::text AS fact_kind,
    sm.source_name AS entity_source_name,
    sm.source_type AS entity_source_type,
    sm.status AS entity_source_status,
    sm.priority AS entity_source_priority,
    c.id AS entity_chain_id,
    c.slug AS entity_chain_slug,
    c.name AS entity_chain_name,
    NULL::uuid AS entity_store_id,
    NULL::text AS entity_store_name,
    NULL::text AS entity_store_city,
    NULL::text AS entity_store_state,
    NULL::text AS entity_store_zip,
    NULL::text AS entity_store_type,
    sm.region AS entity_market_key,
    sm.region AS entity_market_label,
    sm.region AS entity_geo_region,
    NULL::text AS entity_pricing_region,
    NULL::uuid AS entity_product_id,
    NULL::text AS entity_product_name,
    NULL::text AS entity_product_brand,
    NULL::text AS entity_product_upc,
    NULL::text AS entity_product_size,
    TRUE AS entity_product_is_food,
    NULL::text AS entity_ingredient_id,
    NULL::text AS entity_ingredient_name,
    NULL::text AS entity_ingredient_category,
    NULL::text AS entity_ingredient_unit,
    sm.price_type,
    NULL::text AS observation_method,
    NULL::integer AS price_cents,
    NULL::integer AS normalized_price_cents,
    NULL::boolean AS in_stock,
    sm.scanned_at AS observed_at,
    NULL::text AS inference_model,
    'manifest / ' || sm.source_type || ' / ' || COALESCE(sm.region, 'national') AS provenance_label,
    NULL::numeric AS confidence,
    LOWER(BTRIM(sm.source_name)) AS duplicate_group_key,
    1 AS duplicate_candidate_count,
    0 AS mapping_candidate_count,
    FALSE AS duplicate_link_conflict,
    CASE sm.status
      WHEN 'queued' THEN 'discoverable'
      WHEN 'scanning' THEN 'source_live'
      WHEN 'complete' THEN 'source_live'
      WHEN 'failed' THEN 'unreachable'
      WHEN 'skipped' THEN 'closed'
      ELSE 'needs_review'
    END AS lifecycle_state,
    'internal_only'::text AS publication_eligibility
  FROM openclaw.source_manifest sm
  LEFT JOIN openclaw.chains c
    ON LOWER(BTRIM(c.name)) = LOWER(BTRIM(sm.source_name))
    OR LOWER(BTRIM(c.slug)) = LOWER(BTRIM(sm.source_name))
)
SELECT
  contract_version,
  fact_id,
  fact_kind,
  entity_source_name,
  entity_source_type,
  entity_source_status,
  entity_source_priority,
  entity_chain_id,
  entity_chain_slug,
  entity_chain_name,
  entity_store_id,
  entity_store_name,
  entity_store_city,
  entity_store_state,
  entity_store_zip,
  entity_store_type,
  entity_market_key,
  entity_market_label,
  entity_geo_region,
  entity_pricing_region,
  entity_product_id,
  entity_product_name,
  entity_product_brand,
  entity_product_upc,
  entity_product_size,
  entity_product_is_food,
  entity_ingredient_id,
  entity_ingredient_name,
  entity_ingredient_category,
  entity_ingredient_unit,
  price_type,
  observation_method,
  price_cents,
  normalized_price_cents,
  in_stock,
  observed_at,
  inference_model,
  provenance_label,
  confidence,
  duplicate_group_key,
  duplicate_candidate_count,
  mapping_candidate_count,
  duplicate_link_conflict,
  lifecycle_state,
  publication_eligibility,
  publication_eligibility = 'surfaceable' AS surface_eligible
FROM observed_base
UNION ALL
SELECT
  contract_version,
  fact_id,
  fact_kind,
  entity_source_name,
  entity_source_type,
  entity_source_status,
  entity_source_priority,
  entity_chain_id,
  entity_chain_slug,
  entity_chain_name,
  entity_store_id,
  entity_store_name,
  entity_store_city,
  entity_store_state,
  entity_store_zip,
  entity_store_type,
  entity_market_key,
  entity_market_label,
  entity_geo_region,
  entity_pricing_region,
  entity_product_id,
  entity_product_name,
  entity_product_brand,
  entity_product_upc,
  entity_product_size,
  entity_product_is_food,
  entity_ingredient_id,
  entity_ingredient_name,
  entity_ingredient_category,
  entity_ingredient_unit,
  price_type,
  observation_method,
  price_cents,
  normalized_price_cents,
  in_stock,
  observed_at,
  inference_model,
  provenance_label,
  confidence,
  duplicate_group_key,
  duplicate_candidate_count,
  mapping_candidate_count,
  duplicate_link_conflict,
  lifecycle_state,
  publication_eligibility,
  publication_eligibility = 'surfaceable' AS surface_eligible
FROM inferred_base
UNION ALL
SELECT
  contract_version,
  fact_id,
  fact_kind,
  entity_source_name,
  entity_source_type,
  entity_source_status,
  entity_source_priority,
  entity_chain_id,
  entity_chain_slug,
  entity_chain_name,
  entity_store_id,
  entity_store_name,
  entity_store_city,
  entity_store_state,
  entity_store_zip,
  entity_store_type,
  entity_market_key,
  entity_market_label,
  entity_geo_region,
  entity_pricing_region,
  entity_product_id,
  entity_product_name,
  entity_product_brand,
  entity_product_upc,
  entity_product_size,
  entity_product_is_food,
  entity_ingredient_id,
  entity_ingredient_name,
  entity_ingredient_category,
  entity_ingredient_unit,
  price_type,
  observation_method,
  price_cents,
  normalized_price_cents,
  in_stock,
  observed_at,
  inference_model,
  provenance_label,
  confidence,
  duplicate_group_key,
  duplicate_candidate_count,
  mapping_candidate_count,
  duplicate_link_conflict,
  lifecycle_state,
  publication_eligibility,
  publication_eligibility = 'surfaceable' AS surface_eligible
FROM manifest_base;

COMMENT ON VIEW openclaw.price_intelligence_contract_v1 IS
  'Canonical national price-intelligence contract. Unifies sources, chains, stores, products, canonical ingredients, observed prices, inferred prices, provenance, confidence, duplicate hints, lifecycle state, and surface eligibility.';

CREATE OR REPLACE VIEW openclaw.price_intelligence_store_frontier_v1 AS
WITH store_fact_rollup AS (
  SELECT
    entity_store_id AS store_id,
    MAX(observed_at) AS last_observed_at,
    COUNT(*)::int AS observed_fact_count,
    (COUNT(*) FILTER (
      WHERE lifecycle_state = 'observed'
    ))::int AS fresh_observed_fact_count,
    (COUNT(*) FILTER (
      WHERE lifecycle_state = 'stale'
    ))::int AS stale_fact_count,
    (COUNT(*) FILTER (
      WHERE lifecycle_state IN ('needs_review', 'conflicting')
    ))::int AS needs_review_fact_count,
    (COUNT(*) FILTER (
      WHERE surface_eligible = true
    ))::int AS surfaceable_fact_count,
    ROUND(AVG(confidence)::numeric, 3) AS avg_confidence
  FROM openclaw.price_intelligence_contract_v1
  WHERE fact_kind = 'observation'
    AND entity_store_id IS NOT NULL
  GROUP BY entity_store_id
)
SELECT
  'v1'::text AS contract_version,
  'store:' || s.id::text AS frontier_id,
  c.slug AS source_key,
  c.name AS source_name,
  c.source_type,
  c.reliability_weight,
  s.id AS store_id,
  s.name AS store_name,
  s.city AS store_city,
  s.state AS store_state,
  s.zip AS store_zip,
  s.store_type,
  COALESCE(NULLIF(zc.pricing_region, ''), NULLIF(zc.region, ''), LOWER(s.city || '-' || s.state))
    AS market_key,
  COALESCE(NULLIF(zc.pricing_region, ''), NULLIF(zc.region, ''), s.city || ', ' || s.state)
    AS market_label,
  zc.region AS geo_region,
  zc.pricing_region,
  s.last_cataloged_at,
  COALESCE(r.observed_fact_count, 0) AS observed_fact_count,
  COALESCE(r.fresh_observed_fact_count, 0) AS fresh_observed_fact_count,
  COALESCE(r.surfaceable_fact_count, 0) AS surfaceable_fact_count,
  COALESCE(r.stale_fact_count, 0) AS stale_fact_count,
  COALESCE(r.needs_review_fact_count, 0) AS needs_review_fact_count,
  r.last_observed_at,
  COALESCE(r.avg_confidence, 0.000) AS avg_confidence,
  EXISTS (
    SELECT 1
    FROM openclaw.price_estimation_models pem
    WHERE pem.is_active = true
      AND pem.store_type = s.store_type
  ) AS has_inference_model,
  CASE
    WHEN c.is_active = false OR s.is_active = false THEN 'closed'
    WHEN COALESCE(r.fresh_observed_fact_count, 0) > 0 THEN 'observed'
    WHEN COALESCE(r.surfaceable_fact_count, 0) > 0 THEN 'surfaceable'
    WHEN COALESCE(r.needs_review_fact_count, 0) > 0 THEN 'needs_review'
    WHEN COALESCE(r.stale_fact_count, 0) > 0 THEN 'stale'
    WHEN s.last_cataloged_at IS NOT NULL
      AND s.last_cataloged_at < NOW() - INTERVAL '30 days'
      AND COALESCE(r.observed_fact_count, 0) = 0 THEN 'unreachable'
    WHEN EXISTS (
      SELECT 1
      FROM openclaw.price_estimation_models pem
      WHERE pem.is_active = true
        AND pem.store_type = s.store_type
    ) THEN 'inferable'
    ELSE 'source_live'
  END AS lifecycle_state
FROM openclaw.stores s
JOIN openclaw.chains c
  ON c.id = s.chain_id
LEFT JOIN openclaw.zip_centroids zc
  ON zc.zip = s.zip
LEFT JOIN store_fact_rollup r
  ON r.store_id = s.id;

COMMENT ON VIEW openclaw.price_intelligence_store_frontier_v1 IS
  'Coverage governor view. One row per store/source cell with observed, inferable, stale, review, and surfaceable counts derived from the canonical price-intelligence contract.';
