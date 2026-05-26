-- Series Circles: Persistent Multi-Host Communities
-- Creates all tables for the Series Circles feature.
-- Additive only: no existing columns modified or removed.

-- 1. Series config JSONB on hub_groups
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS series_config JSONB DEFAULT NULL;
COMMENT ON COLUMN hub_groups.series_config IS
  'Master config for series circles: modules, farm, venue, expectations, widgets, early access, transparency settings.';

-- 2. Vanity slug for /s/{slug} URLs
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS series_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_groups_series_slug
  ON hub_groups(series_slug) WHERE series_slug IS NOT NULL;

-- 3. Series hosts (equal co-ownership)
CREATE TABLE IF NOT EXISTS series_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Identity: ChefFlow user OR external collaborator
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES chefs(id),

  -- External host identity (when not a ChefFlow user)
  external_name TEXT,
  external_email TEXT,
  external_bio TEXT,
  external_avatar_url TEXT,
  external_role TEXT,

  -- Host metadata
  display_name TEXT NOT NULL,
  display_role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,

  -- Permissions (all equal by default)
  can_create_events BOOLEAN NOT NULL DEFAULT true,
  can_publish_posts BOOLEAN NOT NULL DEFAULT true,
  can_manage_members BOOLEAN NOT NULL DEFAULT true,
  can_manage_tickets BOOLEAN NOT NULL DEFAULT true,
  can_manage_finances BOOLEAN NOT NULL DEFAULT true,
  can_edit_series BOOLEAN NOT NULL DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(series_id, user_id),
  UNIQUE(series_id, external_email)
);

CREATE INDEX IF NOT EXISTS idx_series_hosts_user
  ON series_hosts(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_series_hosts_series
  ON series_hosts(series_id) WHERE status != 'removed';

-- 4. Series posts (rich content feed)
CREATE TABLE IF NOT EXISTS series_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),

  post_type TEXT NOT NULL CHECK (post_type IN (
    'update', 'sourcing', 'menu_preview', 'behind_scenes',
    'announcement', 'recap', 'transparency', 'milestone'
  )),
  title TEXT,
  body TEXT NOT NULL,

  image_urls TEXT[] DEFAULT '{}',
  link_url TEXT,
  link_label TEXT,

  event_id UUID REFERENCES events(id),

  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('members', 'public')),

  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_series_posts_feed
  ON series_posts(series_id, published_at DESC) WHERE archived_at IS NULL;

-- 5. Series event history (timeline snapshots)
CREATE TABLE IF NOT EXISTS series_event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),

  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  guest_count INTEGER,
  menu_summary TEXT,
  menu_highlights TEXT[],

  cover_photo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',

  tickets_sold INTEGER,
  revenue_cents INTEGER,

  host_recap TEXT,
  guest_favorites TEXT[],

  visible_to_members BOOLEAN NOT NULL DEFAULT true,
  visible_to_public BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(series_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_series_event_history_timeline
  ON series_event_history(series_id, event_date DESC);

-- 6. Series menu drafts (collaborative menu builder)
CREATE TABLE IF NOT EXISTS series_menu_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  status TEXT NOT NULL DEFAULT 'brainstorming'
    CHECK (status IN ('brainstorming', 'draft', 'review', 'locked', 'published')),
  menu_data JSONB NOT NULL DEFAULT '{}',
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES series_hosts(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Host planning threads
CREATE TABLE IF NOT EXISTS series_host_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  thread_type TEXT NOT NULL DEFAULT 'general'
    CHECK (thread_type IN ('general','menu','logistics','sourcing','equipment','budget','day_of')),
  subject TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS series_host_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES series_host_threads(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),
  body TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  reply_to_id UUID REFERENCES series_host_thread_messages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Prep schedule blocks
CREATE TABLE IF NOT EXISTS series_prep_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  assigned_host_id UUID NOT NULL REFERENCES series_hosts(id),
  title TEXT NOT NULL,
  tasks TEXT[] DEFAULT '{}',
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  access_needed BOOLEAN NOT NULL DEFAULT false,
  access_notes TEXT,
  access_confirmed BOOLEAN NOT NULL DEFAULT false,
  equipment_needed TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','confirmed','in_progress','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Equipment and supplies
CREATE TABLE IF NOT EXISTS series_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  category TEXT NOT NULL
    CHECK (category IN ('dishware','linens','cooking_equipment','serving','furniture','decor','other')),
  name TEXT NOT NULL,
  quantity INTEGER,
  quantity_needed INTEGER,
  provided_by UUID REFERENCES series_hosts(id),
  provider_notes TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'needed'
    CHECK (status IN ('needed','claimed','confirmed','on_site')),
  is_series_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Shared pre-event checklist
CREATE TABLE IF NOT EXISTS series_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  task TEXT NOT NULL,
  assigned_to UUID REFERENCES series_hosts(id),
  due_date DATE,
  category TEXT NOT NULL DEFAULT 'logistics'
    CHECK (category IN ('prep','sourcing','equipment','logistics','communication','day_of','post_event')),
  priority TEXT NOT NULL DEFAULT 'important'
    CHECK (priority IN ('critical','important','nice_to_have')),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES series_hosts(id),
  notes TEXT,
  auto_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Host expense tracking
CREATE TABLE IF NOT EXISTS series_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  host_id UUID NOT NULL REFERENCES series_hosts(id),
  category TEXT NOT NULL
    CHECK (category IN ('ingredients','equipment','venue','labor','marketing','other')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  receipt_photo_url TEXT,
  expense_date DATE NOT NULL,
  reimbursable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Event parent link
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_circle_id UUID REFERENCES hub_groups(id);
COMMENT ON COLUMN events.series_circle_id IS
  'Parent Series Circle for events produced inside a series. Multiple events per series.';
CREATE INDEX IF NOT EXISTS idx_events_series_circle
  ON events(series_circle_id) WHERE series_circle_id IS NOT NULL;

-- 13. Early access timing on event share settings
ALTER TABLE event_share_settings ADD COLUMN IF NOT EXISTS public_sale_opens_at TIMESTAMPTZ;
COMMENT ON COLUMN event_share_settings.public_sale_opens_at IS
  'When public ticket sales open. Before this time, only series members can purchase.';

-- 14. Member notification preferences for series
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS series_notify_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS series_notify_posts BOOLEAN NOT NULL DEFAULT true;
