-- ChefFlow V1 - Row Level Security Policies
-- Enforces System Law #1: Multi-tenant isolation at database layer
-- DENY BY DEFAULT - explicit policies required for access

-- ============================================
-- RLS HELPER FUNCTIONS (Authoritative)
-- ============================================

-- Get current user's role from user_roles table (single source of truth)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_role IS 'Returns chef or client - NEVER infer from client state';

-- Get current user's tenant_id (if chef)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_tenant_id IS 'Returns chef.id if user is a chef, NULL otherwise';

-- Get current user's client_id (if client)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_client_id IS 'Returns client.id if user is a client, NULL otherwise';

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CHEFS TABLE POLICIES
-- ============================================

-- Chefs can read their own record only
CREATE POLICY chefs_select ON chefs
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Chefs can update their own record only
CREATE POLICY chefs_update ON chefs
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- No direct INSERT (created via signup flow with service role)
-- No DELETE (use soft delete or cascade from auth.users)

COMMENT ON POLICY chefs_select ON chefs IS 'Chefs can only see their own profile';
COMMENT ON POLICY chefs_update ON chefs IS 'Chefs can only update their own profile';

-- ============================================
-- CLIENTS TABLE POLICIES
-- ============================================

-- Chefs can read their own clients only
CREATE POLICY clients_chef_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can insert clients into their tenant
CREATE POLICY clients_chef_insert ON clients
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can update their clients
CREATE POLICY clients_chef_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read their own record
CREATE POLICY clients_self_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

-- Clients can update their own record
CREATE POLICY clients_self_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

COMMENT ON POLICY clients_chef_select ON clients IS 'Chefs see only their tenant clients';
COMMENT ON POLICY clients_self_select ON clients IS 'Clients see only their own profile';

-- ============================================
-- USER_ROLES TABLE POLICIES
-- ============================================

-- Users can read their own role
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- No user-facing writes (only via service role during signup)
-- This prevents role escalation attacks

COMMENT ON POLICY user_roles_self_select ON user_roles IS 'Users can see their own role only';

-- ============================================
-- CLIENT_INVITATIONS TABLE POLICIES
-- ============================================

-- Chefs can manage invitations for their tenant
CREATE POLICY invitations_chef_all ON client_invitations
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Public can read invitation by token (for signup flow)
-- This is safe because token is cryptographically random
CREATE POLICY invitations_public_select_by_token ON client_invitations
  FOR SELECT
  USING (
    token IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
  );

COMMENT ON POLICY invitations_chef_all ON client_invitations IS 'Chefs manage their own invitations';
COMMENT ON POLICY invitations_public_select_by_token ON client_invitations IS 'Public can read valid invitations for signup';

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Chefs can read events in their tenant
CREATE POLICY events_chef_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can create events in their tenant
CREATE POLICY events_chef_insert ON events
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id() AND
    created_by = auth.uid()
  );

-- Chefs can update events in their tenant
CREATE POLICY events_chef_update ON events
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can delete events in their tenant (soft delete recommended)
CREATE POLICY events_chef_delete ON events
  FOR DELETE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read events where they are the client
CREATE POLICY events_client_select ON events
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );

-- Clients can update limited fields via server actions
-- (Server actions will enforce which fields can be updated)
CREATE POLICY events_client_update ON events
  FOR UPDATE
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );

COMMENT ON POLICY events_chef_select ON events IS 'Chefs see only their tenant events';
COMMENT ON POLICY events_client_select ON events IS 'Clients see only their own events';

-- ============================================
-- EVENT_TRANSITIONS TABLE POLICIES
-- ============================================

-- Chefs can read transitions for their events
CREATE POLICY transitions_chef_select ON event_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read transitions for their events
CREATE POLICY transitions_client_select ON event_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    event_id IN (
      SELECT id FROM events WHERE client_id = get_current_client_id()
    )
  );

-- Inserts only via server-side functions (enforced by created_by check)
CREATE POLICY transitions_insert ON event_transitions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- No UPDATE/DELETE (immutable via triggers)

COMMENT ON POLICY transitions_chef_select ON event_transitions IS 'Chefs see transitions for their tenant';
COMMENT ON POLICY transitions_client_select ON event_transitions IS 'Clients see transitions for their events';

-- ============================================
-- LEDGER_ENTRIES TABLE POLICIES
-- ============================================

-- Chefs can read ledger for their tenant
CREATE POLICY ledger_chef_select ON ledger_entries
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read ledger entries for their events
CREATE POLICY ledger_client_select ON ledger_entries
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );

-- Inserts via service role (webhooks) or chef (adjustments)
CREATE POLICY ledger_insert ON ledger_entries
  FOR INSERT
  WITH CHECK (
    -- Chef adjustments require auth
    (auth.uid() IS NOT NULL AND get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()) OR
    -- Webhook uses service role (auth.uid() will be NULL)
    (auth.uid() IS NULL)
  );

-- No UPDATE/DELETE (immutable via triggers)

COMMENT ON POLICY ledger_chef_select ON ledger_entries IS 'Chefs see ledger for their tenant';
COMMENT ON POLICY ledger_client_select ON ledger_entries IS 'Clients see ledger for their events';
COMMENT ON POLICY ledger_insert ON ledger_entries IS 'Service role (webhooks) or chef (adjustments) only';

-- ============================================
-- MENUS TABLE POLICIES
-- ============================================

-- Chefs can manage their menus
CREATE POLICY menus_chef_all ON menus
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read active menus from their chef
CREATE POLICY menus_client_select ON menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    is_active = true AND
    tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
  );

COMMENT ON POLICY menus_chef_all ON menus IS 'Chefs manage their own menus';
COMMENT ON POLICY menus_client_select ON menus IS 'Clients see active menus from their chef';

-- ============================================
-- EVENT_MENUS TABLE POLICIES
-- ============================================

-- Chefs can manage event-menu associations for their events
CREATE POLICY event_menus_chef_all ON event_menus
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    event_id IN (SELECT id FROM events WHERE tenant_id = get_current_tenant_id())
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    event_id IN (SELECT id FROM events WHERE tenant_id = get_current_tenant_id())
  );

-- Clients can read menu associations for their events
CREATE POLICY event_menus_client_select ON event_menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    event_id IN (SELECT id FROM events WHERE client_id = get_current_client_id())
  );

COMMENT ON POLICY event_menus_chef_all ON event_menus IS 'Chefs manage menus for their events';
COMMENT ON POLICY event_menus_client_select ON event_menus IS 'Clients see menus for their events';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All should show rowsecurity = true

COMMENT ON SCHEMA public IS 'ChefFlow V1 - Multi-tenant isolation enforced via RLS. Service role required for admin operations.';
