-- Client recurring pricing defaults
-- Additive only; used to prefill repeat-client quotes with a stable baseline.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS recurring_pricing_model TEXT
    CHECK (
      recurring_pricing_model IS NULL OR
      recurring_pricing_model IN ('none', 'flat_rate', 'per_person')
    ),
  ADD COLUMN IF NOT EXISTS recurring_price_cents INTEGER
    CHECK (recurring_price_cents IS NULL OR recurring_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS recurring_pricing_notes TEXT;
COMMENT ON COLUMN clients.recurring_pricing_model IS
  'Optional recurring pricing strategy for repeat clients: none, flat_rate, or per_person.';
COMMENT ON COLUMN clients.recurring_price_cents IS
  'Default recurring price in cents. Flat total or per-person based on recurring_pricing_model.';
COMMENT ON COLUMN clients.recurring_pricing_notes IS
  'Optional chef notes about recurring pricing terms (e.g., groceries billed separately).';
CREATE INDEX IF NOT EXISTS idx_clients_recurring_pricing_model
  ON clients(tenant_id, recurring_pricing_model)
  WHERE recurring_pricing_model IS NOT NULL;
