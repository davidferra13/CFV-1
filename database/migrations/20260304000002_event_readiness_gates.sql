-- Event Readiness Gates
-- Tracks precondition satisfaction for FSM state transitions.
-- Each event has a set of gates that must pass (or be overridden) before
-- the system considers that event ready for the next lifecycle stage.
--
-- Gates are evaluated automatically; chef can override with a reason.
-- Critical gates (anaphylaxis present, unconfirmed) cannot be overridden.
--
-- New table: event_readiness_gates

-- ─── Gate catalog ───────────────────────────────────────────────────────────
-- Gates are keyed by string to allow future extension without schema changes.
-- Current gate inventory:
--
-- PRE-CONFIRM gates (required before draft→proposed or paid→confirmed):
--   allergies_verified       All client allergies confirmed by chef
--   menu_client_approved     Client has approved the proposed menu
--   documents_generated      FOH menu, prep sheet, packing list all generated
--
-- PRE-START gates (required before confirmed→in_progress):
--   packing_reviewed         Chef has reviewed packing list (ticked off)
--   equipment_confirmed      Equipment list verified as present/packed
--
-- PRE-COMPLETE gates (required before in_progress→completed):
--   receipts_uploaded        All grocery receipts uploaded
--   kitchen_clean            Kitchen clean note recorded
--   dop_complete             Day-of-protocol checklist all green
--   financial_reconciled     All expenses logged, outstanding balance noted

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE event_readiness_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Which gate this row represents
  gate TEXT NOT NULL,

  -- Gate lifecycle
  -- pending  = not yet evaluated or condition not met
  -- passed   = condition automatically confirmed as met
  -- overridden = chef bypassed with explicit reason (audited)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'passed', 'overridden')),

  -- When it passed or was overridden
  resolved_at TIMESTAMPTZ,

  -- Override audit
  overridden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  override_reason TEXT,

  -- Optional supporting data (e.g., which doc was generated, which allergens confirmed)
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One row per gate per event
  UNIQUE(event_id, gate)
);

COMMENT ON TABLE event_readiness_gates IS
  'Precondition gate tracking for FSM transitions. Each gate represents a '
  'safety or quality check that should be satisfied before an event advances. '
  'Gates can be passed automatically or overridden by the chef with a reason.';

COMMENT ON COLUMN event_readiness_gates.gate IS
  'Gate identifier. See migration comments for full catalog.';

COMMENT ON COLUMN event_readiness_gates.status IS
  'pending=not yet met; passed=auto-confirmed; overridden=chef bypassed with reason';

COMMENT ON COLUMN event_readiness_gates.override_reason IS
  'Required when status=overridden. Logged for audit trail.';

-- ─── Indexes ────────────────────────────────────────────────────────────────

-- Most common: what gates are pending for a given event?
CREATE INDEX idx_readiness_gates_event
  ON event_readiness_gates(event_id, status);

-- Chef dashboard: all pending gates across tenant
CREATE INDEX idx_readiness_gates_tenant_pending
  ON event_readiness_gates(tenant_id, status)
  WHERE status = 'pending';

-- ─── Auto-update timestamp ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_readiness_gate_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER readiness_gate_updated_at
  BEFORE UPDATE ON event_readiness_gates
  FOR EACH ROW EXECUTE FUNCTION update_readiness_gate_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE event_readiness_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS readiness_gates_chef_all ON event_readiness_gates;
CREATE POLICY readiness_gates_chef_all ON event_readiness_gates
  FOR ALL USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

GRANT SELECT, INSERT, UPDATE ON event_readiness_gates TO authenticated;
