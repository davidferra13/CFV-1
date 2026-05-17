-- Pop-Up Operating System
-- Dedicated chef_popups table for pop-up event management.
-- ADDITIVE ONLY. No existing tables modified.

CREATE TABLE IF NOT EXISTS chef_popups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  venue_name        TEXT,
  venue_address     TEXT,
  venue_lat         DOUBLE PRECISION,
  venue_lng         DOUBLE PRECISION,
  event_date        DATE,
  doors_open        TIME,
  service_start     TIME,
  capacity          INT CHECK (capacity IS NULL OR capacity >= 0),
  ticket_price_cents INT CHECK (ticket_price_cents IS NULL OR ticket_price_cents >= 0),
  menu_id           UUID,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'soldout', 'cancelled', 'completed')),
  published_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_popups_tenant ON chef_popups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chef_popups_status ON chef_popups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_chef_popups_event_date ON chef_popups(event_date)
  WHERE event_date IS NOT NULL;

-- RLS policy for tenant isolation
ALTER TABLE chef_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_popups_tenant_isolation ON chef_popups
  FOR ALL
  TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
