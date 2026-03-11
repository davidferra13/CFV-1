-- ============================================
-- ChefFlow V1 - Layer 2: Inquiry Pipeline + Messaging System
-- Unified inquiry tracking and contextual messaging
-- Aligns with Master Document Parts 11, 12
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Inquiry lifecycle states
CREATE TYPE inquiry_status AS ENUM (
  'new',              -- Just received
  'awaiting_client',  -- Chef responded, waiting for client
  'awaiting_chef',    -- Client responded, waiting for chef
  'quoted',           -- Quote sent
  'confirmed',        -- Client accepted (converts to event in Layer 3)
  'declined',         -- Chef or client declined
  'expired'           -- No response after follow-ups
);
-- Inquiry source channel
CREATE TYPE inquiry_channel AS ENUM (
  'text',
  'email',
  'instagram',
  'take_a_chef',
  'phone',
  'website',
  'other'
);
-- Message approval workflow states
CREATE TYPE message_status AS ENUM (
  'draft',      -- Created but not approved
  'approved',   -- Approved but not sent
  'sent',       -- Successfully sent
  'logged'      -- Inbound message or already-sent message logged
);
-- Message communication channel
CREATE TYPE message_channel AS ENUM (
  'text',
  'email',
  'instagram',
  'take_a_chef',
  'phone',
  'internal_note'
);
-- Message direction
CREATE TYPE message_direction AS ENUM (
  'inbound',   -- Client to chef
  'outbound'   -- Chef to client
);
-- ============================================
-- INQUIRIES (Unified Inquiry Tracking)
-- ============================================

CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Nullable - might be new lead

  -- Source
  channel inquiry_channel NOT NULL,
  status inquiry_status NOT NULL DEFAULT 'new',
  source_message TEXT, -- Verbatim original message

  -- Confirmed facts extracted from inquiry
  confirmed_date TIMESTAMPTZ,
  confirmed_guest_count INTEGER,
  confirmed_location TEXT,
  confirmed_occasion TEXT,
  confirmed_budget_cents INTEGER,
  confirmed_dietary_restrictions TEXT[],
  confirmed_service_expectations TEXT,
  confirmed_cannabis_preference TEXT, -- Real intake question for this business

  -- Unknown/blocking questions
  unknown_fields JSONB DEFAULT '[]'::jsonb, -- Array of strings: ["What time?", "Indoor or outdoor?"]

  -- Next action tracking
  next_action_required TEXT, -- "Send quote", "Wait for client date confirmation"
  next_action_by TEXT CHECK (next_action_by IN ('chef', 'client')),

  -- Follow-up tracking (no separate table needed)
  follow_up_due_at TIMESTAMPTZ, -- When to prompt chef if no response

  -- Timestamps
  first_contact_at TIMESTAMPTZ NOT NULL,
  last_response_at TIMESTAMPTZ,

  -- Conversion (Layer 3 will add FK constraint)
  converted_to_event_id UUID, -- NO FK constraint yet - events table doesn't exist

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_inquiries_tenant ON inquiries(tenant_id);
CREATE INDEX idx_inquiries_client ON inquiries(client_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_tenant_status ON inquiries(tenant_id, status);
CREATE INDEX idx_inquiries_follow_up_due ON inquiries(follow_up_due_at) WHERE follow_up_due_at IS NOT NULL;
CREATE INDEX idx_inquiries_converted ON inquiries(converted_to_event_id) WHERE converted_to_event_id IS NOT NULL;
COMMENT ON TABLE inquiries IS 'Unified inquiry tracking from all channels (Part 11). Every inquiry becomes a structured record.';
COMMENT ON COLUMN inquiries.client_id IS 'Nullable - inquiry might be from new lead who is not yet a client';
COMMENT ON COLUMN inquiries.source_message IS 'Verbatim original message for context';
COMMENT ON COLUMN inquiries.unknown_fields IS 'Array of blocking questions: ["What time?", "How many guests?"]';
COMMENT ON COLUMN inquiries.follow_up_due_at IS 'When to prompt chef if no response. Update to next interval when follow-up sent. No separate follow_ups table needed.';
COMMENT ON COLUMN inquiries.converted_to_event_id IS 'UUID of event created from this inquiry. FK constraint will be added in Layer 3 when events table exists.';
-- ============================================
-- INQUIRY STATE TRANSITIONS (Immutable Audit Trail)
-- ============================================

CREATE TABLE inquiry_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  from_status inquiry_status, -- Nullable for initial state
  to_status inquiry_status NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id), -- Nullable for system transitions
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reason TEXT,
  metadata JSONB
);
CREATE INDEX idx_inquiry_transitions_inquiry ON inquiry_state_transitions(inquiry_id);
CREATE INDEX idx_inquiry_transitions_tenant ON inquiry_state_transitions(tenant_id);
CREATE INDEX idx_inquiry_transitions_date ON inquiry_state_transitions(transitioned_at DESC);
COMMENT ON TABLE inquiry_state_transitions IS 'Immutable audit trail of all inquiry status changes';
COMMENT ON COLUMN inquiry_state_transitions.from_status IS 'Nullable for initial state (creation)';
COMMENT ON COLUMN inquiry_state_transitions.transitioned_by IS 'NULL for system transitions (e.g., auto-expire)';
-- ============================================
-- MESSAGES (Contextual, Event-Bound Communication)
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID, -- NO FK constraint yet - events table doesn't exist (Layer 3)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Message details
  channel message_channel NOT NULL,
  status message_status NOT NULL DEFAULT 'logged',
  direction message_direction NOT NULL,
  from_user_id UUID REFERENCES auth.users(id), -- Nullable for external messages
  to_user_id UUID REFERENCES auth.users(id), -- Nullable

  -- Content
  subject TEXT, -- For email
  body TEXT NOT NULL,

  -- Approval workflow
  sent_at TIMESTAMPTZ, -- NULL if draft/approved
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_inquiry ON messages(inquiry_id);
CREATE INDEX idx_messages_event ON messages(event_id);
CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
COMMENT ON TABLE messages IS 'Contextual, event-bound communication (Part 12). Messages are permanent records - NEVER deleted once logged. All outbound messages require explicit approval before sending.';
COMMENT ON COLUMN messages.event_id IS 'UUID of related event. FK constraint will be added in Layer 3 when events table exists.';
COMMENT ON COLUMN messages.direction IS 'inbound (client → chef) or outbound (chef → client)';
COMMENT ON COLUMN messages.status IS 'draft → approved → sent for outbound; logged for inbound';
COMMENT ON COLUMN messages.approved_by IS 'Required for outbound messages - NO auto-sending ever';
-- ============================================
-- RESPONSE TEMPLATES (Pre-drafted Chef Voice)
-- ============================================

