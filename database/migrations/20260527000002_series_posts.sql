-- ============================================
-- SERIES POSTS (Content & Feed System)
-- ============================================
-- Rich content posts for Series Circles.
-- Hosts publish titled, typed, pinnable content
-- between events. Separate from hub_messages.
-- ADDITIVE ONLY.
-- ============================================

CREATE TABLE IF NOT EXISTS series_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),

  post_type TEXT NOT NULL CHECK (post_type IN (
    'update',
    'sourcing',
    'menu_preview',
    'behind_scenes',
    'announcement',
    'recap',
    'transparency',
    'milestone'
  )),
  title TEXT,
  body TEXT NOT NULL,

  image_urls TEXT[] DEFAULT '{}',
  link_url TEXT,
  link_label TEXT,

  event_id UUID REFERENCES events(id),

  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN (
    'members',
    'public'
  )),

  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_series_posts_feed ON series_posts(series_id, published_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX idx_series_posts_author ON series_posts(author_host_id);

CREATE INDEX idx_series_posts_event ON series_posts(event_id)
  WHERE event_id IS NOT NULL;
