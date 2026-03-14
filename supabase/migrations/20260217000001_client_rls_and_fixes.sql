-- Migration: Client RLS Policies + chef_documents CASCADE fix
-- Fixes critical gap: clients could not read their own events or quotes
-- Also fixes chef_documents missing ON DELETE CASCADE on tenant_id FK

-- ============================================
-- 1. Client SELECT policy for events
-- Clients can read events where they are the client_id
-- ============================================
CREATE POLICY events_client_can_view_own ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND client_id = get_current_client_id()
  );

-- ============================================
-- 2. Client SELECT policy for quotes
-- Clients can read quotes where they are the client_id
-- ============================================
CREATE POLICY quotes_client_can_view_own ON quotes
  FOR SELECT USING (
    get_current_user_role() = 'client' AND client_id = get_current_client_id()
  );

-- ============================================
-- 3. Client SELECT policy for event_financial_summary view
-- (view inherits RLS from underlying tables, but the view itself
-- needs client access since it joins events + ledger_entries)
-- ============================================
-- Note: event_financial_summary is a VIEW, not a table.
-- It derives from events and ledger_entries which now both have client policies.
-- No separate RLS policy needed on views — they inherit from base tables.

-- ============================================
-- 4. Fix chef_documents: add ON DELETE CASCADE to tenant_id FK
-- Every other tenant-scoped table cascades; this one was missing it
-- ============================================
ALTER TABLE chef_documents
  DROP CONSTRAINT IF EXISTS chef_documents_tenant_id_fkey;

ALTER TABLE chef_documents
  ADD CONSTRAINT chef_documents_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;

-- ============================================
-- 5. Add missing indexes on chef_documents for common query patterns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chef_documents_event ON chef_documents(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chef_documents_client ON chef_documents(client_id) WHERE client_id IS NOT NULL;
