-- Composite index for event financial summary queries
-- Replaces three separate scans with one covering index
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_event_created
  ON ledger_entries (tenant_id, event_id, created_at DESC)
  WHERE event_id IS NOT NULL;

-- Covering index for tenant-level P&L queries (no event filter)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_created
  ON ledger_entries (tenant_id, created_at DESC, type, amount_cents);
