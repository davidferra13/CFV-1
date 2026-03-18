-- Composite indexes for query performance
-- Production readiness audit: these multi-column indexes cover the most
-- common tenant-scoped query patterns (dashboard listings, financial
-- roll-ups, conversation lookups, quote expiry checks).
--
-- All use IF NOT EXISTS for safe re-runs.

-- 1. Events: dashboard list filtered by status, sorted by date
CREATE INDEX IF NOT EXISTS idx_events_tenant_status_date
  ON events (tenant_id, status, event_date);

-- 2. Ledger entries: per-client financial roll-ups
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_client
  ON ledger_entries (tenant_id, client_id);

-- 3. Ledger entries: per-event entries sorted by date (financial timeline)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_event_date
  ON ledger_entries (tenant_id, event_id, created_at);

-- 4. Chef activity log: filter by entity type with date sort
--    (actual table is chef_activity_log; column is entity_type, not table_name)
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_entity_date
  ON chef_activity_log (tenant_id, entity_type, created_at);

-- 5. Quotes: expiring-soon queries and status-filtered lists
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status_valid
  ON quotes (tenant_id, status, valid_until);

-- 6. Conversations: context-type filtered lists sorted by recency
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_context_updated
  ON conversations (tenant_id, context_type, updated_at);
