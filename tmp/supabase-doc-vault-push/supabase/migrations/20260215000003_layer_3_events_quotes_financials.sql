-- ============================================
-- ChefFlow V1 - Layer 3: Events, Quotes, Financial Tracking
-- Core operational engine: events, quotes, ledger, expenses, after-action reviews
-- Aligns with Master Document Parts 13-15
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Event lifecycle (8 states - full proposal-to-completion pipeline)
CREATE TYPE event_status AS ENUM (
  'draft',        -- Event created from confirmed inquiry, not yet proposed to client
  'proposed',     -- Proposal sent to client, awaiting response
  'accepted',     -- Client accepted proposal, awaiting payment
  'paid',         -- Payment received (deposit or full), awaiting chef confirmation
  'confirmed',    -- Chef confirmed, event is officially on the calendar
  'in_progress',  -- Chef is on-site, actively executing
  'completed',    -- Service finished, on-site work done
  'cancelled'     -- Cancelled by either party (double-l spelling matches app code)
);
-- Payment status (computed from ledger, not transitioned)
CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'deposit_paid',
  'partial',
  'paid',
  'refunded'
);
-- Pricing models
CREATE TYPE pricing_model AS ENUM (
  'per_person',
  'flat_rate',
  'custom'
);
-- Service styles
CREATE TYPE event_service_style AS ENUM (
  'plated',
  'family_style',
  'buffet',
  'cocktail',
  'tasting_menu',
  'other'
);
-- Payment methods
CREATE TYPE payment_method AS ENUM (
  'cash',
  'venmo',
  'paypal',
  'zelle',
  'card',
  'check',
  'other'
);
-- Cancellation initiator
CREATE TYPE cancellation_initiator AS ENUM (
  'chef',
  'client',
  'mutual'
);
-- Quote lifecycle
CREATE TYPE quote_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);
-- Ledger entry types
CREATE TYPE ledger_entry_type AS ENUM (
  'payment',
  'deposit',
  'installment',
  'final_payment',
  'tip',
  'refund',
  'adjustment',
  'add_on',
  'credit'
);
-- Expense categories
CREATE TYPE expense_category AS ENUM (
  'groceries',
  'alcohol',
  'specialty_items',
  'gas_mileage',
  'equipment',
  'supplies',
  'other'
);
-- ============================================
-- TABLE 1: EVENTS
-- ============================================

