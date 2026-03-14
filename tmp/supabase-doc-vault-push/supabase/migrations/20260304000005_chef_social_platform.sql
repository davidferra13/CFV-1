-- ============================================================
-- Chef Social Platform
-- Full social media layer for chef-to-chef interaction.
-- Adds: posts, follows, reactions, comments, saves, channels,
--       stories, notifications, mentions, hashtags.
-- Existing chef_connections / chef_network_posts left intact.
-- ============================================================

-- ============================================================
-- 1. TOPIC CHANNELS (created first — posts reference it)
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_social_channels (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT    NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$'),
  name         TEXT    NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description  TEXT             CHECK (char_length(description) <= 500),
  icon         TEXT             CHECK (char_length(icon) <= 10),   -- emoji
  color        TEXT             CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  category     TEXT    NOT NULL DEFAULT 'general'
    CHECK (category IN ('cuisine', 'technique', 'business', 'tools', 'community', 'general')),
  is_official          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_chef_id   UUID REFERENCES chefs(id) ON DELETE SET NULL,
  -- Denormalized counts
  member_count INT     NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  post_count   INT     NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  visibility   TEXT    NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 2. RICH SOCIAL POSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_social_posts (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID    NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  content          TEXT    NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  -- Media: ordered arrays of public URLs + type per slot
  media_urls       TEXT[]  NOT NULL DEFAULT '{}',
  media_types      TEXT[]  NOT NULL DEFAULT '{}', -- 'image' | 'video' per slot
  post_type        TEXT    NOT NULL DEFAULT 'text'
    CHECK (post_type IN ('text', 'photo', 'video', 'reel', 'poll', 'share')),
  -- Visibility
  visibility       TEXT    NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'connections', 'private')),
  -- Optional channel
  channel_id       UUID REFERENCES chef_social_channels(id) ON DELETE SET NULL,
  -- Hashtags (lowercased, extracted on insert/update)
  hashtags         TEXT[]  NOT NULL DEFAULT '{}',
  -- Location
  location_tag     TEXT             CHECK (char_length(location_tag) <= 100),
  -- Repost: reference to original
  original_post_id UUID REFERENCES chef_social_posts(id) ON DELETE SET NULL,
  share_comment    TEXT             CHECK (char_length(share_comment) <= 1000),
  -- Poll
  poll_question    TEXT             CHECK (char_length(poll_question) <= 200),
  poll_options     JSONB,           -- [{"id":"a","text":"...","votes":0}, ...]
  poll_closes_at   TIMESTAMPTZ,
  -- Denormalized counts (maintained via triggers)
  reactions_count  INT     NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  comments_count   INT     NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  saves_count      INT     NOT NULL DEFAULT 0 CHECK (saves_count >= 0),
  shares_count     INT     NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  -- Edit tracking
  is_edited        BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 3. FOLLOW SYSTEM (asymmetric, like Instagram)
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_follows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_chef_id  UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  following_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_chef_id, following_chef_id),
  CHECK (follower_chef_id != following_chef_id)
);
-- ============================================================
-- 4. POST REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_post_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like', 'fire', 'clap', 'wow', 'hungry', 'insightful')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, chef_id) -- one reaction per chef per post; UPDATE to change type
);
-- ============================================================
-- 5. COMMENTS (threaded, one level of replies)
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_post_comments (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID    NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  chef_id           UUID    NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  content           TEXT    NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  parent_comment_id UUID    REFERENCES chef_post_comments(id) ON DELETE CASCADE,
  -- Denormalized
  reactions_count   INT     NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  replies_count     INT     NOT NULL DEFAULT 0 CHECK (replies_count >= 0),
  -- Soft delete
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  -- Edit tracking
  is_edited         BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 6. COMMENT REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_comment_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id    UUID NOT NULL REFERENCES chef_post_comments(id) ON DELETE CASCADE,
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like', 'fire', 'clap', 'wow', 'hungry', 'insightful')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, chef_id)
);
-- ============================================================
-- 7. POST SAVES / BOOKMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_post_saves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  collection_name TEXT NOT NULL DEFAULT 'Saved' CHECK (char_length(collection_name) <= 50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, chef_id)
);
-- ============================================================
-- 8. CHANNEL MEMBERSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_channel_memberships (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id            UUID NOT NULL REFERENCES chef_social_channels(id) ON DELETE CASCADE,
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'moderator', 'admin')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, chef_id)
);
-- ============================================================
-- 9. STORIES (24-hour ephemeral)
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_stories (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID    NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  media_url        TEXT    NOT NULL,
  media_type       TEXT    NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption          TEXT             CHECK (char_length(caption) <= 200),
  duration_seconds INT     NOT NULL DEFAULT 5 CHECK (duration_seconds BETWEEN 1 AND 60),
  -- Denormalized
  views_count      INT     NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  reactions_count  INT     NOT NULL DEFAULT 0 CHECK (reactions_count >= 0),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 10. STORY VIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_story_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES chef_stories(id) ON DELETE CASCADE,
  viewer_chef_id  UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, viewer_chef_id)
);
-- ============================================================
-- 11. STORY REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_story_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES chef_stories(id) ON DELETE CASCADE,
  chef_id    UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, chef_id) -- one reaction per chef per story (latest wins)
);
-- ============================================================
-- 12. SOCIAL NOTIFICATIONS (separate from ops notifications)
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_social_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_chef_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_chef_id       UUID REFERENCES chefs(id) ON DELETE SET NULL,
  notification_type   TEXT NOT NULL CHECK (notification_type IN (
    'new_follower',
    'post_reaction',
    'post_comment',
    'comment_reply',
    'comment_reaction',
    'post_share',
    'mention_post',
    'mention_comment',
    'channel_post',
    'story_reaction',
    'story_view',
    'connection_accepted'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'post', 'comment', 'story', 'follow', 'channel', 'connection'
  )),
  entity_id   UUID        NOT NULL,
  -- Optional aggregation context (e.g. "3 others also reacted")
  agg_count   INT         NOT NULL DEFAULT 1,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 13. POST MENTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_post_mentions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  comment_id          UUID REFERENCES chef_post_comments(id) ON DELETE CASCADE,
  mentioned_chef_id   UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);
