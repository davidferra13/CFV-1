-- ============================================
-- ChefFlow V1 - Layer 1: Foundation
-- Multi-tenant identity, auth, and client relationship system
-- Aligns with Master Document Part 10, Part 16
-- NO Stripe fields, NO events, NO payments, NO menus
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Core roles
CREATE TYPE user_role AS ENUM ('chef', 'client');

-- Client lifecycle status
CREATE TYPE client_status AS ENUM (
  'active',        -- Currently engaged
  'dormant',       -- No recent activity
  'repeat_ready',  -- Ready for rebooking
  'vip'            -- High-value repeat client
);

-- How client found the chef
CREATE TYPE referral_source AS ENUM (
  'take_a_chef',
  'instagram',
  'referral',
  'website',
  'phone',
  'email',
  'other'
);

-- Preferred contact method
CREATE TYPE contact_method AS ENUM (
  'phone',
  'email',
  'text',
  'instagram'
);

-- Spice tolerance level
CREATE TYPE spice_tolerance AS ENUM (
  'none',
  'mild',
  'medium',
  'hot',
  'very_hot'
);

-- ============================================
-- CHEFS (Tenant Owners)
-- ============================================

CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chefs_auth_user ON chefs(auth_user_id);

COMMENT ON TABLE chefs IS 'Tenant owners - private chef businesses (multi-tenant root). Chef records are never deleted, only cascade-deleted if auth.users is deleted.';
COMMENT ON COLUMN chefs.auth_user_id IS 'Foreign key to Supabase auth.users';

