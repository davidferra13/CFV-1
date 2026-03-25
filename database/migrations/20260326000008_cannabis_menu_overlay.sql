-- Cannabis Menu Overlay (event-scoped)
-- Adds:
-- 1) event_cannabis_settings (event-level cannabis enablement mirror)
-- 2) event_cannabis_course_config (per-course infusion planning overlay)
-- 3) snapshot_json on cannabis_control_packet_snapshots for immutable archival payloads

-- ============================================================================
-- 1) Event-level cannabis settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_cannabis_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  cannabis_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_cannabis_settings_tenant_event
  ON event_cannabis_settings(tenant_id, event_id);

DROP TRIGGER IF EXISTS set_event_cannabis_settings_updated_at ON event_cannabis_settings;
CREATE TRIGGER set_event_cannabis_settings_updated_at
  BEFORE UPDATE ON event_cannabis_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION validate_event_cannabis_settings()
RETURNS TRIGGER AS $$
DECLARE
  ev_tenant UUID;
BEGIN
  SELECT tenant_id
  INTO ev_tenant
  FROM events
  WHERE id = NEW.event_id;

  IF ev_tenant IS NULL THEN
    RAISE EXCEPTION 'Cannabis settings event does not exist';
  END IF;

  IF ev_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannabis settings tenant mismatch for event';
  END IF;

  IF NEW.cannabis_enabled THEN
    NEW.enabled_at := COALESCE(NEW.enabled_at, now());
  ELSE
    NEW.enabled_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_event_cannabis_settings ON event_cannabis_settings;
CREATE TRIGGER trg_validate_event_cannabis_settings
  BEFORE INSERT OR UPDATE ON event_cannabis_settings
  FOR EACH ROW EXECUTE FUNCTION validate_event_cannabis_settings();

