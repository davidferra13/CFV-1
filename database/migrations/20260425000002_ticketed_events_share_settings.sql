-- Fix: Create event_share_settings table for ticketed events.
-- Original migration (20260416000004) tried to ALTER a table that was never created.
-- event_shares = client-created RSVP share links (requires client_id).
-- event_share_settings = chef-created ticketing config (no client needed).
-- All code in lib/tickets/*.ts already queries event_share_settings.

-- 1. Chef-owned public event page + ticketing configuration
CREATE TABLE IF NOT EXISTS event_share_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  share_token     TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  tickets_enabled BOOLEAN NOT NULL DEFAULT false,
  show_menu       BOOLEAN NOT NULL DEFAULT true,
  show_date       BOOLEAN NOT NULL DEFAULT true,
  show_location   BOOLEAN NOT NULL DEFAULT true,
  show_chef_name  BOOLEAN NOT NULL DEFAULT true,
  show_guest_list BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_ess_event ON event_share_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_ess_tenant ON event_share_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ess_token ON event_share_settings(share_token);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_event_share_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_event_share_settings_updated_at
      BEFORE UPDATE ON event_share_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2. Allow ticket-originated guests (no RSVP share link)
ALTER TABLE event_guests ALTER COLUMN event_share_id DROP NOT NULL;

-- 3. Co-host flag for hub circle members
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS is_co_host BOOLEAN NOT NULL DEFAULT false;
