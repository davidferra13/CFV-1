-- ============================================
-- CHEF NETWORK FEED
-- ============================================
-- Adds lightweight text posts for the chef network.
-- Visibility is limited to:
-- 1) the post author
-- 2) chefs with an accepted connection to the author
-- ============================================

CREATE TABLE chef_network_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chef_network_posts_content_length
    CHECK (char_length(trim(content)) BETWEEN 1 AND 1000)
);

COMMENT ON TABLE chef_network_posts IS
  'Cross-tenant chef network feed posts. Visible to self + accepted connections.';

COMMENT ON COLUMN chef_network_posts.author_chef_id IS
  'Chef who authored the post.';

CREATE INDEX idx_chef_network_posts_author_created
  ON chef_network_posts(author_chef_id, created_at DESC);

CREATE INDEX idx_chef_network_posts_created
  ON chef_network_posts(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chef_network_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_network_posts_select_visible ON chef_network_posts;
CREATE POLICY chef_network_posts_select_visible ON chef_network_posts
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND (
      author_chef_id = get_current_tenant_id()
      OR are_chefs_connected(author_chef_id, get_current_tenant_id())
    )
  );

DROP POLICY IF EXISTS chef_network_posts_insert_own ON chef_network_posts;
CREATE POLICY chef_network_posts_insert_own ON chef_network_posts
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND author_chef_id = get_current_tenant_id()
  );

COMMENT ON POLICY chef_network_posts_select_visible ON chef_network_posts IS
  'Chefs can read posts from themselves and accepted connections.';

COMMENT ON POLICY chef_network_posts_insert_own ON chef_network_posts IS
  'Chefs can only create posts as themselves.';