CREATE TABLE response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'inquiry', 'booking_confirmation', 'follow_up', etc.
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_templates_tenant ON response_templates(tenant_id);
CREATE INDEX idx_templates_active ON response_templates(tenant_id, is_active) WHERE is_active = true;
COMMENT ON TABLE response_templates IS 'Pre-drafted responses in chef voice. Require chef approval before sending.';
COMMENT ON COLUMN response_templates.usage_count IS 'Incremented each time template is used';
-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Prevent modification of inquiry state transitions (immutability)
CREATE OR REPLACE FUNCTION prevent_inquiry_transition_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Inquiry state transitions are immutable. They form an audit trail.';
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION prevent_inquiry_transition_modification IS 'Enforces immutability on inquiry_state_transitions table';
-- Validate inquiry state transition is legal
CREATE OR REPLACE FUNCTION validate_inquiry_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Valid transitions (from → to):
  -- new → awaiting_client
  -- new → declined
  -- awaiting_client → awaiting_chef
  -- awaiting_client → expired
  -- awaiting_chef → awaiting_client (chef responded, waiting again)
  -- awaiting_chef → quoted
  -- quoted → confirmed
  -- quoted → declined
  -- quoted → expired

  -- Allow initial state (from_status is NULL)
  IF NEW.from_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate transition
  IF NOT (
    (NEW.from_status = 'new' AND NEW.to_status IN ('awaiting_client', 'declined')) OR
    (NEW.from_status = 'awaiting_client' AND NEW.to_status IN ('awaiting_chef', 'expired')) OR
    (NEW.from_status = 'awaiting_chef' AND NEW.to_status IN ('awaiting_client', 'quoted')) OR
    (NEW.from_status = 'quoted' AND NEW.to_status IN ('confirmed', 'declined', 'expired'))
  ) THEN
    RAISE EXCEPTION 'Invalid inquiry state transition: % → %. This transition is not allowed.', NEW.from_status, NEW.to_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION validate_inquiry_transition IS 'Validates inquiry state transitions against allowed state machine rules';
-- Extend audit logging to support inquiries and messages
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_value UUID;
  change_desc TEXT;
