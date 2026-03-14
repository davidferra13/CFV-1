-- Cannabis Control Packet System (V1 Locked)
-- Adds event course_count, control packet snapshots, reconciliation, evidence,
-- immutable locking/finalization behavior, and private storage for photo evidence.

-- ============================================================================
-- 1) Events: add course_count for dynamic per-course packet generation
-- ============================================================================
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS course_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_course_count_positive;

ALTER TABLE events
  ADD CONSTRAINT events_course_count_positive CHECK (course_count > 0);

COMMENT ON COLUMN events.course_count IS
  'Number of courses for the event. Used by cannabis control packet per-course tracking.';

-- ============================================================================
-- 2) Cannabis control packet snapshots (versioned)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cannabis_control_packet_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Frozen event execution context
  guest_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  seating_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  participation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  course_count INTEGER NOT NULL CHECK (course_count > 0),
  layout_type TEXT NOT NULL CHECK (layout_type IN ('linear', 'grid_2x5', 'grid_3x4', 'custom')),
  layout_meta JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Drift detection support
  source_guest_updated_at TIMESTAMPTZ,

  -- Finalization lock
  finalization_locked BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archival_pdf_path TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cannabis_control_packet_snapshot_event_version_unique UNIQUE (event_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_ccp_snapshots_tenant_event
  ON cannabis_control_packet_snapshots(tenant_id, event_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_ccp_snapshots_event_generated
  ON cannabis_control_packet_snapshots(event_id, generated_at DESC);

DROP TRIGGER IF EXISTS set_ccp_snapshots_updated_at ON cannabis_control_packet_snapshots;
CREATE TRIGGER set_ccp_snapshots_updated_at
  BEFORE UPDATE ON cannabis_control_packet_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3) Reconciliation records (one per snapshot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cannabis_control_packet_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL UNIQUE REFERENCES cannabis_control_packet_snapshots(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  snapshot_version INTEGER NOT NULL CHECK (snapshot_version > 0),

  -- Printed-sheet header/footer mirrors
  extract_label_strength TEXT,
  service_operator TEXT,
  total_syringes_portioned INTEGER CHECK (total_syringes_portioned IS NULL OR total_syringes_portioned >= 0),
  total_doses_administered INTEGER CHECK (total_doses_administered IS NULL OR total_doses_administered >= 0),
  extract_returned_to_host BOOLEAN,
  irregularities_notes TEXT,
  chef_signature TEXT,
  host_acknowledgment TEXT,

  -- Structured reconciliation payload
  guest_reconciliation JSONB NOT NULL DEFAULT '[]'::jsonb,
  mismatch_summary JSONB NOT NULL DEFAULT '{}'::jsonb,

  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccp_recon_tenant_event
  ON cannabis_control_packet_reconciliations(tenant_id, event_id, reconciled_at DESC);

DROP TRIGGER IF EXISTS set_ccp_reconciliation_updated_at ON cannabis_control_packet_reconciliations;
CREATE TRIGGER set_ccp_reconciliation_updated_at
  BEFORE UPDATE ON cannabis_control_packet_reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4) Photo evidence linked to snapshot versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS cannabis_control_packet_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES cannabis_control_packet_snapshots(id) ON DELETE CASCADE,
  reconciliation_id UUID REFERENCES cannabis_control_packet_reconciliations(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  storage_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccp_evidence_snapshot
  ON cannabis_control_packet_evidence(snapshot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccp_evidence_tenant_event
  ON cannabis_control_packet_evidence(tenant_id, event_id, created_at DESC);

-- ============================================================================
-- 5) Guardrails: event ownership + cannabis eligibility checks
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_cannabis_control_packet_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  ev_tenant UUID;
  ev_cannabis BOOLEAN;
BEGIN
  SELECT tenant_id, COALESCE(cannabis_preference, false)
  INTO ev_tenant, ev_cannabis
  FROM events
  WHERE id = NEW.event_id;

  IF ev_tenant IS NULL THEN
    RAISE EXCEPTION 'Control packet event does not exist';
  END IF;

  IF ev_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Control packet tenant mismatch for event';
  END IF;

  IF ev_cannabis = false THEN
    RAISE EXCEPTION 'Control packet can only be generated for cannabis-enabled events';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ccp_snapshot ON cannabis_control_packet_snapshots;
CREATE TRIGGER trg_validate_ccp_snapshot
  BEFORE INSERT ON cannabis_control_packet_snapshots
  FOR EACH ROW EXECUTE FUNCTION validate_cannabis_control_packet_snapshot();

CREATE OR REPLACE FUNCTION validate_cannabis_control_packet_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
  snap RECORD;
BEGIN
  SELECT id, event_id, tenant_id, version_number, finalization_locked
  INTO snap
  FROM cannabis_control_packet_snapshots
  WHERE id = NEW.snapshot_id;

  IF snap.id IS NULL THEN
    RAISE EXCEPTION 'Reconciliation snapshot does not exist';
  END IF;

  IF NEW.event_id <> snap.event_id OR NEW.tenant_id <> snap.tenant_id THEN
    RAISE EXCEPTION 'Reconciliation event/tenant must match snapshot';
  END IF;

  IF NEW.snapshot_version <> snap.version_number THEN
    RAISE EXCEPTION 'Reconciliation snapshot_version mismatch';
  END IF;

  IF snap.finalization_locked THEN
    RAISE EXCEPTION 'Snapshot is finalized and cannot be reconciled';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ccp_reconciliation ON cannabis_control_packet_reconciliations;
CREATE TRIGGER trg_validate_ccp_reconciliation
  BEFORE INSERT OR UPDATE ON cannabis_control_packet_reconciliations
  FOR EACH ROW EXECUTE FUNCTION validate_cannabis_control_packet_reconciliation();

CREATE OR REPLACE FUNCTION validate_cannabis_control_packet_evidence()
RETURNS TRIGGER AS $$
DECLARE
  snap RECORD;
BEGIN
  SELECT id, event_id, tenant_id, finalization_locked
  INTO snap
  FROM cannabis_control_packet_snapshots
  WHERE id = NEW.snapshot_id;

  IF snap.id IS NULL THEN
    RAISE EXCEPTION 'Evidence snapshot does not exist';
  END IF;

  IF NEW.event_id <> snap.event_id OR NEW.tenant_id <> snap.tenant_id THEN
    RAISE EXCEPTION 'Evidence event/tenant must match snapshot';
  END IF;

  IF snap.finalization_locked THEN
    RAISE EXCEPTION 'Cannot add evidence after packet finalization';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_ccp_evidence ON cannabis_control_packet_evidence;
CREATE TRIGGER trg_validate_ccp_evidence
  BEFORE INSERT ON cannabis_control_packet_evidence
  FOR EACH ROW EXECUTE FUNCTION validate_cannabis_control_packet_evidence();

-- ============================================================================
-- 6) Immutability and lock enforcement
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_cannabis_control_packet_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Control packet snapshots are immutable and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.finalization_locked THEN
      RAISE EXCEPTION 'Finalized control packet snapshots cannot be modified';
    END IF;

    IF NEW.event_id IS DISTINCT FROM OLD.event_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.version_number IS DISTINCT FROM OLD.version_number
      OR NEW.generated_at IS DISTINCT FROM OLD.generated_at
      OR NEW.generated_by IS DISTINCT FROM OLD.generated_by
      OR NEW.guest_snapshot IS DISTINCT FROM OLD.guest_snapshot
      OR NEW.seating_snapshot IS DISTINCT FROM OLD.seating_snapshot
      OR NEW.participation_snapshot IS DISTINCT FROM OLD.participation_snapshot
      OR NEW.course_count IS DISTINCT FROM OLD.course_count
      OR NEW.layout_type IS DISTINCT FROM OLD.layout_type
      OR NEW.layout_meta IS DISTINCT FROM OLD.layout_meta
      OR NEW.source_guest_updated_at IS DISTINCT FROM OLD.source_guest_updated_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Snapshot payload is immutable. Generate a new version instead.';
    END IF;

    -- finalization lock transition rules
    IF OLD.finalization_locked = false AND NEW.finalization_locked = true THEN
      IF NEW.finalized_at IS NULL THEN
        RAISE EXCEPTION 'Finalized snapshot requires finalized_at';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ccp_snapshot_immutable ON cannabis_control_packet_snapshots;
CREATE TRIGGER trg_ccp_snapshot_immutable
  BEFORE UPDATE OR DELETE ON cannabis_control_packet_snapshots
  FOR EACH ROW EXECUTE FUNCTION enforce_cannabis_control_packet_snapshot_immutability();

CREATE OR REPLACE FUNCTION enforce_cannabis_control_packet_reconciliation_lock()
RETURNS TRIGGER AS $$
DECLARE
  is_locked BOOLEAN;
BEGIN
  SELECT finalization_locked
  INTO is_locked
  FROM cannabis_control_packet_snapshots
  WHERE id = COALESCE(NEW.snapshot_id, OLD.snapshot_id);

  IF TG_OP = 'DELETE' THEN
    IF is_locked THEN
      RAISE EXCEPTION 'Cannot delete reconciliation for a finalized control packet';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF is_locked THEN
      RAISE EXCEPTION 'Cannot edit reconciliation for a finalized control packet';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ccp_reconciliation_lock ON cannabis_control_packet_reconciliations;
CREATE TRIGGER trg_ccp_reconciliation_lock
  BEFORE UPDATE OR DELETE ON cannabis_control_packet_reconciliations
  FOR EACH ROW EXECUTE FUNCTION enforce_cannabis_control_packet_reconciliation_lock();

CREATE OR REPLACE FUNCTION enforce_cannabis_control_packet_evidence_lock()
RETURNS TRIGGER AS $$
DECLARE
  is_locked BOOLEAN;
BEGIN
  SELECT finalization_locked
  INTO is_locked
  FROM cannabis_control_packet_snapshots
  WHERE id = OLD.snapshot_id;

  IF is_locked THEN
    RAISE EXCEPTION 'Cannot delete evidence from a finalized control packet';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ccp_evidence_lock ON cannabis_control_packet_evidence;
CREATE TRIGGER trg_ccp_evidence_lock
  BEFORE DELETE ON cannabis_control_packet_evidence
  FOR EACH ROW EXECUTE FUNCTION enforce_cannabis_control_packet_evidence_lock();

-- ============================================================================
-- 7) RLS: chef-only access
-- ============================================================================
ALTER TABLE cannabis_control_packet_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cannabis_control_packet_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cannabis_control_packet_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccp_snapshots_chef_select ON cannabis_control_packet_snapshots;
CREATE POLICY ccp_snapshots_chef_select
  ON cannabis_control_packet_snapshots FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_snapshots_chef_insert ON cannabis_control_packet_snapshots;
CREATE POLICY ccp_snapshots_chef_insert
  ON cannabis_control_packet_snapshots FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_snapshots_chef_update ON cannabis_control_packet_snapshots;
CREATE POLICY ccp_snapshots_chef_update
  ON cannabis_control_packet_snapshots FOR UPDATE
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_reconciliation_chef_select ON cannabis_control_packet_reconciliations;
CREATE POLICY ccp_reconciliation_chef_select
  ON cannabis_control_packet_reconciliations FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_reconciliation_chef_insert ON cannabis_control_packet_reconciliations;
CREATE POLICY ccp_reconciliation_chef_insert
  ON cannabis_control_packet_reconciliations FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_reconciliation_chef_update ON cannabis_control_packet_reconciliations;
CREATE POLICY ccp_reconciliation_chef_update
  ON cannabis_control_packet_reconciliations FOR UPDATE
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_evidence_chef_select ON cannabis_control_packet_evidence;
CREATE POLICY ccp_evidence_chef_select
  ON cannabis_control_packet_evidence FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_evidence_chef_insert ON cannabis_control_packet_evidence;
CREATE POLICY ccp_evidence_chef_insert
  ON cannabis_control_packet_evidence FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS ccp_evidence_chef_delete ON cannabis_control_packet_evidence;
CREATE POLICY ccp_evidence_chef_delete
  ON cannabis_control_packet_evidence FOR DELETE
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- 8) Private storage bucket for reconciliation photo evidence
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cannabis-control-packets',
  'cannabis-control-packets',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path format:
-- cannabis-control-packets/{tenant_id}/{event_id}/{snapshot_id}/{evidence_id}.{ext}

DROP POLICY IF EXISTS ccp_storage_chef_insert ON storage.objects;
CREATE POLICY ccp_storage_chef_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cannabis-control-packets'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);

DROP POLICY IF EXISTS ccp_storage_chef_select ON storage.objects;
CREATE POLICY ccp_storage_chef_select
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cannabis-control-packets'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);

DROP POLICY IF EXISTS ccp_storage_chef_delete ON storage.objects;
CREATE POLICY ccp_storage_chef_delete
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cannabis-control-packets'
  AND get_current_user_role() = 'chef'
  AND split_part(name, '/', 1) = get_current_tenant_id()::text
);