-- ============================================
-- CLIENTS (Full Client Relationship System)
-- Per Master Document Part 10
-- ============================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact_method contact_method,
  referral_source referral_source,
  referral_source_detail TEXT, -- Name of referrer or specific source

  -- Household
  partner_name TEXT,
  children TEXT[], -- Array of children names
  regular_guests JSONB DEFAULT '[]'::jsonb, -- [{name, relationship, notes}]

  -- Preferences
  dietary_restrictions TEXT[],
  allergies TEXT[], -- NUT ALLERGY flagged prominently
  dislikes TEXT[],
  spice_tolerance spice_tolerance,
  favorite_cuisines TEXT[],
  favorite_dishes TEXT[],
  wine_beverage_preferences TEXT,

  -- Site notes (client's home/location details)
  address TEXT,
  parking_instructions TEXT,
  access_instructions TEXT, -- "enter through garage"
  kitchen_size TEXT,
  kitchen_constraints TEXT,
  house_rules TEXT, -- "no shoes"
  equipment_available TEXT[], -- What they have
  equipment_must_bring TEXT[], -- What chef must bring

  -- Relationship notes (qualitative observations)
  vibe_notes TEXT, -- Tone, personality, how they interact
  payment_behavior TEXT, -- How they pay, when they pay
  tipping_pattern TEXT, -- Generous, standard, etc.
  farewell_style TEXT, -- How they say goodbye
  what_they_care_about TEXT, -- Personal interests, values
  personal_milestones JSONB DEFAULT '[]'::jsonb, -- [{type, date, description}] - birthdays, anniversaries

  -- Financial summary (computed fields - updated by triggers from future events/payments)
  lifetime_value_cents INTEGER DEFAULT 0,
  total_events_count INTEGER DEFAULT 0,
  average_spend_cents INTEGER DEFAULT 0,

  -- Loyalty (placeholder for future loyalty program)
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier TEXT, -- e.g., 'bronze', 'silver', 'gold', 'platinum'

  -- Status
  status client_status NOT NULL DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint: email unique per tenant
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_clients_auth_user ON clients(auth_user_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_tenant_status ON clients(tenant_id, status);

COMMENT ON TABLE clients IS 'Complete client relationship records - identity, household, preferences, site notes, relationship intelligence (Part 10). IMPORTANT: Client records are NEVER hard-deleted. To remove a client, set status to "dormant". Deletion is only via CASCADE if auth.users or chefs is deleted.';
COMMENT ON COLUMN clients.auth_user_id IS 'Nullable - client can exist before they have an account';
COMMENT ON COLUMN clients.tenant_id IS 'Which chef owns this client (multi-tenant scoping)';
COMMENT ON COLUMN clients.regular_guests IS 'Array of objects: [{name: "Evan", relationship: "friend", notes: "picky eater"}]';
COMMENT ON COLUMN clients.allergies IS 'CRITICAL - prominently displayed, e.g., ["nuts", "shellfish"]';
COMMENT ON COLUMN clients.personal_milestones IS 'Array of objects: [{type: "birthday", date: "1985-06-15", description: ""}]';
COMMENT ON COLUMN clients.lifetime_value_cents IS 'Total revenue from this client (computed from events/payments)';
COMMENT ON COLUMN clients.total_events_count IS 'Number of events cooked for this client (computed)';
COMMENT ON COLUMN clients.average_spend_cents IS 'Average spend per event (computed)';
COMMENT ON CONSTRAINT clients_tenant_id_email_key ON clients IS 'Email unique per tenant (same email can exist for different chefs)';

-- ============================================
-- USER ROLES (Authoritative Role Assignment)
-- ============================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  entity_id UUID NOT NULL, -- References chefs.id OR clients.id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
CREATE INDEX idx_user_roles_entity ON user_roles(entity_id);

COMMENT ON TABLE user_roles IS 'Authoritative role assignment - single source of truth for user roles';
COMMENT ON COLUMN user_roles.entity_id IS 'If role=chef, references chefs.id; if role=client, references clients.id';

-- ============================================
-- CLIENT INVITATIONS (Invitation-based signup)
-- ============================================

CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_invitations_tenant ON client_invitations(tenant_id);
CREATE INDEX idx_invitations_token ON client_invitations(token);
CREATE INDEX idx_invitations_email ON client_invitations(tenant_id, email);

COMMENT ON TABLE client_invitations IS 'Client signup invitations sent by chefs';
COMMENT ON COLUMN client_invitations.token IS 'Single-use cryptographically random token';
COMMENT ON COLUMN client_invitations.used_at IS 'Timestamp when invitation was accepted (NULL = unused)';

-- ============================================
-- AUDIT LOG (General Purpose)
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE, -- Nullable for chef mutations
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES auth.users(id), -- Nullable for system changes
  changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  before_values JSONB,
  after_values JSONB,
  change_summary TEXT -- Human-readable description of what changed
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at DESC);
CREATE INDEX idx_audit_changed_by ON audit_log(changed_by);

COMMENT ON TABLE audit_log IS 'General-purpose audit trail for all mutations (who changed what, when, before/after)';
COMMENT ON COLUMN audit_log.tenant_id IS 'Nullable - NULL for chef record mutations, populated for tenant-scoped records';
COMMENT ON COLUMN audit_log.before_values IS 'JSONB snapshot of record before change (NULL for INSERT)';
COMMENT ON COLUMN audit_log.after_values IS 'JSONB snapshot of record after change (NULL for DELETE)';

-- ============================================
-- HELPER FUNCTIONS (Role Resolution)
-- ============================================

-- Get current user's role from user_roles table (single source of truth)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_role IS 'Returns chef or client - authoritative role from user_roles table';

-- Get current user's tenant_id (if chef)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_tenant_id IS 'Returns chefs.id if user is a chef, NULL otherwise';

-- Get current user's client_id (if client)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_current_client_id IS 'Returns clients.id if user is a client, NULL otherwise';

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-updates updated_at timestamp on table modifications';

-- Enforce client belongs to same tenant (for future event/relationship checks)
CREATE OR REPLACE FUNCTION check_client_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  client_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO client_tenant_id
  FROM clients
  WHERE id = NEW.client_id;

  IF client_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Client does not exist';
  END IF;

  IF client_tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Client must belong to the same tenant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_client_tenant_match IS 'Enforces tenant isolation - ensures client belongs to same tenant (used by future event tables)';

-- General audit logging function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  change_desc TEXT;
BEGIN
  -- Determine tenant_id if available
  IF TG_TABLE_NAME = 'chefs' THEN
    tenant_id_value := NULL; -- Chef mutations have no tenant
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF TG_OP = 'DELETE' THEN
      tenant_id_value := OLD.tenant_id;
    ELSE
      tenant_id_value := NEW.tenant_id;
    END IF;
  ELSE
    tenant_id_value := NULL; -- Default
  END IF;

  -- Generate human-readable change summary
  IF TG_OP = 'INSERT' THEN
    change_desc := 'Created new ' || TG_TABLE_NAME || ' record';
  ELSIF TG_OP = 'UPDATE' THEN
    change_desc := 'Updated ' || TG_TABLE_NAME || ' record';
  ELSIF TG_OP = 'DELETE' THEN
    change_desc := 'Deleted ' || TG_TABLE_NAME || ' record';
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    tenant_id,
    table_name,
    record_id,
    action,
    changed_by,
    changed_at,
    before_values,
    after_values,
    change_summary
  ) VALUES (
    tenant_id_value,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    now(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    change_desc
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit IS 'Logs all mutations to audit_log table with before/after snapshots';

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE TRIGGER chefs_updated_at
BEFORE UPDATE ON chefs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging
CREATE TRIGGER chefs_audit_log
AFTER INSERT OR UPDATE OR DELETE ON chefs
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER clients_audit_log
AFTER INSERT OR UPDATE OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CHEFS TABLE POLICIES
-- ============================================

-- Chefs can read their own record only
DROP POLICY IF EXISTS chefs_select ON chefs;
CREATE POLICY chefs_select ON chefs
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Chefs can update their own record only
DROP POLICY IF EXISTS chefs_update ON chefs;
CREATE POLICY chefs_update ON chefs
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

COMMENT ON POLICY chefs_select ON chefs IS 'Chefs can only see their own profile';
COMMENT ON POLICY chefs_update ON chefs IS 'Chefs can only update their own profile';

-- ============================================
-- CLIENTS TABLE POLICIES
-- ============================================

-- Chefs can read their own clients only
DROP POLICY IF EXISTS clients_chef_select ON clients;
CREATE POLICY clients_chef_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can insert clients into their tenant
DROP POLICY IF EXISTS clients_chef_insert ON clients;
CREATE POLICY clients_chef_insert ON clients
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can update their clients
DROP POLICY IF EXISTS clients_chef_update ON clients;
CREATE POLICY clients_chef_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Clients can read their own record
DROP POLICY IF EXISTS clients_self_select ON clients;
CREATE POLICY clients_self_select ON clients
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

-- Clients can update their own record (limited fields via app logic)
DROP POLICY IF EXISTS clients_self_update ON clients;
CREATE POLICY clients_self_update ON clients
  FOR UPDATE
  USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

-- NO DELETE POLICY: Client records are NEVER hard-deleted.
-- To remove a client, set status = 'dormant'.
-- Deletion only occurs via CASCADE when auth.users or chefs is deleted.

COMMENT ON POLICY clients_chef_select ON clients IS 'Chefs see only their tenant clients (multi-tenant isolation)';
COMMENT ON POLICY clients_self_select ON clients IS 'Clients see only their own profile';

-- ============================================
-- USER_ROLES TABLE POLICIES
-- ============================================

-- Users can read their own role
DROP POLICY IF EXISTS user_roles_self_select ON user_roles;
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- No user-facing writes (only via service role during signup)
-- This prevents role escalation attacks

COMMENT ON POLICY user_roles_self_select ON user_roles IS 'Users can see their own role only (prevents role escalation)';

-- ============================================
-- CLIENT_INVITATIONS TABLE POLICIES
-- ============================================

-- Chefs can manage invitations for their tenant
DROP POLICY IF EXISTS invitations_chef_all ON client_invitations;
CREATE POLICY invitations_chef_all ON client_invitations
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Public can read invitation by token (for signup flow)
-- This policy allows SELECT on valid invitations, but the app layer MUST
-- always query with a specific token value in the WHERE clause to prevent enumeration.
-- Example: SELECT * FROM client_invitations WHERE token = 'xyz123abc...'
-- DO NOT query without filtering by token - this would expose all valid invitations.
DROP POLICY IF EXISTS invitations_public_select_by_token ON client_invitations;
CREATE POLICY invitations_public_select_by_token ON client_invitations
  FOR SELECT
  USING (
    token IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
  );

COMMENT ON POLICY invitations_chef_all ON client_invitations IS 'Chefs manage their own invitations';
COMMENT ON POLICY invitations_public_select_by_token ON client_invitations IS 'Public can read valid invitations for signup (token-based security). APP LAYER MUST FILTER BY SPECIFIC TOKEN VALUE - never query without WHERE token = $1 to prevent enumeration.';

-- ============================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================

-- Chefs can read audit logs for their tenant
DROP POLICY IF EXISTS audit_log_chef_select ON audit_log;
CREATE POLICY audit_log_chef_select ON audit_log
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    (tenant_id = get_current_tenant_id() OR (tenant_id IS NULL AND changed_by = auth.uid()))
  );

-- No user writes to audit_log (only via triggers)

COMMENT ON POLICY audit_log_chef_select ON audit_log IS 'Chefs can read audit logs for their tenant + their own chef-level mutations (tenant_id NULL records only visible to the chef who made the change)';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run this to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All should show rowsecurity = true

COMMENT ON SCHEMA public IS 'ChefFlow V1 Layer 1 - Foundation: Multi-tenant identity, auth, client relationship system';
