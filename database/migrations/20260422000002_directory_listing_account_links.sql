-- Link canonical Nearby listings to ChefFlow operator accounts.
-- Additive only: preserves directory_listings as the canonical public entity
-- while recording append-only account-link events for auditability.

ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS linked_chef_id uuid REFERENCES chefs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_chef_confidence text
    CHECK (linked_chef_confidence IS NULL OR linked_chef_confidence IN ('high', 'medium')),
  ADD COLUMN IF NOT EXISTS linked_chef_reason text,
  ADD COLUMN IF NOT EXISTS linked_chef_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_directory_listings_linked_chef_id
  ON directory_listings(linked_chef_id)
  WHERE linked_chef_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS directory_listing_account_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES directory_listings(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium')),
  reason text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_listing_account_link_events_listing
  ON directory_listing_account_link_events(listing_id, linked_at DESC);

CREATE INDEX IF NOT EXISTS idx_directory_listing_account_link_events_chef
  ON directory_listing_account_link_events(chef_id, linked_at DESC);
