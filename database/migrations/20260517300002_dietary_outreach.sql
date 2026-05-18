-- Dietary Outreach: per-guest pre-event allergy/restriction confirmation emails
-- ADDITIVE ONLY. No drops, no deletes.

-- Add dietary confirmation tracking columns to event_guests
ALTER TABLE event_guests
  ADD COLUMN IF NOT EXISTS allergy_severity text
    CHECK (allergy_severity IS NULL OR allergy_severity IN ('preference', 'intolerance', 'allergy', 'life_threatening')),
  ADD COLUMN IF NOT EXISTS spice_tolerance text
    CHECK (spice_tolerance IS NULL OR spice_tolerance IN ('none', 'mild', 'medium', 'hot', 'extra_hot')),
  ADD COLUMN IF NOT EXISTS dietary_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dietary_confirmed_via text
    CHECK (dietary_confirmed_via IS NULL OR dietary_confirmed_via IN ('email_outreach', 'manual', 'rsvp'));

-- Dietary outreach tracking table
CREATE TABLE IF NOT EXISTS dietary_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  responded_at timestamptz,
  response_data jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'responded', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique token for public access
CREATE UNIQUE INDEX idx_dietary_outreach_token ON dietary_outreach(token);

-- One outreach per guest per event (prevent duplicate sends)
CREATE UNIQUE INDEX idx_dietary_outreach_guest_event
  ON dietary_outreach(guest_id, event_id);

-- Fast lookup by event
CREATE INDEX idx_dietary_outreach_event ON dietary_outreach(event_id);

-- Fast lookup by tenant
CREATE INDEX idx_dietary_outreach_tenant ON dietary_outreach(tenant_id);

-- Updated_at trigger
CREATE TRIGGER set_dietary_outreach_updated_at
  BEFORE UPDATE ON dietary_outreach
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: chef tenant isolation
ALTER TABLE dietary_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY dietary_outreach_tenant_isolation ON dietary_outreach
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
