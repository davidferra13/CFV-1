-- ============================================
-- LAYER 7: CHEF FRIENDS NETWORK
-- ============================================
-- Adds cross-tenant chef-to-chef connections.
-- Chefs can opt into network discovery, search
-- for other chefs by name, and send friend requests.
--
-- Privacy: network_discoverable defaults to FALSE,
-- so existing chefs are hidden until they opt in.
-- ============================================

-- ─── New Enum ─────────────────────────────────
CREATE TYPE chef_connection_status AS ENUM (
  'pending',    -- Request sent, waiting for response
  'accepted',   -- Both chefs connected
  'declined'    -- Request declined (can re-request later)
);

-- ─── Profile Columns on chefs ─────────────────
-- These are nullable and optional - business_name remains the primary identifier
ALTER TABLE chefs ADD COLUMN display_name TEXT;
ALTER TABLE chefs ADD COLUMN bio TEXT;
ALTER TABLE chefs ADD COLUMN profile_image_url TEXT;

COMMENT ON COLUMN chefs.display_name IS 'Public display name for chef network (defaults to business_name if NULL)';
COMMENT ON COLUMN chefs.bio IS 'Short bio shown in chef network directory';
COMMENT ON COLUMN chefs.profile_image_url IS 'Profile image URL for chef network directory';

-- ─── Discoverability Toggle on chef_preferences ──
ALTER TABLE chef_preferences
  ADD COLUMN network_discoverable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN chef_preferences.network_discoverable IS 'When true, this chef appears in network search results. When false, completely hidden from discovery.';

-- ─── Chef Connections Table ───────────────────
CREATE TABLE chef_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The chef who sent the connection request
  requester_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  -- The chef who received the connection request
  addressee_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Connection state
  status chef_connection_status NOT NULL DEFAULT 'pending',

  -- Optional message included with the request
  request_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,

  -- No self-connections
  CONSTRAINT no_self_connection CHECK (requester_id != addressee_id),
  -- One connection per pair (direction matters for requester/addressee)
  CONSTRAINT unique_connection UNIQUE (requester_id, addressee_id)
);

COMMENT ON TABLE chef_connections IS 'Cross-tenant chef-to-chef connections. NOT scoped to a single tenant - spans across tenants by design.';
COMMENT ON COLUMN chef_connections.requester_id IS 'The chef who initiated the connection request';
COMMENT ON COLUMN chef_connections.addressee_id IS 'The chef who received the connection request';
COMMENT ON COLUMN chef_connections.request_message IS 'Optional personal message sent with the request';

-- ─── Indexes ──────────────────────────────────
CREATE INDEX idx_chef_connections_requester ON chef_connections(requester_id);
CREATE INDEX idx_chef_connections_addressee ON chef_connections(addressee_id);
CREATE INDEX idx_chef_connections_status ON chef_connections(status);

-- Partial indexes for the most common query: "my accepted friends"
CREATE INDEX idx_chef_connections_requester_accepted
  ON chef_connections(requester_id) WHERE status = 'accepted';
CREATE INDEX idx_chef_connections_addressee_accepted
  ON chef_connections(addressee_id) WHERE status = 'accepted';

-- ─── Auto-update updated_at Trigger ───────────
-- Reuses the update_updated_at_column() function from Layer 1
CREATE TRIGGER chef_connections_updated_at
  BEFORE UPDATE ON chef_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Helper Function ──────────────────────────
CREATE OR REPLACE FUNCTION are_chefs_connected(chef_a UUID, chef_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chef_connections
    WHERE status = 'accepted'
    AND (
      (requester_id = chef_a AND addressee_id = chef_b)
      OR
      (requester_id = chef_b AND addressee_id = chef_a)
    )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION are_chefs_connected IS 'Returns true if two chefs have an accepted connection. Works regardless of who sent the original request.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_connections ENABLE ROW LEVEL SECURITY;

-- Chefs can see connections they are part of (either side)
DROP POLICY IF EXISTS chef_connections_select_own ON chef_connections;
CREATE POLICY chef_connections_select_own ON chef_connections
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND (
      requester_id = get_current_tenant_id() OR
      addressee_id = get_current_tenant_id()
    )
  );

-- Chefs can create connection requests (as requester only)
DROP POLICY IF EXISTS chef_connections_insert_own ON chef_connections;
CREATE POLICY chef_connections_insert_own ON chef_connections
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    requester_id = get_current_tenant_id()
  );

-- Chefs can update connections they are part of (accept/decline/remove)
DROP POLICY IF EXISTS chef_connections_update_own ON chef_connections;
CREATE POLICY chef_connections_update_own ON chef_connections
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND (
      requester_id = get_current_tenant_id() OR
      addressee_id = get_current_tenant_id()
    )
  );

COMMENT ON POLICY chef_connections_select_own ON chef_connections IS 'Chefs see connections where they are requester or addressee';
COMMENT ON POLICY chef_connections_insert_own ON chef_connections IS 'Chefs can only create requests as themselves (requester)';
COMMENT ON POLICY chef_connections_update_own ON chef_connections IS 'Chefs can update connections they participate in (accept/decline)';

-- ─── Cross-tenant discovery policy on chefs ───
-- Allows chefs to see limited profile info of OTHER discoverable chefs
-- (The existing chefs_select policy only allows self-read)
DROP POLICY IF EXISTS chefs_network_discovery ON chefs;
CREATE POLICY chefs_network_discovery ON chefs
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    EXISTS (
      SELECT 1 FROM chef_preferences
      WHERE chef_preferences.chef_id = chefs.id
      AND chef_preferences.network_discoverable = true
    )
  );

COMMENT ON POLICY chefs_network_discovery ON chefs IS 'Chefs can see profiles of other chefs who have opted into network discovery. App layer limits which fields are exposed.';

-- ─── Cross-tenant discovery on chef_preferences ──
-- Allows chefs to read preferences of discoverable chefs (for location info in search)
DROP POLICY IF EXISTS chef_preferences_network_check ON chef_preferences;
CREATE POLICY chef_preferences_network_check ON chef_preferences
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    network_discoverable = true
  );

COMMENT ON POLICY chef_preferences_network_check ON chef_preferences IS 'Chefs can see preferences of discoverable chefs (needed for network search location display)';
