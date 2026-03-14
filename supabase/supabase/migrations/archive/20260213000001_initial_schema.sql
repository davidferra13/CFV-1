-- ChefFlow V1 - Initial Schema Migration
-- Strictly follows CHEFFLOW_V1_SCOPE_LOCK.md
-- Multi-tenant isolation enforced at database layer

-- ============================================
-- ENUMS (Locked per scope document)
-- ============================================

CREATE TYPE user_role AS ENUM ('chef', 'client');

CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);

CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- Stripe PaymentIntent created
  'charge_succeeded',    -- Payment succeeded
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed
  'payout_created',      -- Payout to chef initiated (future)
  'payout_paid',         -- Payout completed (future)
  'adjustment'           -- Manual adjustment (requires approval)
);

-- ============================================
-- IDENTITY & TENANCY
-- ============================================

-- Chefs table (tenant owners)
CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  stripe_account_id TEXT UNIQUE, -- Stripe Connect account
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_chefs_auth_user ON chefs(auth_user_id);
CREATE INDEX idx_chefs_stripe ON chefs(stripe_account_id);

COMMENT ON TABLE chefs IS 'Tenant owners - private chef businesses';
COMMENT ON COLUMN chefs.auth_user_id IS 'Foreign key to Supabase auth.users';
COMMENT ON COLUMN chefs.stripe_account_id IS 'Stripe Connect account for payouts';

-- Clients table (customers, scoped to tenant)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  stripe_customer_id TEXT, -- Stripe customer ID
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, email) -- Email unique per tenant
);

CREATE INDEX idx_clients_auth_user ON clients(auth_user_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_stripe ON clients(stripe_customer_id);

COMMENT ON TABLE clients IS 'Customers (multi-tenant scoped by chef)';
COMMENT ON COLUMN clients.tenant_id IS 'Which chef invited this client';
COMMENT ON CONSTRAINT clients_tenant_id_email_key ON clients IS 'Email unique per tenant';

-- ============================================
-- USER ROLES (Authoritative - Single Source of Truth)
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

COMMENT ON TABLE user_roles IS 'Authoritative role assignment - NEVER infer role from client state';
COMMENT ON COLUMN user_roles.entity_id IS 'If role=chef, references chefs.id; if role=client, references clients.id';

-- ============================================
-- CLIENT INVITATIONS (For invitation-based signup)
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
COMMENT ON COLUMN client_invitations.token IS 'Single-use invitation token';
COMMENT ON COLUMN client_invitations.used_at IS 'Timestamp when invitation was accepted';

-- ============================================
-- EVENTS (Service bookings)
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Event details
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  location TEXT NOT NULL,
  notes TEXT,

  -- Pricing (ALL IN MINOR UNITS - CENTS)
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  deposit_amount_cents INTEGER NOT NULL CHECK (deposit_amount_cents >= 0),
  deposit_required BOOLEAN DEFAULT true,

  -- Lifecycle (Finite state machine)
  status event_status NOT NULL DEFAULT 'draft',
  status_changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_events_tenant ON events(tenant_id);
CREATE INDEX idx_events_client ON events(client_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

COMMENT ON TABLE events IS 'Service bookings (events) - multi-tenant scoped';
COMMENT ON COLUMN events.total_amount_cents IS 'Total price in CENTS (minor units) - NEVER use decimals';
COMMENT ON COLUMN events.deposit_amount_cents IS 'Deposit amount in CENTS (minor units)';
COMMENT ON COLUMN events.status IS 'Finite state machine - transitions enforced server-side';

-- Trigger to enforce client belongs to same tenant
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
    RAISE EXCEPTION 'Client must belong to the same tenant as the event';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_client_tenant_match
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION check_client_tenant_match();

COMMENT ON FUNCTION check_client_tenant_match IS 'Enforces that event client must belong to the same tenant';

-- ============================================
-- EVENT TRANSITIONS (Immutable audit log)
-- ============================================

CREATE TABLE event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status,
  to_status event_status NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id), -- NULL for system transitions
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB -- Store reason, IP, source, etc.
);

