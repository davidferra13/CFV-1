-- Performance indexes for hot query paths
-- Identified via performance audit: missing composites and partial indexes
-- on the most frequently queried tables (events, ledger_entries, notifications, guests, clients)

-- EVENTS: composite (tenant_id, client_id) for client detail page event lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_client
  ON events (tenant_id, client_id);

-- EVENTS: upcoming events for dashboard, excluding soft-deleted rows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_date_active
  ON events (tenant_id, event_date DESC)
  WHERE deleted_at IS NULL;

-- EVENTS: filtered lists by status + date, excluding soft-deleted rows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_status_date_active
  ON events (tenant_id, status, event_date)
  WHERE deleted_at IS NULL;

-- LEDGER_ENTRIES: P&L and reconciliation queries filter by tenant + entry_type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_tenant_type
  ON ledger_entries (tenant_id, entry_type);

-- LEDGER_ENTRIES: trigger calculates SUM(amount_cents) WHERE client_id = X AND is_refund = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_client_refund
  ON ledger_entries (client_id, is_refund);

-- NOTIFICATIONS: dedup checks filter by tenant_id + action
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_action_active
  ON notifications (tenant_id, action)
  WHERE archived_at IS NULL;

-- GUESTS: ILIKE search needs trigram index (B-tree cannot support %pattern% matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_name_trgm
  ON guests USING gin (name gin_trgm_ops);

-- CLIENTS: tenant-scoped name search excluding soft-deleted
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_tenant_active
  ON clients (tenant_id)
  WHERE deleted_at IS NULL;
