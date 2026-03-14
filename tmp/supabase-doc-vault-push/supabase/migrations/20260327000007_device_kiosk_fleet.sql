-- Device Kiosk & Fleet Provisioning
-- Enables tenant owners to provision tablets as locked-down kiosk devices.
-- Devices authenticate via API tokens (not Supabase Auth sessions).
-- Staff identify themselves via a short PIN for accountability.

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE device_type AS ENUM ('ipad', 'android', 'browser');
CREATE TYPE device_status AS ENUM ('pending_pair', 'active', 'disabled', 'revoked');
CREATE TYPE device_mode AS ENUM ('kiosk');
CREATE TYPE kiosk_flow AS ENUM ('inquiry', 'checkin', 'menu_browse', 'order');
-- Add 'kiosk' to inquiry_channel so kiosk-submitted inquiries are tracked
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'kiosk';
-- ============================================
-- TABLE 1: DEVICES (Fleet Registry)
-- ============================================

CREATE TABLE devices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  location_name         TEXT,
  device_type           device_type NOT NULL DEFAULT 'browser',
  status                device_status NOT NULL DEFAULT 'pending_pair',
  mode                  device_mode NOT NULL DEFAULT 'kiosk',
  kiosk_flow            kiosk_flow NOT NULL DEFAULT 'inquiry',

  -- Pairing (short-lived code for initial setup)
  pairing_code_hash     TEXT,
  pairing_expires_at    TIMESTAMPTZ,

  -- API token (long-lived device credential)
  token_hash            TEXT,

  -- Runtime state
  claimed_at            TIMESTAMPTZ,
  last_seen_at          TIMESTAMPTZ,
  last_ip               TEXT,
  app_version           TEXT,

  -- Configuration
  idle_timeout_seconds  INTEGER NOT NULL DEFAULT 90 CHECK (idle_timeout_seconds >= 10),
  require_staff_pin     BOOLEAN NOT NULL DEFAULT true,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_tenant ON devices(tenant_id);
CREATE INDEX idx_devices_tenant_status ON devices(tenant_id, status);
CREATE UNIQUE INDEX idx_devices_token_hash ON devices(token_hash) WHERE token_hash IS NOT NULL;
COMMENT ON TABLE devices IS 'Fleet registry of kiosk devices owned by a tenant.';
COMMENT ON COLUMN devices.token_hash IS 'SHA-256 hash of the device API token. Raw token shown once during pairing.';
COMMENT ON COLUMN devices.pairing_code_hash IS 'SHA-256 hash of the short pairing code. Expires after pairing_expires_at.';
COMMENT ON COLUMN devices.require_staff_pin IS 'When true, staff must enter a PIN before using the kiosk.';
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: DEVICE SESSIONS (Staff usage tracking)
-- ============================================

CREATE TABLE device_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  staff_member_id   UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  last_seen_at      TIMESTAMPTZ,
  user_agent        TEXT,
  ip                TEXT
);
CREATE INDEX idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX idx_device_sessions_device_status ON device_sessions(device_id, status);
COMMENT ON TABLE device_sessions IS 'Tracks individual staff sessions on kiosk devices.';
-- ============================================
-- TABLE 3: DEVICE EVENTS (Audit log)
-- ============================================

CREATE TABLE device_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id   UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  type              TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_events_device ON device_events(device_id, created_at DESC);
CREATE INDEX idx_device_events_tenant ON device_events(tenant_id, created_at DESC);
COMMENT ON TABLE device_events IS 'Audit log for kiosk device actions: paired, heartbeat, reset, submitted_inquiry, etc.';
COMMENT ON COLUMN device_events.type IS 'Event type: paired, heartbeat, reset, hard_reset, submitted_inquiry, disabled, revoked, pin_verified, pin_failed, session_ended';
-- ============================================
-- STAFF PIN COLUMN (added to existing table)
-- ============================================

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS kiosk_pin TEXT;
COMMENT ON COLUMN staff_members.kiosk_pin IS 'SHA-256 hash of the staff member kiosk PIN (4-6 digits). NULL = no PIN set.';
-- Unique PIN per tenant (so PIN lookup is unambiguous within a tenant)
CREATE UNIQUE INDEX idx_staff_pin_per_tenant
  ON staff_members(chef_id, kiosk_pin)
  WHERE kiosk_pin IS NOT NULL AND status = 'active';
-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
-- Devices: chef can CRUD their own tenant's devices
CREATE POLICY devices_chef_select ON devices
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY devices_chef_insert ON devices
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY devices_chef_update ON devices
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
CREATE POLICY devices_chef_delete ON devices
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
-- Device sessions: chef can read their own tenant's sessions
CREATE POLICY device_sessions_chef_select ON device_sessions
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND device_id IN (SELECT id FROM devices WHERE tenant_id = get_current_tenant_id())
  );
-- Device events: chef can read their own tenant's events
CREATE POLICY device_events_chef_select ON device_events
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );
-- NO public/anon policies — kiosk API routes use admin client (service role key)
-- which bypasses RLS entirely. This is intentional and matches the embed pattern.;
