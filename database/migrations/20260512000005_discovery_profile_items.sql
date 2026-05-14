-- Migration: 20260512000005_discovery_profile_items.sql
-- Purpose: Persistent authenticated homepage discovery profile state for
--          explicit pins, dismissals, and preference feedback.

CREATE TABLE IF NOT EXISTS discovery_profile_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type          TEXT        NOT NULL,
  item_value         TEXT        NOT NULL,
  item_label         TEXT,
  href               TEXT,
  pinned             BOOLEAN     NOT NULL DEFAULT false,
  dismissed          BOOLEAN     NOT NULL DEFAULT false,
  liked              BOOLEAN     NOT NULL DEFAULT false,
  disliked           BOOLEAN     NOT NULL DEFAULT false,
  metadata           JSONB,
  last_interacted_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discovery_profile_items_unique_item
    UNIQUE (auth_user_id, item_type, item_value),
  CONSTRAINT discovery_profile_items_item_type_check
    CHECK (item_type IN (
      'cuisine', 'food_type', 'craving', 'service', 'occasion', 'dietary',
      'featured_chef', 'chef_pick', 'combo', 'story', 'surprise', 'seasonal',
      'location', 'mood', 'price', 'time', 'group_size', 'saved',
      'special_dining', 'culinary_signal'
    )),
  CONSTRAINT discovery_profile_items_text_length_check
    CHECK (
      length(item_value) <= 100
      AND (item_label IS NULL OR length(item_label) <= 100)
      AND (href IS NULL OR length(href) <= 500)
    ),
  CONSTRAINT discovery_profile_items_metadata_check
    CHECK (
      metadata IS NULL
      OR (
        jsonb_typeof(metadata) = 'object'
        AND pg_column_size(metadata) <= 8192
      )
    )
);

COMMENT ON TABLE discovery_profile_items IS
  'Durable authenticated homepage discovery state for explicit pins, dismissals, likes, and dislikes.';

CREATE INDEX IF NOT EXISTS idx_discovery_profile_items_user_updated
  ON discovery_profile_items (auth_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovery_profile_items_user_pinned
  ON discovery_profile_items (auth_user_id, last_interacted_at DESC)
  WHERE pinned = true;

CREATE INDEX IF NOT EXISTS idx_discovery_profile_items_user_dismissed
  ON discovery_profile_items (auth_user_id, last_interacted_at DESC)
  WHERE dismissed = true;

ALTER TABLE discovery_profile_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discovery profile items" ON discovery_profile_items;
CREATE POLICY "Users manage own discovery profile items"
  ON discovery_profile_items
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access discovery profile items" ON discovery_profile_items;
CREATE POLICY "Service role full access discovery profile items"
  ON discovery_profile_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'discovery_interactions'::regclass
      AND conname = 'discovery_interactions_action_check'
  ) THEN
    ALTER TABLE discovery_interactions
      DROP CONSTRAINT discovery_interactions_action_check;
  END IF;

  ALTER TABLE discovery_interactions
    ADD CONSTRAINT discovery_interactions_action_check
    CHECK (action IN (
      'impression',
      'ignore',
      'click',
      'love',
      'hate',
      'hide',
      'save',
      'pin',
      'unpin',
      'dismiss',
      'undismiss',
      'long_dwell',
      'quick_back',
      'search_submit',
      'inquiry_started',
      'inquiry_submitted',
      'book',
      'booking'
    ));
END $$;
