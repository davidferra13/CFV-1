-- Invoice Delivery System
-- Tracks invoice email sends and adds corporate billing fields to events.
-- Additive only: no column drops, no data deletion.

-- ============================================
-- TABLE: invoice_sends (delivery history)
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_sends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  sent_to     TEXT NOT NULL,
  cc_to       TEXT,
  sent_by     TEXT NOT NULL DEFAULT 'chef'
              CHECK (sent_by IN ('chef', 'system', 'client_request')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_sends_event ON invoice_sends(event_id, created_at DESC);
CREATE INDEX idx_invoice_sends_tenant ON invoice_sends(tenant_id, created_at DESC);

COMMENT ON TABLE invoice_sends IS 'Audit log of invoice PDF email deliveries.';
COMMENT ON COLUMN invoice_sends.sent_by IS 'Who initiated: chef (manual), system (auto on final payment), client_request (from portal).';

-- ============================================
-- Corporate billing fields on events
-- ============================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS bill_to_company TEXT,
  ADD COLUMN IF NOT EXISTS bill_to_attention TEXT,
  ADD COLUMN IF NOT EXISTS bill_to_po_number TEXT;

COMMENT ON COLUMN events.bill_to_company IS 'Corporate billing: company name for invoice "Bill To" section.';
COMMENT ON COLUMN events.bill_to_attention IS 'Corporate billing: attention line (e.g. "Attn: Accounts Payable").';
COMMENT ON COLUMN events.bill_to_po_number IS 'Corporate billing: purchase order number for expense tracking.';

-- ============================================
-- Chef invoice settings (on chefs table)
-- ============================================

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS invoice_payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS invoice_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_footer_note TEXT;

COMMENT ON COLUMN chefs.invoice_payment_terms IS 'Payment terms shown on invoices (e.g. "Net 30", "Due on receipt").';
COMMENT ON COLUMN chefs.invoice_tax_id IS 'Tax ID / EIN displayed on invoices when enabled.';
COMMENT ON COLUMN chefs.invoice_footer_note IS 'Custom footer note on invoices (cancellation policy, etc).';