CREATE TABLE events (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Event Details
  event_date DATE NOT NULL,
  serve_time TIME NOT NULL,
  arrival_time TIME,
  departure_time TIMESTAMPTZ,
  guest_count INTEGER NOT NULL,
  guest_count_confirmed BOOLEAN DEFAULT false NOT NULL,
  occasion TEXT,
  service_style event_service_style DEFAULT 'plated' NOT NULL,

  -- Location
  location_address TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT DEFAULT 'MA' NOT NULL,
  location_zip TEXT NOT NULL,
  location_notes TEXT,
  access_instructions TEXT,

  -- Safety & Preferences
  dietary_restrictions TEXT[] DEFAULT '{}' NOT NULL,
  allergies TEXT[] DEFAULT '{}' NOT NULL,
  cannabis_preference BOOLEAN,
  special_requests TEXT,

  -- Kitchen & Site Context
  kitchen_notes TEXT,
  site_notes TEXT,

  -- State Machine
  status event_status DEFAULT 'draft' NOT NULL,

  -- Pricing & Quote
  quoted_price_cents INTEGER,
  pricing_model pricing_model,
  pricing_snapshot JSONB,
  deposit_amount_cents INTEGER,
  pricing_notes TEXT,

  -- Payment Status (TRIGGER-ONLY - never set by application)
  payment_status payment_status DEFAULT 'unpaid' NOT NULL,
  payment_method_primary payment_method,
  tip_amount_cents INTEGER DEFAULT 0 NOT NULL,

  -- Document Readiness Flags
  grocery_list_ready BOOLEAN DEFAULT false NOT NULL,
  prep_list_ready BOOLEAN DEFAULT false NOT NULL,
  equipment_list_ready BOOLEAN DEFAULT false NOT NULL,
  packing_list_ready BOOLEAN DEFAULT false NOT NULL,
  timeline_ready BOOLEAN DEFAULT false NOT NULL,
  execution_sheet_ready BOOLEAN DEFAULT false NOT NULL,
  non_negotiables_checked BOOLEAN DEFAULT false NOT NULL,

  -- Execution Tracking
  car_packed BOOLEAN DEFAULT false NOT NULL,
  car_packed_at TIMESTAMPTZ,
  component_count_total INTEGER,

  -- Time Tracking
  shopping_started_at TIMESTAMPTZ,
  shopping_completed_at TIMESTAMPTZ,
  prep_started_at TIMESTAMPTZ,
  prep_completed_at TIMESTAMPTZ,
  travel_started_at TIMESTAMPTZ,
  travel_completed_at TIMESTAMPTZ,
  service_started_at TIMESTAMPTZ,
  service_completed_at TIMESTAMPTZ,
  reset_started_at TIMESTAMPTZ,
  reset_completed_at TIMESTAMPTZ,

  -- Leftover Tracking
  leftover_value_carried_forward_cents INTEGER DEFAULT 0,
  leftover_value_received_cents INTEGER DEFAULT 0,
  leftover_notes TEXT,

  -- Post-Event Status
  follow_up_sent BOOLEAN DEFAULT false NOT NULL,
  follow_up_sent_at TIMESTAMPTZ,
  review_link_sent BOOLEAN DEFAULT false NOT NULL,
  reset_complete BOOLEAN DEFAULT false NOT NULL,
  aar_filed BOOLEAN DEFAULT false NOT NULL,
  financially_closed BOOLEAN DEFAULT false NOT NULL,
  archived BOOLEAN DEFAULT false NOT NULL,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancellation_initiated_by cancellation_initiator,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT events_date_not_too_old CHECK (event_date >= CURRENT_DATE - INTERVAL '1 year'),
  CONSTRAINT events_guest_count_positive CHECK (guest_count > 0),
  CONSTRAINT events_guest_count_max CHECK (guest_count <= 200),
  CONSTRAINT events_price_non_negative CHECK (quoted_price_cents >= 0 OR quoted_price_cents IS NULL),
  CONSTRAINT events_deposit_non_negative CHECK (deposit_amount_cents >= 0 OR deposit_amount_cents IS NULL),
  CONSTRAINT events_deposit_lte_quoted CHECK (deposit_amount_cents <= quoted_price_cents OR deposit_amount_cents IS NULL),
  CONSTRAINT events_tip_non_negative CHECK (tip_amount_cents >= 0)
);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_inquiry_id ON events(inquiry_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_tenant_date ON events(tenant_id, event_date);
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);
COMMENT ON TABLE events IS 'The canonical event record. Events only exist once inquiry is confirmed and quote is accepted.';
COMMENT ON COLUMN events.tenant_id IS 'FK to chefs.id - tenant scoping';
COMMENT ON COLUMN events.status IS '8-state FSM: draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled';
COMMENT ON COLUMN events.payment_status IS 'CRITICAL: ONLY written by update_event_payment_status_on_ledger_insert trigger. Application must NEVER set this field directly.';
COMMENT ON COLUMN events.pricing_snapshot IS 'Frozen pricing at event creation - IMMUTABLE';
COMMENT ON COLUMN events.allergies IS 'IMMUTABLE after event creation - safety-critical data';
-- ============================================
-- TABLE 2: EVENT STATE TRANSITIONS
-- ============================================

CREATE TABLE event_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_status event_status,
  to_status event_status NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB
);
CREATE INDEX idx_event_transitions_event_id ON event_state_transitions(event_id);
CREATE INDEX idx_event_transitions_tenant_id ON event_state_transitions(tenant_id);
COMMENT ON TABLE event_state_transitions IS 'Immutable audit trail of event state changes';
COMMENT ON COLUMN event_state_transitions.from_status IS 'Nullable for initial state';
-- ============================================
-- TABLE 3: QUOTES
-- ============================================

