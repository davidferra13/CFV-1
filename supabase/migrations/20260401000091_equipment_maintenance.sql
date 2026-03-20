-- Equipment Maintenance & Calibration Tracking
-- Adds calibration and next-maintenance-due columns to equipment_items,
-- plus a detailed maintenance log table for tracking all maintenance events.

-- ============================================
-- ALTER equipment_items (additive only)
-- ============================================

-- next_maintenance_due is a computed convenience column; updated by the app
-- when maintenance is logged or interval is set.
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS next_maintenance_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calibration_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN equipment_items.next_maintenance_due
  IS 'Pre-computed next maintenance date. Updated when maintenance is logged.';
COMMENT ON COLUMN equipment_items.calibration_required
  IS 'Whether this item requires periodic calibration (e.g. thermometers, scales).';

CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance
  ON equipment_items(chef_id, next_maintenance_due)
  WHERE next_maintenance_due IS NOT NULL;

-- ============================================
-- TABLE: equipment_maintenance_log
-- ============================================

CREATE TABLE equipment_maintenance_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'calibration', 'repair', 'inspection')),
  notes            TEXT,
  cost_cents       INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  performed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by     TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maint_log_equipment ON equipment_maintenance_log(equipment_id, performed_at DESC);
CREATE INDEX idx_maint_log_chef      ON equipment_maintenance_log(chef_id);

COMMENT ON TABLE equipment_maintenance_log
  IS 'Detailed log of all maintenance, calibration, repair, and inspection events for equipment.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE equipment_maintenance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY eml_chef_select ON equipment_maintenance_log
  FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY eml_chef_insert ON equipment_maintenance_log
  FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY eml_chef_update ON equipment_maintenance_log
  FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY eml_chef_delete ON equipment_maintenance_log
  FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
