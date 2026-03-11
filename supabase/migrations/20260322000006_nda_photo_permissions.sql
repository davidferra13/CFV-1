-- NDA & Photo Permission Management: per-client NDA tracking and photo consent
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS nda_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nda_coverage TEXT,
  ADD COLUMN IF NOT EXISTS nda_effective_date DATE,
  ADD COLUMN IF NOT EXISTS nda_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS nda_document_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_permission TEXT DEFAULT 'none'
    CHECK (photo_permission IN ('none','portfolio_only','public_with_approval','public_freely'));
-- Add client_id linkage to event_photos for permission inheritance
ALTER TABLE event_photos
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permission_override TEXT
    CHECK (permission_override IN ('none','portfolio_only','public_with_approval','public_freely'));
CREATE INDEX IF NOT EXISTS idx_clients_photo_permission ON clients(tenant_id, photo_permission);
CREATE INDEX IF NOT EXISTS idx_event_photos_client ON event_photos(client_id) WHERE client_id IS NOT NULL;
