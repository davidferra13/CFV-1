-- Corporate Procurement Layer
-- Stores corporate billing profiles for clients (company name, billing address,
-- PO number, tax ID, payment terms). Linked to clients table, tenant-scoped.
-- ADDITIVE ONLY. No existing tables modified.

CREATE TABLE IF NOT EXISTS corporate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,

  tax_id TEXT,
  default_po_number TEXT,

  payment_terms TEXT NOT NULL DEFAULT 'due_on_receipt'
    CHECK (payment_terms IN ('net30', 'net60', 'net90', 'due_on_receipt')),

  billing_contact_name TEXT,
  billing_contact_email TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_corporate_profiles_client_tenant
  ON corporate_profiles(client_id, tenant_id);

CREATE INDEX idx_corporate_profiles_tenant
  ON corporate_profiles(tenant_id);
