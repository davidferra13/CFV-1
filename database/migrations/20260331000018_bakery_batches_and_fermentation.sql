-- Bakery Batch Production Planning + Dough/Fermentation Tracking
-- Two tables: bakery_batches (batch production planning) and fermentation_logs (proof/ferment tracking)

-- =====================================================================================
-- TABLE 1: bakery_batches
-- =====================================================================================

CREATE TABLE bakery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  planned_date DATE NOT NULL,
  planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
  scale_factor NUMERIC(10,4) NOT NULL DEFAULT 1.0 CHECK (scale_factor > 0),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'proofing', 'baking', 'cooling', 'finished', 'cancelled')),
  actual_yield INTEGER CHECK (actual_yield >= 0 OR actual_yield IS NULL),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bakery_batches_tenant_date ON bakery_batches(tenant_id, planned_date);
CREATE INDEX idx_bakery_batches_status ON bakery_batches(tenant_id, status);
-- RLS
ALTER TABLE bakery_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_select_bakery_batches ON bakery_batches;
CREATE POLICY tenant_isolation_select_bakery_batches ON bakery_batches
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_insert_bakery_batches ON bakery_batches;
CREATE POLICY tenant_isolation_insert_bakery_batches ON bakery_batches
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_update_bakery_batches ON bakery_batches;
CREATE POLICY tenant_isolation_update_bakery_batches ON bakery_batches
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_delete_bakery_batches ON bakery_batches;
CREATE POLICY tenant_isolation_delete_bakery_batches ON bakery_batches
  FOR DELETE USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
-- updated_at trigger
CREATE TRIGGER update_bakery_batches_updated_at
  BEFORE UPDATE ON bakery_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- =====================================================================================
-- TABLE 2: fermentation_logs
-- =====================================================================================

CREATE TABLE fermentation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES bakery_batches(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  stage TEXT NOT NULL
    CHECK (stage IN ('autolyse', 'bulk_ferment', 'fold', 'shape', 'cold_retard', 'final_proof', 'ready')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  target_duration_minutes INTEGER CHECK (target_duration_minutes > 0 OR target_duration_minutes IS NULL),
  temperature_f NUMERIC(5,1),
  ambient_temp_f NUMERIC(5,1),
  humidity_percent INTEGER CHECK (
    (humidity_percent >= 0 AND humidity_percent <= 100) OR humidity_percent IS NULL
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fermentation_logs_tenant_start ON fermentation_logs(tenant_id, start_time);
CREATE INDEX idx_fermentation_logs_batch ON fermentation_logs(batch_id);
CREATE INDEX idx_fermentation_logs_active ON fermentation_logs(tenant_id) WHERE end_time IS NULL;
-- RLS
ALTER TABLE fermentation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_select_fermentation_logs ON fermentation_logs;
CREATE POLICY tenant_isolation_select_fermentation_logs ON fermentation_logs
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_insert_fermentation_logs ON fermentation_logs;
CREATE POLICY tenant_isolation_insert_fermentation_logs ON fermentation_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_update_fermentation_logs ON fermentation_logs;
CREATE POLICY tenant_isolation_update_fermentation_logs ON fermentation_logs
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
DROP POLICY IF EXISTS tenant_isolation_delete_fermentation_logs ON fermentation_logs;
CREATE POLICY tenant_isolation_delete_fermentation_logs ON fermentation_logs
  FOR DELETE USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
-- updated_at trigger
CREATE TRIGGER update_fermentation_logs_updated_at
  BEFORE UPDATE ON fermentation_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
