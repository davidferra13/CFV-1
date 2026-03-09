-- Hub Share Cards
-- Frozen social-media-shareable snapshots of a dinner circle experience.
-- Public read (anyone with the token), service-role write.

CREATE TABLE IF NOT EXISTS hub_share_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  group_id      UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- What the creator chose to include
  included_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. { "menu": true, "chef": true, "theme": true, "photos": true, "photo_ids": ["..."] }

  -- Frozen snapshot at time of creation (never changes)
  snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. {
  --   "group_name": "Sarah's Birthday Dinner",
  --   "group_emoji": "🎂",
  --   "theme_name": "Elegant Evening",
  --   "theme_colors": { "primary": "#...", "secondary": "#..." },
  --   "chef_name": "Chef David",
  --   "chef_business": "David's Kitchen",
  --   "occasion": "Birthday",
  --   "event_date": "2026-03-15",
  --   "guest_count": 8,
  --   "courses": [{ "name": "Amuse-Bouche", "dishes": ["Tuna Tartare", "..."] }],
  --   "photos": [{ "url": "...", "caption": "..." }],
  --   "cover_image_url": "..."
  -- }

  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast public lookups
CREATE INDEX idx_hub_share_cards_share_token ON hub_share_cards(share_token) WHERE is_active = true;
CREATE INDEX idx_hub_share_cards_group_id ON hub_share_cards(group_id);

-- RLS
ALTER TABLE hub_share_cards ENABLE ROW LEVEL SECURITY;

-- Anyone can read active share cards (public link access)
CREATE POLICY "hub_share_cards_select_public"
  ON hub_share_cards FOR SELECT
  USING (is_active = true);

-- Service role handles all writes
CREATE POLICY "hub_share_cards_service_all"
  ON hub_share_cards FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant anon read access
GRANT SELECT ON hub_share_cards TO anon;
GRANT ALL ON hub_share_cards TO service_role;
