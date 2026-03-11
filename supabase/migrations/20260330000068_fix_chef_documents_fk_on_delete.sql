-- Fix: chef_documents has 4 FK columns with NO ON DELETE clause.
-- tenant_id should CASCADE (delete chef = delete their documents).
-- event_id and client_id should SET NULL (orphan document if event/client removed).
-- created_by and updated_by were fixed in migration 67.

-- tenant_id: ON DELETE CASCADE (consistent with every other tenant-scoped table)
ALTER TABLE chef_documents DROP CONSTRAINT IF EXISTS chef_documents_tenant_id_fkey;
ALTER TABLE chef_documents
  ADD CONSTRAINT chef_documents_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;
-- event_id: ON DELETE SET NULL (document survives if event is deleted)
ALTER TABLE chef_documents DROP CONSTRAINT IF EXISTS chef_documents_event_id_fkey;
ALTER TABLE chef_documents
  ADD CONSTRAINT chef_documents_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
-- client_id: ON DELETE SET NULL (document survives if client is deleted)
ALTER TABLE chef_documents DROP CONSTRAINT IF EXISTS chef_documents_client_id_fkey;
ALTER TABLE chef_documents
  ADD CONSTRAINT chef_documents_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