CREATE INDEX idx_transitions_event ON event_transitions(event_id);
CREATE INDEX idx_transitions_tenant ON event_transitions(tenant_id);
CREATE INDEX idx_transitions_date ON event_transitions(transitioned_at DESC);

COMMENT ON TABLE event_transitions IS 'Immutable audit log of all event status changes';
COMMENT ON COLUMN event_transitions.transitioned_by IS 'NULL if system (webhook), otherwise user who triggered';

-- ============================================
-- LEDGER ENTRIES (Append-only financial truth)
-- ============================================

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE RESTRICT,

  -- What happened
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL, -- Positive = credit, Negative = debit
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Context
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,

  -- Stripe reconciliation
  stripe_event_id TEXT UNIQUE, -- Idempotency key
  stripe_object_id TEXT, -- payment_intent_xxx, charge_xxx, refund_xxx
  stripe_event_type TEXT, -- payment_intent.succeeded, etc.

  -- Metadata
  description TEXT NOT NULL,
  metadata JSONB,

  -- Audit (immutable)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) -- NULL for webhook entries
);

CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_event ON ledger_entries(event_id);
CREATE INDEX idx_ledger_client ON ledger_entries(client_id);
CREATE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);

COMMENT ON TABLE ledger_entries IS 'Append-only ledger - SOURCE OF TRUTH for all financial state';
COMMENT ON COLUMN ledger_entries.amount_cents IS 'Amount in CENTS (minor units) - positive=credit, negative=debit';
COMMENT ON COLUMN ledger_entries.stripe_event_id IS 'Unique Stripe webhook event ID - prevents duplicate processing';
COMMENT ON CONSTRAINT ledger_entries_stripe_event_id_key ON ledger_entries IS 'Idempotency: one ledger entry per Stripe event';

-- ============================================
-- IMMUTABILITY TRIGGERS (Ledger & Transitions)
-- ============================================

-- Prevent UPDATE/DELETE on ledger_entries
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Create a new adjustment entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- Prevent UPDATE/DELETE on event_transitions
CREATE OR REPLACE FUNCTION prevent_transition_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Event transitions are immutable. They form an audit trail.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transitions_immutable_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();

CREATE TRIGGER transitions_immutable_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();

COMMENT ON FUNCTION prevent_ledger_modification IS 'Enforces System Law #3: Ledger entries are immutable';
COMMENT ON FUNCTION prevent_transition_modification IS 'Enforces System Law #4: Event transitions are immutable';

-- ============================================
-- DERIVED VIEWS (Computed from ledger)
-- ============================================

CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) AS collected_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) >= e.total_amount_cents AS is_fully_paid,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) >= e.deposit_amount_cents AS is_deposit_paid
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, e.tenant_id, e.total_amount_cents, e.deposit_amount_cents;

COMMENT ON VIEW event_financial_summary IS 'Computed payment status - NEVER store balances directly on events table';

-- ============================================
-- MENUS (Basic V1 feature)
-- ============================================

CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person_cents INTEGER CHECK (price_per_person_cents >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_menus_tenant ON menus(tenant_id);
CREATE INDEX idx_menus_active ON menus(tenant_id, is_active) WHERE is_active = true;

COMMENT ON TABLE menus IS 'Menu templates (multi-tenant scoped)';
COMMENT ON COLUMN menus.price_per_person_cents IS 'Price per person in CENTS (minor units)';

-- Many-to-many: events <-> menus
CREATE TABLE event_menus (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  PRIMARY KEY (event_id, menu_id)
);

CREATE INDEX idx_event_menus_event ON event_menus(event_id);
CREATE INDEX idx_event_menus_menu ON event_menus(menu_id);

COMMENT ON TABLE event_menus IS 'Many-to-many relationship: events can have multiple menus';

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chefs_updated_at
BEFORE UPDATE ON chefs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER menus_updated_at
BEFORE UPDATE ON menus
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-updates updated_at timestamp on table modifications';
