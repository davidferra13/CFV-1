-- Client Quick Requests
-- Allows recurring clients to quickly request a meal/event without the full inquiry pipeline.
-- Additive migration: creates one new table with RLS policies.

CREATE TABLE IF NOT EXISTS client_quick_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requested_date date NOT NULL,
  requested_time text, -- 'morning', 'lunch', 'afternoon', 'evening', or specific time like '18:00'
  guest_count int NOT NULL DEFAULT 2,
  notes text,
  preferred_menu_id uuid REFERENCES menus(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'converted')),
  decline_reason text,
  converted_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Indexes for common access patterns
CREATE INDEX idx_quick_requests_tenant_status ON client_quick_requests(tenant_id, status);
CREATE INDEX idx_quick_requests_client ON client_quick_requests(client_id);
-- RLS
ALTER TABLE client_quick_requests ENABLE ROW LEVEL SECURITY;
-- Chefs can see all requests for their tenant
DROP POLICY IF EXISTS "Chefs see own tenant requests" ON client_quick_requests;
CREATE POLICY "Chefs see own tenant requests"
  ON client_quick_requests FOR SELECT
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
-- Chefs can update requests (confirm, decline, convert)
DROP POLICY IF EXISTS "Chefs update own tenant requests" ON client_quick_requests;
CREATE POLICY "Chefs update own tenant requests"
  ON client_quick_requests FOR UPDATE
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
-- Clients can see their own requests
DROP POLICY IF EXISTS "Clients see own requests" ON client_quick_requests;
CREATE POLICY "Clients see own requests"
  ON client_quick_requests FOR SELECT
  USING (client_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
  ));
-- Clients can create requests
DROP POLICY IF EXISTS "Clients create own requests" ON client_quick_requests;
CREATE POLICY "Clients create own requests"
  ON client_quick_requests FOR INSERT
  WITH CHECK (client_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
  ));
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_quick_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quick_request_updated_at
  BEFORE UPDATE ON client_quick_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_request_updated_at();