CREATE TABLE quotes (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Quote Details
  quote_name TEXT,
  pricing_model pricing_model DEFAULT 'per_person' NOT NULL,
  price_per_person_cents INTEGER,
  guest_count_estimated INTEGER,
  total_quoted_cents INTEGER NOT NULL,
  deposit_required BOOLEAN DEFAULT false NOT NULL,
  deposit_amount_cents INTEGER,
  deposit_percentage INTEGER,
  pricing_notes TEXT,
  internal_notes TEXT,

  -- State Machine
  status quote_status DEFAULT 'draft' NOT NULL,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  expired_at TIMESTAMPTZ,
  valid_until DATE,

  -- Snapshot (frozen at acceptance)
  pricing_snapshot JSONB,
  snapshot_frozen BOOLEAN DEFAULT false NOT NULL,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT quotes_total_positive CHECK (total_quoted_cents > 0),
  CONSTRAINT quotes_deposit_non_negative CHECK (deposit_amount_cents >= 0 OR deposit_amount_cents IS NULL),
  CONSTRAINT quotes_deposit_lte_total CHECK (deposit_amount_cents <= total_quoted_cents OR deposit_amount_cents IS NULL),
  CONSTRAINT quotes_deposit_pct_valid CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100 OR deposit_percentage IS NULL),
  CONSTRAINT quotes_ppp_positive CHECK (price_per_person_cents > 0 OR price_per_person_cents IS NULL),
  CONSTRAINT quotes_guest_count_positive CHECK (guest_count_estimated > 0 OR guest_count_estimated IS NULL),
  CONSTRAINT quotes_must_link_inquiry_or_event CHECK (inquiry_id IS NOT NULL OR event_id IS NOT NULL)
);
CREATE INDEX idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX idx_quotes_inquiry_id ON quotes(inquiry_id);
CREATE INDEX idx_quotes_event_id ON quotes(event_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
COMMENT ON TABLE quotes IS 'Pricing proposals linked to inquiry and/or event';
COMMENT ON COLUMN quotes.pricing_snapshot IS 'Frozen pricing at acceptance - IMMUTABLE after status = accepted';
-- ============================================
-- TABLE 4: QUOTE STATE TRANSITIONS
-- ============================================

CREATE TABLE quote_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  from_status quote_status,
  to_status quote_status NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB
);
CREATE INDEX idx_quote_transitions_quote_id ON quote_state_transitions(quote_id);
CREATE INDEX idx_quote_transitions_tenant_id ON quote_state_transitions(tenant_id);
COMMENT ON TABLE quote_state_transitions IS 'Immutable audit trail of quote state changes';
-- ============================================
-- TABLE 5: LEDGER ENTRIES (Append-Only)
-- ============================================

CREATE TABLE ledger_entries (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ledger Entry Details
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  internal_notes TEXT,

  -- Payment Method
  payment_method payment_method NOT NULL,
  payment_card_used TEXT,
  transaction_reference TEXT,
  received_at TIMESTAMPTZ,

  -- Refund Details
  is_refund BOOLEAN DEFAULT false NOT NULL,
  refund_reason TEXT,
  refunded_entry_id UUID REFERENCES ledger_entries(id),

  -- Immutability Enforcement
  ledger_sequence BIGSERIAL NOT NULL,

  -- Audit
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ledger_amount_nonzero CHECK (amount_cents != 0),
  CONSTRAINT ledger_refund_negative CHECK ((is_refund = true AND amount_cents < 0) OR (is_refund = false AND amount_cents > 0)),
  CONSTRAINT ledger_refund_has_reason CHECK ((is_refund = true AND refund_reason IS NOT NULL) OR is_refund = false),
  CONSTRAINT ledger_refund_type_match CHECK ((entry_type = 'refund' AND is_refund = true) OR entry_type != 'refund')
);
CREATE INDEX idx_ledger_entries_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_entries_client_id ON ledger_entries(client_id);
CREATE INDEX idx_ledger_entries_event_id ON ledger_entries(event_id);
CREATE INDEX idx_ledger_entries_entry_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at);
CREATE INDEX idx_ledger_entries_ledger_sequence ON ledger_entries(ledger_sequence);
CREATE INDEX idx_ledger_entries_tenant_event ON ledger_entries(tenant_id, event_id);
COMMENT ON TABLE ledger_entries IS 'CRITICAL: Append-only financial ledger. NEVER update or delete. Only INSERT allowed.';
COMMENT ON COLUMN ledger_entries.ledger_sequence IS 'Immutable sequence number for audit ordering';
-- ============================================
-- TABLE 6: EXPENSES
-- ============================================

