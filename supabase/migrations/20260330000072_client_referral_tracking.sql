-- New: Track which client referred which client.
-- Currently clients.referral_source is just an enum ("referral", "Instagram", etc.)
-- with no FK saying "Client B was referred by Client A."
-- Referral tracking is a huge business driver for private chefs.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referred_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index for lookup: "which clients did Client X refer?"
CREATE INDEX IF NOT EXISTS idx_clients_referred_by ON clients(referred_by_client_id)
  WHERE referred_by_client_id IS NOT NULL;
