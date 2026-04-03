-- OpenClaw No-Delete Guard Extension
--
-- Extends the no-delete guard (20260403000001) to cover 6 tables
-- created in later migrations that were missed by the original guard.
--
-- Tables being protected:
--   openclaw.flyer_archive         (from 20260401000140)
--   openclaw.zip_centroids         (from 20260401000146)
--   openclaw.usda_price_baselines  (from 20260401000146)
--   openclaw.canonical_ingredients (from 20260401000150)
--   openclaw.source_manifest       (from 20260401000151)
--   openclaw.usda_fdc_products     (from 20260401000151)
--
-- Note: zip_centroids (PK: zip) and canonical_ingredients (PK: ingredient_id)
-- lack an `id` column. The original prevent_delete() references OLD.id, which
-- would fail on these tables. A generic variant is created for them.

-- ============================================================
-- Generic delete guard for tables without an `id` column.
-- Same logic, just omits the row identifier from the error message.
-- ============================================================
CREATE OR REPLACE FUNCTION openclaw.prevent_delete_generic()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.allow_openclaw_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'DELETE is prohibited on OpenClaw tables. Table: %.%',
    TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DELETE guards (row-level)
-- ============================================================

-- Tables with `id` column: use existing openclaw.prevent_delete()
CREATE TRIGGER guard_no_delete_flyer_archive
  BEFORE DELETE ON openclaw.flyer_archive
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_usda_price_baselines
  BEFORE DELETE ON openclaw.usda_price_baselines
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_source_manifest
  BEFORE DELETE ON openclaw.source_manifest
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_usda_fdc_products
  BEFORE DELETE ON openclaw.usda_fdc_products
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

-- Tables without `id` column: use generic variant
CREATE TRIGGER guard_no_delete_zip_centroids
  BEFORE DELETE ON openclaw.zip_centroids
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete_generic();

CREATE TRIGGER guard_no_delete_canonical_ingredients
  BEFORE DELETE ON openclaw.canonical_ingredients
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete_generic();

-- ============================================================
-- TRUNCATE guards (statement-level)
-- ============================================================
CREATE TRIGGER guard_no_truncate_flyer_archive
  BEFORE TRUNCATE ON openclaw.flyer_archive
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_zip_centroids
  BEFORE TRUNCATE ON openclaw.zip_centroids
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_usda_price_baselines
  BEFORE TRUNCATE ON openclaw.usda_price_baselines
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_canonical_ingredients
  BEFORE TRUNCATE ON openclaw.canonical_ingredients
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_source_manifest
  BEFORE TRUNCATE ON openclaw.source_manifest
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_usda_fdc_products
  BEFORE TRUNCATE ON openclaw.usda_fdc_products
  EXECUTE FUNCTION openclaw.prevent_truncate();