CREATE TABLE expenses (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Expense Details
  expense_date DATE NOT NULL,
  category expense_category NOT NULL,
  vendor_name TEXT,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,

  -- Payment Method
  payment_method payment_method NOT NULL,
  payment_card_used TEXT,

  -- Business vs Personal
  is_business BOOLEAN DEFAULT true NOT NULL,
  is_reimbursable BOOLEAN DEFAULT false NOT NULL,

  -- Receipt
  receipt_photo_url TEXT,
  receipt_uploaded BOOLEAN DEFAULT false NOT NULL,

  -- Mileage Tracking
  mileage_miles DECIMAL(8,2),
  mileage_rate_per_mile_cents INTEGER,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT expenses_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT expenses_mileage_complete CHECK (
    (category = 'gas_mileage' AND mileage_miles IS NOT NULL AND mileage_rate_per_mile_cents IS NOT NULL)
    OR category != 'gas_mileage'
  ),
  CONSTRAINT expenses_mileage_non_negative CHECK (mileage_miles >= 0 OR mileage_miles IS NULL),
  CONSTRAINT expenses_mileage_rate_positive CHECK (mileage_rate_per_mile_cents > 0 OR mileage_rate_per_mile_cents IS NULL)
);
CREATE INDEX idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX idx_expenses_event_id ON expenses(event_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, expense_date);
CREATE INDEX idx_expenses_is_business ON expenses(is_business);
COMMENT ON TABLE expenses IS 'Cost tracking per event (cost side, vs ledger_entries for revenue side)';
-- ============================================
-- TABLE 7: AFTER ACTION REVIEWS
-- ============================================