BEGIN
  -- Determine tenant_id if available
  IF TG_TABLE_NAME = 'chefs' THEN
    tenant_id_value := NULL;
  ELSIF TG_TABLE_NAME IN ('clients', 'inquiries', 'messages', 'response_templates') THEN
    IF TG_OP = 'DELETE' THEN
      tenant_id_value := OLD.tenant_id;
    ELSE
      tenant_id_value := NEW.tenant_id;
    END IF;
  ELSE
    tenant_id_value := NULL;
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
COMMENT ON FUNCTION log_audit IS 'Logs all mutations to audit_log table with before/after snapshots (extended for Layer 2 tables)';
-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE TRIGGER inquiries_updated_at
BEFORE UPDATE ON inquiries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER templates_updated_at
BEFORE UPDATE ON response_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Audit logging
CREATE TRIGGER inquiries_audit_log
AFTER INSERT OR UPDATE OR DELETE ON inquiries
FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER messages_audit_log
AFTER INSERT OR UPDATE OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER templates_audit_log
AFTER INSERT OR UPDATE OR DELETE ON response_templates
FOR EACH ROW EXECUTE FUNCTION log_audit();
-- Inquiry state transition validation and immutability
CREATE TRIGGER inquiry_transitions_validate
BEFORE INSERT ON inquiry_state_transitions
FOR EACH ROW EXECUTE FUNCTION validate_inquiry_transition();
CREATE TRIGGER inquiry_transitions_immutable_update
BEFORE UPDATE ON inquiry_state_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_inquiry_transition_modification();
CREATE TRIGGER inquiry_transitions_immutable_delete
BEFORE DELETE ON inquiry_state_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_inquiry_transition_modification();
-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
-- ============================================
-- INQUIRIES TABLE POLICIES
-- ============================================

-- Chefs can read their own inquiries
CREATE POLICY inquiries_chef_select ON inquiries
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Chefs can create inquiries
CREATE POLICY inquiries_chef_insert ON inquiries
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Chefs can update their inquiries
CREATE POLICY inquiries_chef_update ON inquiries
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Chefs can delete their inquiries (prefer status transition to 'declined' or 'expired')
CREATE POLICY inquiries_chef_delete ON inquiries
  FOR DELETE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Clients can read inquiries linked to them
CREATE POLICY inquiries_client_select ON inquiries
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
COMMENT ON POLICY inquiries_chef_select ON inquiries IS 'Chefs see only their tenant inquiries';
COMMENT ON POLICY inquiries_client_select ON inquiries IS 'Clients see only inquiries linked to them';
-- ============================================
-- INQUIRY_STATE_TRANSITIONS TABLE POLICIES
-- ============================================

-- Chefs can read transitions for their inquiries
CREATE POLICY inquiry_transitions_chef_select ON inquiry_state_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Clients can read transitions for their inquiries
CREATE POLICY inquiry_transitions_client_select ON inquiry_state_transitions
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    inquiry_id IN (
      SELECT id FROM inquiries WHERE client_id = get_current_client_id()
    )
  );
-- Only chef who owns the inquiry can insert state transitions
CREATE POLICY inquiry_transitions_insert ON inquiry_state_transitions
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );
-- NO UPDATE/DELETE (enforced by immutability triggers)

COMMENT ON POLICY inquiry_transitions_chef_select ON inquiry_state_transitions IS 'Chefs see transitions for their tenant inquiries';
COMMENT ON POLICY inquiry_transitions_client_select ON inquiry_state_transitions IS 'Clients see transitions for their inquiries';
COMMENT ON POLICY inquiry_transitions_insert ON inquiry_state_transitions IS 'Only the chef who owns the inquiry can record state transitions (tenant isolation enforced)';
-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

-- Chefs can read their messages
CREATE POLICY messages_chef_select ON messages
  FOR SELECT
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Chefs can create messages
CREATE POLICY messages_chef_insert ON messages
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- Chefs can update messages (only drafts via app logic - sent messages immutable in practice)
CREATE POLICY messages_chef_update ON messages
  FOR UPDATE
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- NO DELETE POLICY: Messages are permanent records.
-- Once logged, never deleted. Messages are an audit trail of communication.
-- Deletion only occurs via CASCADE when parent records (inquiries, events, clients) are deleted.

-- Clients can read messages related to them
CREATE POLICY messages_client_select ON messages
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
COMMENT ON POLICY messages_chef_select ON messages IS 'Chefs see messages for their tenant';
COMMENT ON POLICY messages_client_select ON messages IS 'Clients see messages related to them';
-- ============================================
-- RESPONSE_TEMPLATES TABLE POLICIES
-- ============================================

-- Chefs can manage their templates
CREATE POLICY templates_chef_all ON response_templates
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
-- No client access to templates

COMMENT ON POLICY templates_chef_all ON response_templates IS 'Chefs manage their own response templates';
-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test inquiry state transition validation:
-- Should succeed: INSERT INTO inquiry_state_transitions (tenant_id, inquiry_id, from_status, to_status) VALUES (..., 'new', 'awaiting_client');
-- Should fail: INSERT INTO inquiry_state_transitions (tenant_id, inquiry_id, from_status, to_status) VALUES (..., 'new', 'confirmed');

COMMENT ON SCHEMA public IS 'ChefFlow V1 Layers 1-2: Foundation + Inquiry Pipeline + Messaging';