CREATE OR REPLACE FUNCTION sync_event_cannabis_settings_from_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO event_cannabis_settings (
    event_id,
    tenant_id,
    cannabis_enabled,
    enabled_at
  )
  VALUES (
    NEW.id,
    NEW.tenant_id,
    COALESCE(NEW.cannabis_preference, false),
    CASE WHEN COALESCE(NEW.cannabis_preference, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (event_id)
  DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        cannabis_enabled = EXCLUDED.cannabis_enabled,
        enabled_at = CASE
          WHEN EXCLUDED.cannabis_enabled THEN COALESCE(event_cannabis_settings.enabled_at, now())
          ELSE NULL
        END,
        updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_event_cannabis_settings_on_events ON events;
CREATE TRIGGER trg_sync_event_cannabis_settings_on_events
  AFTER INSERT OR UPDATE OF tenant_id, cannabis_preference
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_cannabis_settings_from_events();

INSERT INTO event_cannabis_settings (
  event_id,
  tenant_id,
  cannabis_enabled,
  enabled_at
)
SELECT
  e.id,
  e.tenant_id,
  COALESCE(e.cannabis_preference, false),
  CASE WHEN COALESCE(e.cannabis_preference, false) THEN now() ELSE NULL END
FROM events e
ON CONFLICT (event_id)
DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      cannabis_enabled = EXCLUDED.cannabis_enabled,
      enabled_at = CASE
        WHEN EXCLUDED.cannabis_enabled THEN COALESCE(event_cannabis_settings.enabled_at, now())
        ELSE NULL
      END,
      updated_at = now();

ALTER TABLE event_cannabis_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_cannabis_settings_chef_select ON event_cannabis_settings;
CREATE POLICY event_cannabis_settings_chef_select
  ON event_cannabis_settings FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS event_cannabis_settings_chef_insert ON event_cannabis_settings;
CREATE POLICY event_cannabis_settings_chef_insert
  ON event_cannabis_settings FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS event_cannabis_settings_chef_update ON event_cannabis_settings;
CREATE POLICY event_cannabis_settings_chef_update
  ON event_cannabis_settings FOR UPDATE
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- 2) Event-level per-course cannabis overlay
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_cannabis_course_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  course_index INTEGER NOT NULL CHECK (course_index >= 1),
  infusion_enabled BOOLEAN NOT NULL DEFAULT false,
  planned_mg_per_guest NUMERIC(10,3),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT event_cannabis_course_config_event_course_unique UNIQUE (event_id, course_index),
  CONSTRAINT event_cannabis_course_config_planned_mg_nonnegative
    CHECK (planned_mg_per_guest IS NULL OR planned_mg_per_guest >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_cannabis_course_config_tenant_event
  ON event_cannabis_course_config(tenant_id, event_id, course_index);

CREATE INDEX IF NOT EXISTS idx_event_cannabis_course_config_event_active
  ON event_cannabis_course_config(event_id, is_active, course_index);

DROP TRIGGER IF EXISTS set_event_cannabis_course_config_updated_at ON event_cannabis_course_config;
CREATE TRIGGER set_event_cannabis_course_config_updated_at
  BEFORE UPDATE ON event_cannabis_course_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION validate_event_cannabis_course_config()
RETURNS TRIGGER AS $$
DECLARE
  ev_tenant UUID;
  ev_enabled BOOLEAN;
BEGIN
  SELECT
    e.tenant_id,
    COALESCE(s.cannabis_enabled, COALESCE(e.cannabis_preference, false))
  INTO ev_tenant, ev_enabled
  FROM events e
  LEFT JOIN event_cannabis_settings s ON s.event_id = e.id
  WHERE e.id = NEW.event_id;

  IF ev_tenant IS NULL THEN
    RAISE EXCEPTION 'Cannabis course config event does not exist';
  END IF;

  IF ev_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannabis course config tenant mismatch for event';
  END IF;

  IF ev_enabled = false AND NEW.is_active THEN
    RAISE EXCEPTION 'Active cannabis course config requires a cannabis-enabled event';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_event_cannabis_course_config ON event_cannabis_course_config;
CREATE TRIGGER trg_validate_event_cannabis_course_config
  BEFORE INSERT OR UPDATE ON event_cannabis_course_config
  FOR EACH ROW EXECUTE FUNCTION validate_event_cannabis_course_config();

CREATE OR REPLACE FUNCTION sync_event_cannabis_course_config_from_events()
RETURNS TRIGGER AS $$
DECLARE
  safe_course_count INTEGER;
BEGIN
  safe_course_count := GREATEST(COALESCE(NEW.course_count, 1), 1);

  IF COALESCE(NEW.cannabis_preference, false) = false THEN
    UPDATE event_cannabis_course_config
    SET
      is_active = false,
      archived_at = COALESCE(archived_at, now()),
      tenant_id = NEW.tenant_id,
      updated_at = now()
    WHERE event_id = NEW.id
      AND is_active = true;

    RETURN NEW;
  END IF;

  INSERT INTO event_cannabis_course_config (
    event_id,
    tenant_id,
    course_index,
    is_active,
    archived_at
  )
  SELECT
    NEW.id,
    NEW.tenant_id,
    gs.course_index,
    true,
    NULL
  FROM generate_series(1, safe_course_count) AS gs(course_index)
  ON CONFLICT (event_id, course_index)
  DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        is_active = true,
        archived_at = NULL,
        updated_at = now();

  UPDATE event_cannabis_course_config
  SET
    is_active = false,
    archived_at = COALESCE(archived_at, now()),
    tenant_id = NEW.tenant_id,
    updated_at = now()
  WHERE event_id = NEW.id
    AND course_index > safe_course_count
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_event_cannabis_course_config_on_events ON events;
CREATE TRIGGER trg_sync_event_cannabis_course_config_on_events
  AFTER INSERT OR UPDATE OF tenant_id, cannabis_preference, course_count, menu_id
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_cannabis_course_config_from_events();

INSERT INTO event_cannabis_course_config (
  event_id,
  tenant_id,
  course_index,
  is_active,
  archived_at
)
SELECT
  e.id,
  e.tenant_id,
  gs.course_index,
  true,
  NULL
FROM events e
JOIN generate_series(1, GREATEST(COALESCE(e.course_count, 1), 1)) AS gs(course_index) ON true
WHERE COALESCE(e.cannabis_preference, false) = true
ON CONFLICT (event_id, course_index)
DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      is_active = true,
      archived_at = NULL,
      updated_at = now();

UPDATE event_cannabis_course_config cfg
SET
  is_active = false,
  archived_at = COALESCE(cfg.archived_at, now()),
  updated_at = now()
FROM events e
WHERE cfg.event_id = e.id
  AND cfg.course_index > GREATEST(COALESCE(e.course_count, 1), 1)
  AND cfg.is_active = true;

ALTER TABLE event_cannabis_course_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_cannabis_course_config_chef_select ON event_cannabis_course_config;
CREATE POLICY event_cannabis_course_config_chef_select
  ON event_cannabis_course_config FOR SELECT
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS event_cannabis_course_config_chef_insert ON event_cannabis_course_config;
CREATE POLICY event_cannabis_course_config_chef_insert
  ON event_cannabis_course_config FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS event_cannabis_course_config_chef_update ON event_cannabis_course_config;
CREATE POLICY event_cannabis_course_config_chef_update
  ON event_cannabis_course_config FOR UPDATE
  USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- 3) Snapshot JSON archival payload integration
-- ============================================================================
ALTER TABLE cannabis_control_packet_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cannabis_control_packet_snapshots
  DROP CONSTRAINT IF EXISTS cannabis_control_packet_snapshots_snapshot_json_object;

ALTER TABLE cannabis_control_packet_snapshots
  ADD CONSTRAINT cannabis_control_packet_snapshots_snapshot_json_object
  CHECK (jsonb_typeof(snapshot_json) = 'object');

UPDATE cannabis_control_packet_snapshots
SET snapshot_json = jsonb_build_object(
  'snapshot_version', version_number,
  'event', jsonb_build_object(
    'event_id', event_id,
    'tenant_id', tenant_id,
    'course_count', course_count
  ),
  'menu', NULL,
  'courses', '[]'::jsonb,
  'course_config', '[]'::jsonb,
  'guest_snapshot', COALESCE(guest_snapshot, '[]'::jsonb),
  'seating_snapshot', COALESCE(seating_snapshot, '[]'::jsonb),
  'participation_snapshot', COALESCE(participation_snapshot, '{}'::jsonb),
  'layout', jsonb_build_object(
    'layout_type', layout_type,
    'layout_meta', COALESCE(layout_meta, '{}'::jsonb)
  )
)
WHERE snapshot_json = '{}'::jsonb
   OR snapshot_json IS NULL;

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
      OR NEW.snapshot_json IS DISTINCT FROM OLD.snapshot_json
      OR NEW.course_count IS DISTINCT FROM OLD.course_count
      OR NEW.layout_type IS DISTINCT FROM OLD.layout_type
      OR NEW.layout_meta IS DISTINCT FROM OLD.layout_meta
      OR NEW.source_guest_updated_at IS DISTINCT FROM OLD.source_guest_updated_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Snapshot payload is immutable. Generate a new version instead.';
    END IF;

    IF OLD.finalization_locked = false AND NEW.finalization_locked = true THEN
      IF NEW.finalized_at IS NULL THEN
        RAISE EXCEPTION 'Finalized snapshot requires finalized_at';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
