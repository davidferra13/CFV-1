-- KDS Tickets: Multi-Station Kitchen Display System
-- Each ticket represents a set of items routed to a specific kitchen station.
-- Linked to POS sales and/or dining checks for FOH-BOH integration.

CREATE TABLE IF NOT EXISTS kds_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  check_id uuid,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  ticket_number integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'ready', 'served', 'voided')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'rush', 'vip')),
  fire_at timestamptz,
  fired_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  table_number text,
  server_name text,
  guest_count integer,
  allergy_alert text,
  notes text,
  course_number integer,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Index for station-based queries (the primary KDS query pattern)
CREATE INDEX idx_kds_tickets_station_status
  ON kds_tickets(station_id, status)
  WHERE status NOT IN ('served', 'voided');
-- Index for chef-wide queries (expeditor view)
CREATE INDEX idx_kds_tickets_chef_active
  ON kds_tickets(chef_id, status)
  WHERE status NOT IN ('served', 'voided');
-- Index for sale lookups
CREATE INDEX idx_kds_tickets_sale ON kds_tickets(sale_id) WHERE sale_id IS NOT NULL;
-- Index for check lookups (FOH-BOH)
CREATE INDEX idx_kds_tickets_check ON kds_tickets(check_id) WHERE check_id IS NOT NULL;
-- Auto-update updated_at
CREATE TRIGGER set_kds_tickets_updated_at
  BEFORE UPDATE ON kds_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- RLS
ALTER TABLE kds_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY kds_tickets_tenant_isolation ON kds_tickets
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
-- Add station_id to product projections for KDS routing.
ALTER TABLE product_projections
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES stations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_product_projections_station
  ON product_projections(station_id)
  WHERE station_id IS NOT NULL;
-- Daily ticket number sequence helper
-- Assigns the next ticket number for today for a given chef
CREATE OR REPLACE FUNCTION next_kds_ticket_number(p_chef_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    MAX(ticket_number),
    0
  ) + 1
  FROM kds_tickets
  WHERE chef_id = p_chef_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;
