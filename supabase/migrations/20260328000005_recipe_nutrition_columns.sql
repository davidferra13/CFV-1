-- Recipe and ingredient nutrition snapshots
-- Supports USDA-backed nutritional calculator module.

alter table if exists public.recipes
  add column if not exists calories_total integer,
  add column if not exists protein_total_g numeric(10, 2),
  add column if not exists fat_total_g numeric(10, 2),
  add column if not exists carbs_total_g numeric(10, 2),
  add column if not exists fiber_total_g numeric(10, 2),
  add column if not exists sodium_total_mg numeric(10, 2),
  add column if not exists protein_per_serving_g numeric(10, 2),
  add column if not exists fat_per_serving_g numeric(10, 2),
  add column if not exists carbs_per_serving_g numeric(10, 2),
  add column if not exists fiber_per_serving_g numeric(10, 2),
  add column if not exists sodium_per_serving_mg numeric(10, 2),
  add column if not exists nutrition_snapshot_json jsonb,
  add column if not exists nutrition_calculated_at timestamptz;
alter table if exists public.ingredients
  add column if not exists nutrition_calories_per_100g numeric(10, 2),
  add column if not exists nutrition_protein_per_100g numeric(10, 2),
  add column if not exists nutrition_fat_per_100g numeric(10, 2),
  add column if not exists nutrition_carbs_per_100g numeric(10, 2),
  add column if not exists nutrition_fiber_per_100g numeric(10, 2),
  add column if not exists nutrition_sodium_mg_per_100g numeric(10, 2),
  add column if not exists nutrition_source text,
  add column if not exists nutrition_updated_at timestamptz;
