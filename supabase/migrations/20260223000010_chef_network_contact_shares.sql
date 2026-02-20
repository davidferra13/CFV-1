-- ============================================
-- CHEF NETWORK DIRECT CONTACT SHARES
-- ============================================
-- Allows connected chefs to share referral/contact details
-- directly with each other and track response status.
-- ============================================

CREATE TYPE chef_network_contact_share_status AS ENUM (
  'open',
  'accepted',
  'passed'
);

CREATE TABLE chef_network_contact_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recipient_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  status chef_network_contact_share_status NOT NULL DEFAULT 'open',

  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  event_date DATE,
  location TEXT,
  details TEXT NOT NULL,
  response_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

COMMENT ON TABLE chef_network_contact_shares IS
  'Direct, connection-scoped referral/contact shares between chefs.';

COMMENT ON COLUMN chef_network_contact_shares.details IS
  'Context such as event type, guest count, budget, constraints, or handoff notes.';

CREATE INDEX idx_chef_network_contact_shares_sender_created
  ON chef_network_contact_shares(sender_chef_id, created_at DESC);

CREATE INDEX idx_chef_network_contact_shares_recipient_created
  ON chef_network_contact_shares(recipient_chef_id, created_at DESC);

CREATE INDEX idx_chef_network_contact_shares_status
  ON chef_network_contact_shares(status, created_at DESC);

ALTER TABLE chef_network_contact_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_network_contact_shares_select_participants ON chef_network_contact_shares
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND (
      sender_chef_id = get_current_tenant_id()
      OR recipient_chef_id = get_current_tenant_id()
    )
  );

CREATE POLICY chef_network_contact_shares_insert_sender_connected ON chef_network_contact_shares
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND sender_chef_id = get_current_tenant_id()
    AND are_chefs_connected(sender_chef_id, recipient_chef_id)
  );

CREATE POLICY chef_network_contact_shares_update_participants ON chef_network_contact_shares
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND (
      sender_chef_id = get_current_tenant_id()
      OR recipient_chef_id = get_current_tenant_id()
    )
  );
