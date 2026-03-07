-- Circle-First Communication
-- Adds notification message type, message source tracking, and member notification preferences.
-- Part of the circle-first communication upgrade where email becomes a notification layer
-- pointing back to the Dinner Circle as the single source of truth.

-- 1. Expand message_type to include 'notification' (rich actionable cards)
ALTER TABLE hub_messages DROP CONSTRAINT IF EXISTS hub_messages_message_type_check;
ALTER TABLE hub_messages ADD CONSTRAINT hub_messages_message_type_check
  CHECK (message_type IN (
    'text', 'image', 'system', 'poll',
    'rsvp_update', 'menu_update', 'note', 'photo_share',
    'notification'
  ));

-- 2. Notification-specific columns on hub_messages
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS action_label TEXT;

-- 3. Track where a message originated (circle UI, email reply, Remy, system)
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'circle'
  CHECK (source IN ('circle', 'email', 'remy', 'system'));

-- 4. Member notification preferences
ALTER TABLE hub_group_members ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
ALTER TABLE hub_group_members ADD COLUMN IF NOT EXISTS notify_push BOOLEAN DEFAULT true;
ALTER TABLE hub_group_members ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE hub_group_members ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;
ALTER TABLE hub_group_members ADD COLUMN IF NOT EXISTS digest_mode TEXT DEFAULT 'instant'
  CHECK (digest_mode IN ('instant', 'hourly', 'daily'));

-- 5. Index for notification messages (useful for timeline/archive views)
CREATE INDEX IF NOT EXISTS idx_hub_messages_notification_type
  ON hub_messages (group_id, notification_type)
  WHERE notification_type IS NOT NULL AND deleted_at IS NULL;
