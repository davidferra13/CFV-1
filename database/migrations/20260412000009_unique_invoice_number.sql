-- Unique constraint on (tenant_id, invoice_number) to prevent duplicate invoice numbers
-- from simultaneous webhook payments. NULL invoice_numbers are excluded (most events).
-- If any duplicates exist, this migration will fail -- run the dedup query below first.

-- Dedup check (run manually if migration fails):
-- SELECT tenant_id, invoice_number, COUNT(*) FROM events
-- WHERE invoice_number IS NOT NULL
-- GROUP BY tenant_id, invoice_number HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_tenant_invoice_number
  ON events (tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;
