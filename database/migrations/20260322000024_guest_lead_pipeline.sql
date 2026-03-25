-- Guest Lead Pipeline
-- Adds QR-code-based guest capture: each event gets a unique guest_code,
-- guests scan → land on /g/[code] → fill out interest form → chef sees leads
--
-- Tables affected: events (ALTER), guest_leads (CREATE)
-- Policies: chef read/update own, public insert
-- No destructive changes — fully additive

-- 1. Add guest_code to events (short unique code for QR landing pages)
ALTER TABLE events ADD COLUMN IF NOT EXISTS guest_code TEXT;

-- Backfill existing events with unique codes (12-char hex)
UPDATE events
SET guest_code = left(replace(gen_random_uuid()::text, '-', ''), 12)
WHERE guest_code IS NULL;

-- Default for new events
ALTER TABLE events ALTER COLUMN guest_code SET DEFAULT left(replace(gen_random_uuid()::text, '-', ''), 12);

-- Unique index (partial — only non-null, but after backfill all rows have one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_guest_code ON events(guest_code);

-- 2. Guest Leads table
CREATE TABLE IF NOT EXISTS guest_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_guest_leads_tenant ON guest_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_leads_event ON guest_leads(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_leads_status ON guest_leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_leads_email ON guest_leads(tenant_id, email);

-- RLS
ALTER TABLE guest_leads ENABLE ROW LEVEL SECURITY;

-- Chef reads their own leads
DROP POLICY IF EXISTS "chef_read_own_guest_leads" ON guest_leads;
CREATE POLICY "chef_read_own_guest_leads" ON guest_leads
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );

-- Chef updates their own leads
DROP POLICY IF EXISTS "chef_update_own_guest_leads" ON guest_leads;
CREATE POLICY "chef_update_own_guest_leads" ON guest_leads
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );

-- Public insert — guests submit interest without authentication
DROP POLICY IF EXISTS "public_insert_guest_leads" ON guest_leads;
CREATE POLICY "public_insert_guest_leads" ON guest_leads
  FOR INSERT WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER guest_leads_updated_at
  BEFORE UPDATE ON guest_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
