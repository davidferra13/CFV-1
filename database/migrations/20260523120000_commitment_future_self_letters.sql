-- Future Self Letters: chef writes a note explaining WHY when setting a commitment.
-- Retrieved during Tier 4+ override ceremonies to remind them of their original intent.

CREATE TABLE IF NOT EXISTS commitment_future_self_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES commitments(id),
  letter_text text NOT NULL,
  written_at timestamptz NOT NULL DEFAULT now(),
  last_shown_at timestamptz,
  tenant_id uuid NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_future_self_letters_commitment
  ON commitment_future_self_letters (commitment_id);

CREATE INDEX idx_future_self_letters_tenant
  ON commitment_future_self_letters (tenant_id);
