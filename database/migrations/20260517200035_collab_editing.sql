-- Collaborative Menu Editing: turn-based chef+client co-editing of menus.
-- Additive only. No DROP, DELETE, or TRUNCATE.

-- ---- Enums -----------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE menu_edit_session_status AS ENUM (
    'draft',
    'submitted',
    'accepted',
    'rejected',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE menu_change_type AS ENUM (
    'swap_dish',
    'remove_dish',
    'add_dish',
    'reorder',
    'modify_component',
    'add_course',
    'remove_course',
    'comment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE menu_change_resolution AS ENUM (
    'pending',
    'approved',
    'rejected',
    'modified'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE menu_editor_type AS ENUM (
    'chef',
    'client',
    'co_host'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- Tables ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS menu_collab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  editor_type menu_editor_type NOT NULL,
  editor_id UUID NOT NULL,

  forked_from_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,

  version_number INTEGER NOT NULL DEFAULT 1,
  base_snapshot JSONB NOT NULL DEFAULT '{}',
  proposed_snapshot JSONB,

  current_turn menu_editor_type NOT NULL DEFAULT 'client',
  turn_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  status menu_edit_session_status NOT NULL DEFAULT 'draft',
  client_token TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_menu ON menu_collab_sessions(menu_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_event ON menu_collab_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_tenant ON menu_collab_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_editor ON menu_collab_sessions(editor_type, editor_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_token ON menu_collab_sessions(client_token) WHERE client_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collab_sessions_turn ON menu_collab_sessions(current_turn, status)
  WHERE status IN ('draft', 'submitted');

CREATE TABLE IF NOT EXISTS menu_edit_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES menu_collab_sessions(id) ON DELETE CASCADE,

  change_type menu_change_type NOT NULL,
  target_dish_id UUID,
  target_course_name TEXT,
  target_course_number INTEGER,

  change_data JSONB NOT NULL DEFAULT '{}',

  resolution menu_change_resolution NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  counter_proposal JSONB,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_edit_suggestions_session ON menu_edit_suggestions(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_edit_suggestions_pending ON menu_edit_suggestions(session_id)
  WHERE resolution = 'pending';

CREATE TABLE IF NOT EXISTS menu_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  session_id UUID REFERENCES menu_collab_sessions(id) ON DELETE SET NULL,

  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,

  author_type menu_editor_type NOT NULL,
  author_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edit_history_menu ON menu_edit_history(menu_id, version_number);

-- ---- RLS -------------------------------------------------------------------

ALTER TABLE menu_collab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_edit_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_edit_history ENABLE ROW LEVEL SECURITY;

-- Chef sees all sessions for their tenant
CREATE POLICY collab_sessions_chef_all ON menu_collab_sessions
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- Service role full access
CREATE POLICY collab_sessions_service ON menu_collab_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Suggestions follow session access
CREATE POLICY edit_suggestions_chef ON menu_edit_suggestions
  FOR ALL TO authenticated
  USING (session_id IN (
    SELECT id FROM menu_collab_sessions
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  ));

CREATE POLICY edit_suggestions_service ON menu_edit_suggestions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- History follows menu access
CREATE POLICY edit_history_chef ON menu_edit_history
  FOR ALL TO authenticated
  USING (menu_id IN (
    SELECT id FROM menus
    WHERE tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  ));

CREATE POLICY edit_history_service ON menu_edit_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
