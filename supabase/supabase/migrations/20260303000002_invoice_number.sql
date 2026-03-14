-- Invoice Number
-- Adds invoice tracking columns to the events table.
-- invoice_number: sequential human-readable identifier (INV-YYYY-NNN)
-- invoice_issued_at: timestamp when the invoice was first issued
--
-- Invoice numbers are generated when an event first receives a payment
-- (accepted → paid transition) and are immutable once set.
-- Format: INV-2026-001, INV-2026-002, etc. (per year, per chef)

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ;

-- Partial index — only events with invoice numbers need this lookup
CREATE INDEX IF NOT EXISTS idx_events_invoice_number
  ON events(tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

COMMENT ON COLUMN events.invoice_number IS
  'Human-readable invoice ID (INV-YYYY-NNN). Set once on first payment receipt. Immutable.';
COMMENT ON COLUMN events.invoice_issued_at IS
  'Timestamp when the invoice_number was first assigned.';
