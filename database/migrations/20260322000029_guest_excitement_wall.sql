-- Guest Excitement Wall: social messages on event share pages
-- Guests can post excitement messages visible to other guests
-- Chef can moderate (hide/approve/pin)

-- Guest messages table
CREATE TABLE IF NOT EXISTS guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  emoji TEXT,                           -- optional reaction emoji
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_messages_event ON guest_messages(event_id, is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_messages_tenant ON guest_messages(tenant_id);

-- RLS
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read visible messages for an event (share page is public)
DROP POLICY IF EXISTS guest_messages_public_read ON guest_messages;
CREATE POLICY guest_messages_public_read ON guest_messages
  FOR SELECT USING (is_visible = true);

-- Public: anyone can insert (guest submitting from share page — validated by server action)
DROP POLICY IF EXISTS guest_messages_public_insert ON guest_messages;
CREATE POLICY guest_messages_public_insert ON guest_messages
  FOR INSERT WITH CHECK (true);

-- Chef: can read ALL messages (including hidden) for own tenant
DROP POLICY IF EXISTS guest_messages_chef_read_all ON guest_messages;
CREATE POLICY guest_messages_chef_read_all ON guest_messages
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chef: can update (moderate) own tenant messages
DROP POLICY IF EXISTS guest_messages_chef_update ON guest_messages;
CREATE POLICY guest_messages_chef_update ON guest_messages
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chef: can delete own tenant messages
DROP POLICY IF EXISTS guest_messages_chef_delete ON guest_messages;
CREATE POLICY guest_messages_chef_delete ON guest_messages
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Guest photos table (Phase 3 — create now to avoid another migration)
CREATE TABLE IF NOT EXISTS guest_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_photos_event ON guest_photos(event_id, is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_photos_tenant ON guest_photos(tenant_id);

ALTER TABLE guest_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guest_photos_public_read ON guest_photos;
CREATE POLICY guest_photos_public_read ON guest_photos
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS guest_photos_public_insert ON guest_photos;
CREATE POLICY guest_photos_public_insert ON guest_photos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS guest_photos_chef_read_all ON guest_photos;
CREATE POLICY guest_photos_chef_read_all ON guest_photos
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS guest_photos_chef_update ON guest_photos;
CREATE POLICY guest_photos_chef_update ON guest_photos
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

DROP POLICY IF EXISTS guest_photos_chef_delete ON guest_photos;
CREATE POLICY guest_photos_chef_delete ON guest_photos
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Storage bucket for guest photos (create if Supabase storage is configured)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('guest-photos', 'guest-photos', true)
-- ON CONFLICT (id) DO NOTHING;