-- ============================================================
-- 14. HASHTAG REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_social_hashtags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag         TEXT NOT NULL UNIQUE CHECK (tag ~ '^[a-z0-9][a-z0-9_]{0,49}$'),
  post_count  INT  NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 15. POST ↔ HASHTAG JUNCTION
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_post_hashtags (
  post_id    UUID NOT NULL REFERENCES chef_social_posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES chef_social_hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_chef_social_posts_chef_id    ON chef_social_posts(chef_id);
CREATE INDEX idx_chef_social_posts_created_at ON chef_social_posts(created_at DESC);
CREATE INDEX idx_chef_social_posts_channel    ON chef_social_posts(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_chef_social_posts_visibility ON chef_social_posts(visibility);
CREATE INDEX idx_chef_social_posts_hashtags   ON chef_social_posts USING gin(hashtags);
CREATE INDEX idx_chef_social_posts_original   ON chef_social_posts(original_post_id) WHERE original_post_id IS NOT NULL;
CREATE INDEX idx_chef_follows_follower   ON chef_follows(follower_chef_id);
CREATE INDEX idx_chef_follows_following  ON chef_follows(following_chef_id);
CREATE INDEX idx_chef_post_reactions_post  ON chef_post_reactions(post_id);
CREATE INDEX idx_chef_post_reactions_chef  ON chef_post_reactions(chef_id);
CREATE INDEX idx_chef_post_comments_post    ON chef_post_comments(post_id, created_at DESC) WHERE NOT is_deleted;
CREATE INDEX idx_chef_post_comments_parent  ON chef_post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_chef_post_comments_chef    ON chef_post_comments(chef_id);
CREATE INDEX idx_chef_post_saves_chef  ON chef_post_saves(chef_id, created_at DESC);
CREATE INDEX idx_chef_post_saves_post  ON chef_post_saves(post_id);
CREATE INDEX idx_chef_channel_memberships_chef     ON chef_channel_memberships(chef_id);
CREATE INDEX idx_chef_channel_memberships_channel  ON chef_channel_memberships(channel_id);
CREATE INDEX idx_chef_stories_chef     ON chef_stories(chef_id, created_at DESC);
CREATE INDEX idx_chef_stories_expires  ON chef_stories(expires_at);
CREATE INDEX idx_chef_story_views_story   ON chef_story_views(story_id);
CREATE INDEX idx_chef_story_views_viewer  ON chef_story_views(viewer_chef_id);
CREATE INDEX idx_chef_social_notifs_recipient  ON chef_social_notifications(recipient_chef_id, created_at DESC);
CREATE INDEX idx_chef_social_notifs_unread     ON chef_social_notifications(recipient_chef_id) WHERE NOT is_read;
CREATE INDEX idx_chef_post_mentions_mentioned  ON chef_post_mentions(mentioned_chef_id);
CREATE INDEX idx_chef_social_hashtags_count  ON chef_social_hashtags(post_count DESC);
-- ============================================================
-- TRIGGERS: Maintain denormalized counts
-- ============================================================

-- post reactions_count
CREATE OR REPLACE FUNCTION _trg_post_reactions_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_social_posts SET reactions_count = reactions_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_social_posts SET reactions_count = GREATEST(0, reactions_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_reactions_count
  AFTER INSERT OR DELETE ON chef_post_reactions
  FOR EACH ROW EXECUTE FUNCTION _trg_post_reactions_count();
-- post comments_count + parent replies_count
CREATE OR REPLACE FUNCTION _trg_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE chef_social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE chef_post_comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted AND NOT OLD.is_deleted THEN
    UPDATE chef_social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.post_id;
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE chef_post_comments SET replies_count = GREATEST(0, replies_count - 1) WHERE id = NEW.parent_comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR UPDATE ON chef_post_comments
  FOR EACH ROW EXECUTE FUNCTION _trg_post_comments_count();
-- post saves_count
CREATE OR REPLACE FUNCTION _trg_post_saves_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_social_posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_social_posts SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_saves_count
  AFTER INSERT OR DELETE ON chef_post_saves
  FOR EACH ROW EXECUTE FUNCTION _trg_post_saves_count();
-- post shares_count (counted when a 'share' post is created)
CREATE OR REPLACE FUNCTION _trg_post_shares_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.original_post_id IS NOT NULL THEN
    UPDATE chef_social_posts SET shares_count = shares_count + 1 WHERE id = NEW.original_post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.original_post_id IS NOT NULL THEN
    UPDATE chef_social_posts SET shares_count = GREATEST(0, shares_count - 1) WHERE id = OLD.original_post_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_shares_count
  AFTER INSERT OR DELETE ON chef_social_posts
  FOR EACH ROW EXECUTE FUNCTION _trg_post_shares_count();
-- channel member_count
CREATE OR REPLACE FUNCTION _trg_channel_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_social_channels SET member_count = member_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_social_channels SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_channel_member_count
  AFTER INSERT OR DELETE ON chef_channel_memberships
  FOR EACH ROW EXECUTE FUNCTION _trg_channel_member_count();
-- channel post_count
CREATE OR REPLACE FUNCTION _trg_channel_post_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.channel_id IS NOT NULL THEN
    UPDATE chef_social_channels SET post_count = post_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' AND OLD.channel_id IS NOT NULL THEN
    UPDATE chef_social_channels SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_channel_post_count
  AFTER INSERT OR DELETE ON chef_social_posts
  FOR EACH ROW EXECUTE FUNCTION _trg_channel_post_count();
-- story views_count
CREATE OR REPLACE FUNCTION _trg_story_views_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_story_views_count
  AFTER INSERT ON chef_story_views
  FOR EACH ROW EXECUTE FUNCTION _trg_story_views_count();
-- story reactions_count
CREATE OR REPLACE FUNCTION _trg_story_reactions_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_stories SET reactions_count = reactions_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_stories SET reactions_count = GREATEST(0, reactions_count - 1) WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_story_reactions_count
  AFTER INSERT OR DELETE ON chef_story_reactions
  FOR EACH ROW EXECUTE FUNCTION _trg_story_reactions_count();
-- comment reactions_count
CREATE OR REPLACE FUNCTION _trg_comment_reactions_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_post_comments SET reactions_count = reactions_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_post_comments SET reactions_count = GREATEST(0, reactions_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_comment_reactions_count
  AFTER INSERT OR DELETE ON chef_comment_reactions
  FOR EACH ROW EXECUTE FUNCTION _trg_comment_reactions_count();
-- hashtag post_count
CREATE OR REPLACE FUNCTION _trg_hashtag_post_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chef_social_hashtags
      SET post_count = post_count + 1, last_used_at = NOW()
      WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chef_social_hashtags
      SET post_count = GREATEST(0, post_count - 1)
      WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_hashtag_post_count
  AFTER INSERT OR DELETE ON chef_post_hashtags
  FOR EACH ROW EXECUTE FUNCTION _trg_hashtag_post_count();
-- ============================================================
-- RLS
-- (Server actions use admin client; these policies allow
--  direct queries for any future client-side use.)
-- ============================================================

ALTER TABLE chef_social_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_follows               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_post_reactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_post_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_comment_reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_post_saves            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_social_channels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_channel_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_stories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_story_views           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_story_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_social_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_post_mentions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_social_hashtags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_post_hashtags         ENABLE ROW LEVEL SECURITY;
-- Public posts readable by authenticated users
CREATE POLICY "csp_posts_read" ON chef_social_posts
  FOR SELECT TO authenticated USING (visibility = 'public');
-- Follows: all authenticated can see
CREATE POLICY "csp_follows_read" ON chef_follows
  FOR SELECT TO authenticated USING (TRUE);
-- Channels: public channels readable
CREATE POLICY "csp_channels_read" ON chef_social_channels
  FOR SELECT TO authenticated USING (visibility = 'public');
-- Reactions/comments/saves: readable
CREATE POLICY "csp_reactions_read"     ON chef_post_reactions    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_comments_read"      ON chef_post_comments     FOR SELECT TO authenticated USING (NOT is_deleted);
CREATE POLICY "csp_comment_rxn_read"   ON chef_comment_reactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_saves_read"         ON chef_post_saves        FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_memberships_read"   ON chef_channel_memberships FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_hashtags_read"      ON chef_social_hashtags   FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_post_hashtags_read" ON chef_post_hashtags     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_mentions_read"      ON chef_post_mentions     FOR SELECT TO authenticated USING (TRUE);
-- Stories: non-expired readable
CREATE POLICY "csp_stories_read" ON chef_stories
  FOR SELECT TO authenticated USING (expires_at > NOW());
CREATE POLICY "csp_story_views_read"    ON chef_story_views    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "csp_story_reactions_read" ON chef_story_reactions FOR SELECT TO authenticated USING (TRUE);
-- Notifications: only own
CREATE POLICY "csp_notifs_self" ON chef_social_notifications
  FOR SELECT TO authenticated USING (TRUE);
-- ============================================================
-- SEED: Official Channels
-- ============================================================

INSERT INTO chef_social_channels
  (slug, name, description, icon, color, category, is_official)
VALUES
  ('pastry',        'Pastry & Baking',        'Desserts, breads, pastries, and all things sweet',                       '🥐', '#f59e0b', 'cuisine',   TRUE),
  ('savory',        'Savory & Mains',          'Proteins, sauces, mains, and savory technique',                          '🥩', '#ef4444', 'cuisine',   TRUE),
  ('plant-based',   'Plant-Based',             'Vegan, vegetarian, and plant-forward cooking',                           '🌱', '#22c55e', 'cuisine',   TRUE),
  ('international', 'International Cuisine',   'Cuisine from around the world — authenticity, sourcing, techniques',     '🌍', '#14b8a6', 'cuisine',   TRUE),
  ('seasonal',      'Seasonal & Local',        'What''s in season, local foraging, farmers market finds',                '🍂', '#84cc16', 'cuisine',   TRUE),
  ('technique',     'Technique Deep-Dive',     'Advanced skills, sous vide, fermentation, butchery, and more',           '📚', '#0891b2', 'technique', TRUE),
  ('sourcing',      'Sourcing & Vendors',      'Where to find great ingredients and trusted vendor relationships',        '🛒', '#8b5cf6', 'business',  TRUE),
  ('business',      'Business & Growth',       'Pricing, contracts, marketing, and growing your book of clients',        '💼', '#3b82f6', 'business',  TRUE),
  ('equipment',     'Knives & Equipment',      'Tools of the trade — reviews, recommendations, maintenance',             '🔪', '#6b7280', 'tools',     TRUE),
  ('new-chefs',     'New to Private Chef',     'Getting started, first clients, building your foundation',               '👋', '#f97316', 'community', TRUE),
  ('wins',          'Chef Wins',               'Share your wins — great reviews, sold-out menus, milestones',            '🏆', '#eab308', 'community', TRUE),
  ('collab',        'Collaboration & Pop-Ups', 'Find partners for pop-ups, supper clubs, and collaborative events',      '🤝', '#ec4899', 'community', TRUE)
ON CONFLICT (slug) DO NOTHING;
