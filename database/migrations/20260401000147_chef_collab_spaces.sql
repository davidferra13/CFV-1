-- ============================================================
-- Chef Collab Spaces
-- Private chef-only workspaces for ongoing collaboration.
-- Additive to existing chef_connections + chef_handoffs systems.
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_collab_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  space_type TEXT NOT NULL
    CHECK (space_type IN ('direct', 'workspace')),
  name TEXT,
  description TEXT,
  direct_pair_key TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_spaces_workspace_name_check CHECK (
    (space_type = 'workspace' AND name IS NOT NULL AND char_length(trim(name)) BETWEEN 1 AND 120)
    OR (space_type = 'direct' AND name IS NULL)
  ),
  CONSTRAINT chef_collab_spaces_direct_pair_check CHECK (
    (space_type = 'direct' AND direct_pair_key IS NOT NULL)
    OR (space_type = 'workspace' AND direct_pair_key IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_spaces_direct_pair
  ON chef_collab_spaces(direct_pair_key)
  WHERE space_type = 'direct' AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_chef_collab_spaces_last_message
  ON chef_collab_spaces(last_message_at DESC NULLS LAST, created_at DESC);

COMMENT ON TABLE chef_collab_spaces IS
  'Private chef-only workspaces used for recurring collaboration outside of client Dinner Circles.';

CREATE TABLE IF NOT EXISTS chef_collab_space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES chef_collab_spaces(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member')),
  notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_space_members_unique UNIQUE (space_id, chef_id)
);

CREATE INDEX IF NOT EXISTS idx_chef_collab_space_members_space
  ON chef_collab_space_members(space_id, joined_at ASC);

CREATE INDEX IF NOT EXISTS idx_chef_collab_space_members_chef
  ON chef_collab_space_members(chef_id, joined_at DESC);

COMMENT ON TABLE chef_collab_space_members IS
  'Chef membership for private collab spaces. No clients or guest profiles allowed.';

CREATE TABLE IF NOT EXISTS chef_collab_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES chef_collab_spaces(id) ON DELETE CASCADE,
  created_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL DEFAULT 'topic'
    CHECK (thread_type IN ('general', 'starter', 'topic')),
  starter_key TEXT
    CHECK (starter_key IS NULL OR starter_key IN ('general', 'leads', 'handoffs', 'travel', 'references')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_threads_unique_title_per_space UNIQUE (space_id, title)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_threads_one_general
  ON chef_collab_threads(space_id)
  WHERE thread_type = 'general';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_threads_starter_key
  ON chef_collab_threads(space_id, starter_key)
  WHERE starter_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_collab_threads_space_activity
  ON chef_collab_threads(space_id, last_message_at DESC NULLS LAST, created_at ASC);

COMMENT ON TABLE chef_collab_threads IS
  'Threads inside a private collab space. Each space gets starter threads plus unlimited custom topics.';

CREATE TABLE IF NOT EXISTS chef_collab_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chef_collab_threads(id) ON DELETE CASCADE,
  sender_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'handoff_reference')),
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_messages_content_check CHECK (
    (message_type = 'text' AND body IS NOT NULL AND char_length(trim(body)) BETWEEN 1 AND 5000)
    OR (message_type IN ('system', 'handoff_reference'))
  )
);

CREATE INDEX IF NOT EXISTS idx_chef_collab_messages_thread
  ON chef_collab_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chef_collab_messages_sender
  ON chef_collab_messages(sender_chef_id, created_at DESC);

COMMENT ON TABLE chef_collab_messages IS
  'Messages inside chef collab threads. Supports text, system events, and handoff reference cards.';

-- Triggers
DROP TRIGGER IF EXISTS trg_chef_collab_spaces_updated_at ON chef_collab_spaces;
CREATE TRIGGER trg_chef_collab_spaces_updated_at
  BEFORE UPDATE ON chef_collab_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chef_collab_threads_updated_at ON chef_collab_threads;
CREATE TRIGGER trg_chef_collab_threads_updated_at
  BEFORE UPDATE ON chef_collab_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
