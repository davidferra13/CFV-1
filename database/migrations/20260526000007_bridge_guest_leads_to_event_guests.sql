-- Bridge: allow event_guests without a share link (QR-captured leads)
ALTER TABLE event_guests ALTER COLUMN event_share_id DROP NOT NULL;

-- Add source column to track how guest entered
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'share_link';

-- Add guest_lead_id to link back to the originating lead record
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS guest_lead_id UUID REFERENCES guest_leads(id) ON DELETE SET NULL;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_event_guests_guest_lead_id ON event_guests(guest_lead_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_source ON event_guests(source);
