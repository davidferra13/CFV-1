-- Repairs the three db-boot-contract trigram indexes that
-- /api/health/readiness?strict=1 reports as missing_required_objects:
--   public.idx_system_ingredients_name_trgm
--   openclaw.idx_canonical_ingredients_name_trgm
--   public.idx_directory_listings_city_trgm
--
-- Cause: the original migrations write `extensions.gin_trgm_ops`, which is the
-- Supabase layout. On a plain postgres image pg_trgm installs into public, so
-- the operator class does not resolve and index creation fails. Readiness has
-- been degraded ever since.
--
-- This resolves the operator class from pg_extension at run time, so it is
-- correct on both layouts, and skips any table or column that does not exist.
-- Additive and idempotent.

DO $repair$
DECLARE
  ext_schema text;
  target record;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF ext_schema IS NULL THEN
    RAISE NOTICE 'pg_trgm not installed, skipping trigram index repair';
    RETURN;
  END IF;

  FOR target IN
    SELECT * FROM (VALUES
      ('public', 'system_ingredients', 'name', 'idx_system_ingredients_name_trgm'),
      ('openclaw', 'canonical_ingredients', 'name', 'idx_canonical_ingredients_name_trgm'),
      ('public', 'directory_listings', 'city', 'idx_directory_listings_city_trgm')
    ) AS t(schema_name, table_name, column_name, index_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = target.schema_name
        AND table_name = target.table_name
        AND column_name = target.column_name
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I.%I USING gin (%I %I.gin_trgm_ops)',
        target.index_name, target.schema_name, target.table_name,
        target.column_name, ext_schema
      );
    ELSE
      RAISE NOTICE 'skipping %, column %.%.% not present',
        target.index_name, target.schema_name, target.table_name, target.column_name;
    END IF;
  END LOOP;
END
$repair$;
