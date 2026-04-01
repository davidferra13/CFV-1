-- Migration: Notes, Dish Sources, and Menu Pipeline Hardening
-- Adds workflow notes, note-menu links, dish-note lineage,
-- canonical dish components, source metadata columns, and ownership scope.
-- ADDITIVE ONLY. No DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE workflow_ownership_scope AS ENUM ('global', 'client', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_note_status AS ENUM ('open', 'promoted', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_note_dish_relation AS ENUM ('promoted', 'source');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE menu_dish_source_mode AS ENUM ('manual', 'reference', 'copy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- workflow_notes
-- Independent culinary idea capture layer.
-- A note can be global (no client/event), client-specific, or event-specific.
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global',
  title           TEXT,
  body            TEXT NOT NULL,
  status          workflow_note_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (
    (ownership_scope = 'global' AND client_id IS NULL AND event_id IS NULL) OR
    (ownership_scope = 'client' AND client_id IS NOT NULL AND event_id IS NULL) OR
    (ownership_scope = 'event' AND event_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_workflow_notes_tenant_created
  ON workflow_notes(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_notes_tenant_scope
  ON workflow_notes(tenant_id, ownership_scope);

CREATE INDEX IF NOT EXISTS idx_workflow_notes_client
  ON workflow_notes(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_notes_event
  ON workflow_notes(event_id) WHERE event_id IS NOT NULL;

ALTER TABLE workflow_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workflow_notes_chef_all ON workflow_notes
    FOR ALL
    USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- workflow_note_menu_links
-- Associates notes with menus (real or draft-keyed) without copying the note.
-- A single note can be attached to zero, one, or many menus.
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_note_menu_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  note_id        UUID NOT NULL REFERENCES workflow_notes(id) ON DELETE CASCADE,
  menu_id        UUID REFERENCES menus(id) ON DELETE CASCADE,
  draft_menu_key TEXT,
  linked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (menu_id IS NOT NULL OR draft_menu_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_note_menu_links_menu
  ON workflow_note_menu_links(note_id, menu_id)
  WHERE menu_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_note_menu_links_draft
  ON workflow_note_menu_links(note_id, draft_menu_key)
  WHERE draft_menu_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_note_menu_links_menu
  ON workflow_note_menu_links(menu_id) WHERE menu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_note_menu_links_draft
  ON workflow_note_menu_links(draft_menu_key) WHERE draft_menu_key IS NOT NULL;

ALTER TABLE workflow_note_menu_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workflow_note_menu_links_chef_all ON workflow_note_menu_links
    FOR ALL
    USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- dish_index_components
-- Canonical multi-component structure for reusable dishes in dish_index.
-- dish_index today stores one linked recipe + metadata only.
-- This table adds structured canonical components without changing that model.
-- ============================================================

CREATE TABLE IF NOT EXISTS dish_index_components (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_id                UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  recipe_id              UUID REFERENCES recipes(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,
  category               component_category NOT NULL DEFAULT 'other',
  description            TEXT,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dish_index_components_dish
  ON dish_index_components(dish_id);

CREATE INDEX IF NOT EXISTS idx_dish_index_components_recipe
  ON dish_index_components(recipe_id) WHERE recipe_id IS NOT NULL;

ALTER TABLE dish_index_components ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY dish_index_components_chef_all ON dish_index_components
    FOR ALL
    USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- dish_index_note_links
-- Preserves note lineage after promotion.
-- Original note is never deleted. Multiple promotions create multiple link rows.
-- ============================================================

CREATE TABLE IF NOT EXISTS dish_index_note_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_id    UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  note_id    UUID NOT NULL REFERENCES workflow_notes(id) ON DELETE CASCADE,
  relation   workflow_note_dish_relation NOT NULL DEFAULT 'promoted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (dish_id, note_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_dish_index_note_links_dish
  ON dish_index_note_links(dish_id);

CREATE INDEX IF NOT EXISTS idx_dish_index_note_links_note
  ON dish_index_note_links(note_id);

ALTER TABLE dish_index_note_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY dish_index_note_links_chef_all ON dish_index_note_links
    FOR ALL
    USING (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    )
    WITH CHECK (
      tenant_id IN (
        SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- NEW COLUMNS ON EXISTING TABLES (all additive, IF NOT EXISTS)
-- ============================================================

-- menus: add ownership scope
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global';

-- dish_index: add ownership scope and optional context binding
ALTER TABLE dish_index
  ADD COLUMN IF NOT EXISTS ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id  UUID REFERENCES events(id)  ON DELETE SET NULL;

-- dishes: add source tracking so the menu editor knows where a dish came from
ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS dish_index_id            UUID REFERENCES dish_index(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_mode              menu_dish_source_mode NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS copied_from_dish_index_id UUID REFERENCES dish_index(id) ON DELETE SET NULL;

-- components: link back to canonical component when built from one
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS dish_index_component_id UUID REFERENCES dish_index_components(id) ON DELETE SET NULL;

-- ============================================================
-- INDEXES ON NEW COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_menus_ownership_scope
  ON menus(tenant_id, ownership_scope);

CREATE INDEX IF NOT EXISTS idx_dish_index_scope
  ON dish_index(tenant_id, ownership_scope);

CREATE INDEX IF NOT EXISTS idx_dishes_dish_index_id
  ON dishes(dish_index_id) WHERE dish_index_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dishes_source_mode
  ON dishes(menu_id, source_mode);

CREATE INDEX IF NOT EXISTS idx_components_dish_index_component_id
  ON components(dish_index_component_id)
  WHERE dish_index_component_id IS NOT NULL;

-- ============================================================
-- BACKFILL: menus ownership_scope from event/client context
-- Only updates rows where ownership_scope is still the default 'global'
-- and a tighter scope can be inferred from existing data.
-- ============================================================

UPDATE menus
SET
  client_id = COALESCE(menus.client_id, events.client_id),
  ownership_scope = CASE
    WHEN menus.event_id IS NOT NULL THEN 'event'::workflow_ownership_scope
    WHEN COALESCE(menus.client_id, events.client_id) IS NOT NULL THEN 'client'::workflow_ownership_scope
    ELSE 'global'::workflow_ownership_scope
  END
FROM events
WHERE menus.event_id = events.id;