CREATE TABLE after_action_reviews (
  -- Identity & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- The Real KPIs
  calm_rating INTEGER NOT NULL CHECK (calm_rating >= 1 AND calm_rating <= 5),
  preparation_rating INTEGER NOT NULL CHECK (preparation_rating >= 1 AND preparation_rating <= 5),
  execution_rating INTEGER CHECK (execution_rating >= 1 AND execution_rating <= 5),

  -- Retrospective Questions
  could_have_done_earlier TEXT,
  forgotten_items TEXT[] DEFAULT '{}' NOT NULL,
  what_went_well TEXT,
  what_went_wrong TEXT,
  would_do_differently TEXT,

  -- Menu & Client Performance
  menu_performance_notes TEXT,
  client_behavior_notes TEXT,
  site_notes TEXT,

  -- General Notes
  general_notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_aar_event_id ON after_action_reviews(event_id);
CREATE INDEX idx_aar_tenant_id ON after_action_reviews(tenant_id);
CREATE INDEX idx_aar_calm_rating ON after_action_reviews(calm_rating);
CREATE INDEX idx_aar_preparation_rating ON after_action_reviews(preparation_rating);
COMMENT ON TABLE after_action_reviews IS 'Post-event retrospective. One per event. The real KPIs: calm_rating and preparation_rating.';
-- ============================================
-- COLUMN ADDITIONS TO LAYER 1 (clients)
-- ============================================

-- Add columns needed by Layer 3 triggers and views
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_payments_received_cents INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_event_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_event_date DATE;
-- ============================================
-- FOREIGN KEY ADDITIONS TO LAYER 2
-- ============================================

-- Add FK constraint to inquiries.converted_to_event_id (deferred from Layer 2)
ALTER TABLE inquiries
ADD CONSTRAINT fk_inquiries_converted_to_event
FOREIGN KEY (converted_to_event_id) REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX idx_inquiries_converted_to_event ON inquiries(converted_to_event_id) WHERE converted_to_event_id IS NOT NULL;
-- Add FK constraint to messages.event_id (deferred from Layer 2)
ALTER TABLE messages
ADD CONSTRAINT fk_messages_event
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
-- Note: idx_messages_event already exists from Layer 2, no need to recreate

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
CREATE TRIGGER aar_updated_at BEFORE UPDATE ON after_action_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
-- Validate event state transitions (8-state FSM)
CREATE OR REPLACE FUNCTION validate_event_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state (no-op)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate allowed transitions
  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('proposed', 'cancelled')) OR
    (OLD.status = 'proposed' AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted' AND NEW.status IN ('paid', 'cancelled')) OR
    (OLD.status = 'paid' AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled')) OR
    (OLD.status = 'completed' AND FALSE) OR  -- Terminal state, no transitions
    (OLD.status = 'cancelled' AND FALSE)      -- Terminal state, no transitions
  ) THEN
    RAISE EXCEPTION 'Invalid event transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER validate_event_state_transition_trigger
  BEFORE UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION validate_event_state_transition();
-- Freeze pricing snapshot on event creation
CREATE OR REPLACE FUNCTION freeze_event_pricing_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pricing_snapshot IS NULL AND NEW.quoted_price_cents IS NOT NULL THEN
    NEW.pricing_snapshot = jsonb_build_object(
      'quoted_price_cents', NEW.quoted_price_cents,
      'pricing_model', NEW.pricing_model::text,
      'deposit_amount_cents', NEW.deposit_amount_cents,
      'frozen_at', now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER freeze_event_pricing_snapshot_trigger
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION freeze_event_pricing_snapshot();
-- Log event state transitions
CREATE OR REPLACE FUNCTION log_event_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_state_transitions (
      event_id,
      tenant_id,
      from_status,
      to_status,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER log_event_state_transition_trigger
  AFTER UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_state_transition();
-- Validate quote state transitions
CREATE OR REPLACE FUNCTION validate_quote_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same-state (no-op)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions
  IF (OLD.status = 'draft' AND NEW.status = 'sent')
     OR (OLD.status = 'sent' AND NEW.status IN ('accepted', 'rejected', 'expired')) THEN
    RETURN NEW;
  END IF;

  -- Invalid transition
  RAISE EXCEPTION 'Invalid quote state transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER validate_quote_state_transition_trigger
  BEFORE UPDATE OF status ON quotes
  FOR EACH ROW EXECUTE FUNCTION validate_quote_state_transition();
-- Freeze quote snapshot on acceptance
CREATE OR REPLACE FUNCTION freeze_quote_snapshot_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.pricing_snapshot = jsonb_build_object(
      'total_quoted_cents', NEW.total_quoted_cents,
      'pricing_model', NEW.pricing_model::text,
      'price_per_person_cents', NEW.price_per_person_cents,
      'guest_count_estimated', NEW.guest_count_estimated,
      'deposit_amount_cents', NEW.deposit_amount_cents,
      'frozen_at', now()
    );
    NEW.snapshot_frozen = true;
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER freeze_quote_snapshot_on_acceptance_trigger
  BEFORE UPDATE OF status ON quotes
  FOR EACH ROW EXECUTE FUNCTION freeze_quote_snapshot_on_acceptance();
-- Prevent quote mutation after acceptance
CREATE OR REPLACE FUNCTION prevent_quote_mutation_after_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.snapshot_frozen = true AND OLD.status = NEW.status THEN
    -- Only status transitions allowed, no other changes
    IF (OLD.total_quoted_cents IS DISTINCT FROM NEW.total_quoted_cents
        OR OLD.pricing_model IS DISTINCT FROM NEW.pricing_model
        OR OLD.price_per_person_cents IS DISTINCT FROM NEW.price_per_person_cents
        OR OLD.deposit_amount_cents IS DISTINCT FROM NEW.deposit_amount_cents) THEN
      RAISE EXCEPTION 'Cannot modify frozen quote after acceptance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prevent_quote_mutation_after_acceptance_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION prevent_quote_mutation_after_acceptance();
-- Log quote state transitions
CREATE OR REPLACE FUNCTION log_quote_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO quote_state_transitions (
      quote_id,
      tenant_id,
      from_status,
      to_status,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER log_quote_state_transition_trigger
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW EXECUTE FUNCTION log_quote_state_transition();
-- Prevent ledger mutation (append-only enforcement)
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Only INSERT allowed.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prevent_ledger_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER prevent_ledger_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
-- Prevent state transition mutation
CREATE OR REPLACE FUNCTION prevent_transition_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'State transitions are immutable audit records';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prevent_event_transition_update
  BEFORE UPDATE ON event_state_transitions
  FOR EACH ROW EXECUTE FUNCTION prevent_transition_mutation();
CREATE TRIGGER prevent_event_transition_delete
  BEFORE DELETE ON event_state_transitions
  FOR EACH ROW EXECUTE FUNCTION prevent_transition_mutation();
CREATE TRIGGER prevent_quote_transition_update
  BEFORE UPDATE ON quote_state_transitions
  FOR EACH ROW EXECUTE FUNCTION prevent_transition_mutation();
CREATE TRIGGER prevent_quote_transition_delete
  BEFORE DELETE ON quote_state_transitions
  FOR EACH ROW EXECUTE FUNCTION prevent_transition_mutation();
-- Update client lifetime value on ledger insert
CREATE OR REPLACE FUNCTION update_client_lifetime_value_on_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients
  SET
    lifetime_value_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM ledger_entries
      WHERE client_id = NEW.client_id AND is_refund = false
    ),
    total_payments_received_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM ledger_entries
      WHERE client_id = NEW.client_id
    )
  WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_client_lifetime_value_trigger
  AFTER INSERT ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_client_lifetime_value_on_ledger_insert();
-- Update event payment status on ledger insert
CREATE OR REPLACE FUNCTION update_event_payment_status_on_ledger_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid INTEGER;
  v_quoted INTEGER;
  v_deposit INTEGER;
  v_has_refund BOOLEAN;
  v_new_status payment_status;
BEGIN
  -- Only process if linked to an event
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get event details
  SELECT quoted_price_cents, deposit_amount_cents
  INTO v_quoted, v_deposit
  FROM events
  WHERE id = NEW.event_id;

  -- Calculate total paid (excluding refunds)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_paid
  FROM ledger_entries
  WHERE event_id = NEW.event_id AND is_refund = false;

  -- Check if any refunds exist
  SELECT EXISTS(
    SELECT 1 FROM ledger_entries
    WHERE event_id = NEW.event_id AND is_refund = true
  ) INTO v_has_refund;

  -- Determine payment status
  IF v_has_refund THEN
    v_new_status = 'refunded';
  ELSIF v_total_paid = 0 THEN
    v_new_status = 'unpaid';
  ELSIF v_deposit IS NOT NULL AND v_total_paid >= v_deposit AND v_total_paid < v_quoted THEN
    v_new_status = 'partial';
  ELSIF v_total_paid >= v_quoted THEN
    v_new_status = 'paid';
  ELSIF v_total_paid > 0 AND v_total_paid < COALESCE(v_deposit, v_quoted) THEN
    v_new_status = 'deposit_paid';
  ELSE
    v_new_status = 'partial';
  END IF;

  -- Update event
  UPDATE events
  SET payment_status = v_new_status
  WHERE id = NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_event_payment_status_trigger
  AFTER INSERT ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_event_payment_status_on_ledger_insert();
-- Update client stats on event completion
CREATE OR REPLACE FUNCTION update_client_stats_on_event_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE clients
    SET
      total_events_count = total_events_count + 1,
      last_event_date = NEW.event_date,
      first_event_date = COALESCE(first_event_date, NEW.event_date)
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_client_stats_on_event_completion_trigger
  AFTER UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION update_client_stats_on_event_completion();
-- Mark event AAR filed on insert
CREATE OR REPLACE FUNCTION mark_event_aar_filed_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET aar_filed = true
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER mark_event_aar_filed_trigger
  AFTER INSERT ON after_action_reviews
  FOR EACH ROW EXECUTE FUNCTION mark_event_aar_filed_on_insert();
-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE after_action_reviews ENABLE ROW LEVEL SECURITY;
-- EVENTS policies
CREATE POLICY events_tenant_isolation_select ON events
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY events_tenant_isolation_insert ON events
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY events_tenant_isolation_update ON events
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- No DELETE policy - events are never hard-deleted

-- EVENT_STATE_TRANSITIONS policies
CREATE POLICY event_transitions_tenant_isolation_select ON event_state_transitions
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY event_transitions_tenant_isolation_insert ON event_state_transitions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
-- No UPDATE/DELETE policies - immutable audit records

-- QUOTES policies
CREATE POLICY quotes_tenant_isolation_select ON quotes
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY quotes_tenant_isolation_insert ON quotes
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY quotes_tenant_isolation_update ON quotes
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- No DELETE policy - quotes are never hard-deleted

-- QUOTE_STATE_TRANSITIONS policies
CREATE POLICY quote_transitions_tenant_isolation_select ON quote_state_transitions
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY quote_transitions_tenant_isolation_insert ON quote_state_transitions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
-- No UPDATE/DELETE policies - immutable audit records

-- LEDGER_ENTRIES policies
CREATE POLICY ledger_entries_tenant_isolation_select ON ledger_entries
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ledger_entries_tenant_isolation_insert ON ledger_entries
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
-- No UPDATE/DELETE policies - append-only ledger

-- Client portal: clients can view their own ledger entries
CREATE POLICY ledger_entries_client_can_view_own ON ledger_entries
  FOR SELECT USING (
    get_current_user_role() = 'client' AND client_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );
-- EXPENSES policies
CREATE POLICY expenses_tenant_isolation_select ON expenses
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY expenses_tenant_isolation_insert ON expenses
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY expenses_tenant_isolation_update ON expenses
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- No DELETE policy - expenses are never hard-deleted

-- AFTER_ACTION_REVIEWS policies
CREATE POLICY aar_tenant_isolation_select ON after_action_reviews
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY aar_tenant_isolation_insert ON after_action_reviews
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY aar_tenant_isolation_update ON after_action_reviews
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
-- No DELETE policy - AARs are never hard-deleted

-- ============================================
-- VIEWS
-- ============================================

-- Event financial summary
CREATE OR REPLACE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.quoted_price_cents,
  e.payment_status,
  COALESCE(SUM(le.amount_cents) FILTER (WHERE le.is_refund = false), 0) AS total_paid_cents,
  COALESCE(SUM(ABS(le.amount_cents)) FILTER (WHERE le.is_refund = true), 0) AS total_refunded_cents,
  COALESCE(SUM(le.amount_cents), 0) AS net_revenue_cents,
  COALESCE(SUM(ex.amount_cents), 0) AS total_expenses_cents,
  e.tip_amount_cents,
  COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0) AS profit_cents,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
    THEN (COALESCE(SUM(le.amount_cents), 0) - COALESCE(SUM(ex.amount_cents), 0))::DECIMAL / COALESCE(SUM(le.amount_cents), 1)
    ELSE 0
  END AS profit_margin,
  CASE
    WHEN COALESCE(SUM(le.amount_cents), 0) > 0
    THEN COALESCE(SUM(ex.amount_cents), 0)::DECIMAL / COALESCE(SUM(le.amount_cents), 1)
    ELSE 0
  END AS food_cost_percentage,
  e.quoted_price_cents - COALESCE(SUM(le.amount_cents) FILTER (WHERE le.is_refund = false), 0) AS outstanding_balance_cents
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
LEFT JOIN expenses ex ON ex.event_id = e.id
GROUP BY e.id;
-- Event time summary
CREATE OR REPLACE VIEW event_time_summary AS
SELECT
  id AS event_id,
  tenant_id,
  EXTRACT(EPOCH FROM (shopping_completed_at - shopping_started_at)) / 60 AS shopping_duration_minutes,
  EXTRACT(EPOCH FROM (prep_completed_at - prep_started_at)) / 60 AS prep_duration_minutes,
  EXTRACT(EPOCH FROM (travel_completed_at - travel_started_at)) / 60 AS travel_duration_minutes,
  EXTRACT(EPOCH FROM (service_completed_at - service_started_at)) / 60 AS service_duration_minutes,
  EXTRACT(EPOCH FROM (reset_completed_at - reset_started_at)) / 60 AS reset_duration_minutes,
  (COALESCE(EXTRACT(EPOCH FROM (shopping_completed_at - shopping_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (prep_completed_at - prep_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (travel_completed_at - travel_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (service_completed_at - service_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (reset_completed_at - reset_started_at)), 0)) / 60 AS total_time_minutes,
  (COALESCE(EXTRACT(EPOCH FROM (shopping_completed_at - shopping_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (prep_completed_at - prep_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (travel_completed_at - travel_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (service_completed_at - service_started_at)), 0) +
   COALESCE(EXTRACT(EPOCH FROM (reset_completed_at - reset_started_at)), 0)) / 3600 AS total_time_hours
FROM events;
-- Client financial summary
CREATE OR REPLACE VIEW client_financial_summary AS
SELECT
  c.id AS client_id,
  c.tenant_id,
  c.lifetime_value_cents,
  c.total_events_count,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') AS total_events_completed,
  COUNT(e.id) FILTER (WHERE e.status = 'cancelled') AS total_events_cancelled,
  CASE
    WHEN COUNT(e.id) FILTER (WHERE e.status = 'completed') > 0
    THEN c.lifetime_value_cents / COUNT(e.id) FILTER (WHERE e.status = 'completed')
    ELSE 0
  END AS average_spend_per_event,
  COALESCE(SUM(le.amount_cents) FILTER (WHERE le.entry_type = 'tip'), 0) AS total_tips_given_cents,
  CASE
    WHEN c.lifetime_value_cents > 0
    THEN COALESCE(SUM(le.amount_cents) FILTER (WHERE le.entry_type = 'tip'), 0)::DECIMAL / c.lifetime_value_cents
    ELSE 0
  END AS average_tip_percentage,
  COALESCE(SUM(e.quoted_price_cents) FILTER (WHERE e.payment_status != 'paid'), 0) AS outstanding_balance_cents,
  c.last_event_date,
  c.first_event_date,
  CURRENT_DATE - c.last_event_date AS days_since_last_event,
  (CURRENT_DATE - c.last_event_date) > 180 AS is_dormant
FROM clients c
LEFT JOIN events e ON e.client_id = c.id
LEFT JOIN ledger_entries le ON le.client_id = c.id
GROUP BY c.id;
-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Compute event payment status
CREATE OR REPLACE FUNCTION compute_event_payment_status(p_event_id UUID)
RETURNS payment_status AS $$
DECLARE
  v_status payment_status;
BEGIN
  SELECT payment_status INTO v_status
  FROM events
  WHERE id = p_event_id;

  RETURN v_status;
END;
$$ LANGUAGE plpgsql;
-- Compute event profit margin
CREATE OR REPLACE FUNCTION compute_event_profit_margin(p_event_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_margin DECIMAL;
BEGIN
  SELECT profit_margin INTO v_margin
  FROM event_financial_summary
  WHERE event_id = p_event_id;

  RETURN v_margin;
END;
$$ LANGUAGE plpgsql;
-- Compute client lifetime value
CREATE OR REPLACE FUNCTION compute_client_lifetime_value(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_ltv INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_ltv
  FROM ledger_entries
  WHERE client_id = p_client_id AND is_refund = false;

  RETURN v_ltv;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- END OF LAYER 3 MIGRATION
-- ============================================;
