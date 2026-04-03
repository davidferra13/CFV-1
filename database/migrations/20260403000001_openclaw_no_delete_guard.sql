-- OpenClaw No-Delete Guard
--
-- Prevents DELETE and TRUNCATE operations on all OpenClaw-related tables.
-- OpenClaw is a read/write-append pipeline. It inserts and updates pricing data.
-- There is no legitimate use case for deleting rows from these tables.
--
-- This trigger enforces at the database level what is already true in code:
-- OpenClaw never deletes. If a future code change accidentally introduces a
-- DELETE or TRUNCATE, PostgreSQL will reject it before any data is lost.
--
-- Tables protected (openclaw schema):
--   openclaw.chains
--   openclaw.stores
--   openclaw.products
--   openclaw.product_categories
--   openclaw.store_products
--   openclaw.scrape_runs
--   openclaw.sync_runs
--
-- Tables protected (public schema):
--   openclaw_leads
--   openclaw_market_stats
--   ingredient_price_history
--
-- Escape hatch for legitimate maintenance (GDPR, data repair):
--   BEGIN;
--   SET LOCAL app.allow_openclaw_delete = 'true';
--   DELETE FROM openclaw.products WHERE ...;
--   COMMIT;
--   -- Variable automatically reverts after transaction.

-- ============================================================
-- Single guard function for all tables (both schemas).
-- Uses TG_TABLE_SCHEMA to produce fully-qualified table name.
-- ============================================================
CREATE OR REPLACE FUNCTION openclaw.prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Maintenance escape hatch: SET LOCAL app.allow_openclaw_delete = 'true'
  IF current_setting('app.allow_openclaw_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'DELETE is prohibited on OpenClaw tables. Table: %.%, row id: %',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Statement-level guard: blocks TRUNCATE on protected tables.
-- TRUNCATE bypasses row-level triggers entirely, so this is a
-- separate statement-level trigger using its own function.
-- ============================================================
CREATE OR REPLACE FUNCTION openclaw.prevent_truncate()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.allow_openclaw_delete', true) = 'true' THEN
    RETURN NULL;  -- statement-level: RETURN value is ignored, but required
  END IF;

  RAISE EXCEPTION
    'TRUNCATE is prohibited on OpenClaw tables. Table: %.%',
    TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- openclaw schema tables: DELETE guards
-- ============================================================
CREATE TRIGGER guard_no_delete_chains
  BEFORE DELETE ON openclaw.chains
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_stores
  BEFORE DELETE ON openclaw.stores
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_products
  BEFORE DELETE ON openclaw.products
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_product_categories
  BEFORE DELETE ON openclaw.product_categories
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_store_products
  BEFORE DELETE ON openclaw.store_products
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_scrape_runs
  BEFORE DELETE ON openclaw.scrape_runs
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_sync_runs
  BEFORE DELETE ON openclaw.sync_runs
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

-- ============================================================
-- openclaw schema tables: TRUNCATE guards
-- ============================================================
CREATE TRIGGER guard_no_truncate_chains
  BEFORE TRUNCATE ON openclaw.chains
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_stores
  BEFORE TRUNCATE ON openclaw.stores
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_products
  BEFORE TRUNCATE ON openclaw.products
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_product_categories
  BEFORE TRUNCATE ON openclaw.product_categories
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_store_products
  BEFORE TRUNCATE ON openclaw.store_products
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_scrape_runs
  BEFORE TRUNCATE ON openclaw.scrape_runs
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_sync_runs
  BEFORE TRUNCATE ON openclaw.sync_runs
  EXECUTE FUNCTION openclaw.prevent_truncate();

-- ============================================================
-- Public-schema OpenClaw tables: DELETE + TRUNCATE guards
-- Same function works across schemas (TG_TABLE_SCHEMA = 'public')
-- ============================================================
CREATE TRIGGER guard_no_delete_openclaw_leads
  BEFORE DELETE ON openclaw_leads
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_openclaw_market_stats
  BEFORE DELETE ON openclaw_market_stats
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_delete_ingredient_price_history
  BEFORE DELETE ON ingredient_price_history
  FOR EACH ROW EXECUTE FUNCTION openclaw.prevent_delete();

CREATE TRIGGER guard_no_truncate_openclaw_leads
  BEFORE TRUNCATE ON openclaw_leads
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_openclaw_market_stats
  BEFORE TRUNCATE ON openclaw_market_stats
  EXECUTE FUNCTION openclaw.prevent_truncate();

CREATE TRIGGER guard_no_truncate_ingredient_price_history
  BEFORE TRUNCATE ON ingredient_price_history
  EXECUTE FUNCTION openclaw.prevent_truncate();
