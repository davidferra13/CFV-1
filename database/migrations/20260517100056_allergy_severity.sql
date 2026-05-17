-- Allergy Severity Tiers: per-guest allergen tracking with severity levels
-- ADDITIVE ONLY. No drops, no deletes.

CREATE TABLE IF NOT EXISTS guest_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  severity text NOT NULL DEFAULT 'preference'
    CHECK (severity IN ('preference', 'intolerance', 'allergy')),
  notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  has_epipen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One allergen per guest (case-insensitive uniqueness)
CREATE UNIQUE INDEX idx_guest_allergies_unique_allergen
  ON guest_allergies (guest_id, lower(allergen));

-- Fast lookup by tenant
CREATE INDEX idx_guest_allergies_tenant
  ON guest_allergies (tenant_id);

-- Fast lookup by guest
CREATE INDEX idx_guest_allergies_guest
  ON guest_allergies (guest_id);

-- Quick filter for critical allergies across a tenant
CREATE INDEX idx_guest_allergies_critical
  ON guest_allergies (tenant_id, severity)
  WHERE severity = 'allergy';

-- RLS: chef tenant isolation
ALTER TABLE guest_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_allergies_tenant_isolation ON guest_allergies
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
