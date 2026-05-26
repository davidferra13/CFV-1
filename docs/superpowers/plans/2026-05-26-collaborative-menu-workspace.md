# Collaborative Menu Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run /wire-audit before marking done.

**Goal:** Build a standalone menu planning workspace where cohosts brainstorm, draft, poll, and lock a menu, bridging into Dinner Circles for communication and materializing into the existing menu system on lock.

**Architecture:** Standalone route `/menus/workspace/[id]` with 5-stage state machine. 3 core tables + 2 bridge tables. Circle gets system messages via lifecycle hooks. External guests vote via token link at `/menu-collab/[token]`. On lock, workspace items materialize into a real `menus` record via `createMenuWithCourses`.

**Tech Stack:** Next.js App Router, PostgreSQL (Drizzle/postgres.js), Zod validation, hub_guest_profiles identity, hub_polls/hub_messages bridges, CSS custom properties for theming.

**Spec:** `docs/superpowers/specs/2026-05-26-collaborative-menu-workspace-design.md`

---

## File Map

### Database

| File                                                     | Purpose                              |
| -------------------------------------------------------- | ------------------------------------ |
| `database/migrations/20260529000001_menu_workspaces.sql` | All tables, enums, indexes, triggers |

### Lib (server)

| File                                  | Purpose                          |
| ------------------------------------- | -------------------------------- |
| `lib/workspaces/types.ts`             | TS types, Zod schemas, constants |
| `lib/workspaces/actions.ts`           | CRUD, stage transitions, queries |
| `lib/workspaces/tag-actions.ts`       | Tag CRUD, conflict detection     |
| `lib/workspaces/lifecycle-hooks.ts`   | Circle system messages           |
| `lib/workspaces/materialize.ts`       | Lock: workspace -> menu          |
| `lib/workspaces/ingredient-bridge.ts` | Read ingredient board items      |
| `lib/workspaces/poll-bridge.ts`       | Create/link polls                |
| `lib/workspaces/thread-bridge.ts`     | Create/link threads              |

### Components

| File                                            | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `components/workspaces/workspace-shell.tsx`     | Themed layout, stage ribbon, topbar   |
| `components/workspaces/item-card.tsx`           | Universal card (idea/dish/ref/note)   |
| `components/workspaces/tag-picker.tsx`          | Tag assignment per cohost             |
| `components/workspaces/brainstorm-canvas.tsx`   | Card grid + quick-add + filters       |
| `components/workspaces/draft-organizer.tsx`     | Course grouping + parking lot         |
| `components/workspaces/poll-manager.tsx`        | Create/view internal + external polls |
| `components/workspaces/lock-review.tsx`         | Final review + materialize button     |
| `components/workspaces/theme-picker.tsx`        | Preset + emoji picker                 |
| `components/workspaces/sidebar-ingredients.tsx` | Ingredient board sidebar              |
| `components/workspaces/sidebar-activity.tsx`    | Activity feed                         |
| `components/workspaces/sidebar-remy.tsx`        | Remy AI suggestions                   |

### Routes

| File                                                   | Purpose                |
| ------------------------------------------------------ | ---------------------- |
| `app/(chef)/menus/workspace/new/page.tsx`              | Create workspace       |
| `app/(chef)/menus/workspace/[id]/page.tsx`             | Server component shell |
| `app/(chef)/menus/workspace/[id]/workspace-client.tsx` | Client component       |
| `app/(public)/menu-collab/[token]/page.tsx`            | External guest polling |

### Tests

| File                                         | Purpose              |
| -------------------------------------------- | -------------------- |
| `tests/workspaces/workspace-actions.test.ts` | Server action tests  |
| `tests/workspaces/tag-actions.test.ts`       | Tag + conflict tests |
| `tests/workspaces/materialize.test.ts`       | Lock -> menu tests   |
| `tests/workspaces/lifecycle-hooks.test.ts`   | Circle message tests |

---

## Task 1: Migration + Enums

**Files:**

- Create: `database/migrations/20260529000001_menu_workspaces.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Menu Workspace: collaborative menu planning for cohosts
-- Spec: docs/superpowers/specs/2026-05-26-collaborative-menu-workspace-design.md

-- Enums
DO $$ BEGIN
  CREATE TYPE workspace_stage AS ENUM (
    'brainstorm', 'draft', 'internal_poll', 'external_poll', 'locked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workspace_item_type AS ENUM (
    'idea', 'dish', 'note', 'ingredient_ref', 'reference'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core table: menu_workspaces
CREATE TABLE IF NOT EXISTS menu_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  circle_group_id UUID REFERENCES hub_groups(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage workspace_stage NOT NULL DEFAULT 'brainstorm',
  created_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
  locked_at TIMESTAMPTZ,
  materialized_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_workspaces_tenant
  ON menu_workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_workspaces_circle
  ON menu_workspaces(circle_group_id);
CREATE INDEX IF NOT EXISTS idx_menu_workspaces_event
  ON menu_workspaces(event_id);
CREATE INDEX IF NOT EXISTS idx_menu_workspaces_share_token
  ON menu_workspaces(share_token) WHERE share_token IS NOT NULL;

-- Core table: workspace_items
CREATE TABLE IF NOT EXISTS workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES menu_workspaces(id) ON DELETE CASCADE,
  type workspace_item_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  course_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_dish_index_id UUID REFERENCES dish_index(id) ON DELETE SET NULL,
  source_ingredient_board_id UUID REFERENCES circle_ingredient_items(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
  stage_added workspace_stage NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_items_workspace
  ON workspace_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_course
  ON workspace_items(workspace_id, course_label) WHERE course_label IS NOT NULL;

-- Core table: workspace_item_tags
CREATE TABLE IF NOT EXISTS workspace_item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_item_id UUID NOT NULL REFERENCES workspace_items(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tagged_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
  is_system_tag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_item_id, tag_name, tagged_by)
);

CREATE INDEX IF NOT EXISTS idx_workspace_item_tags_item
  ON workspace_item_tags(workspace_item_id);

-- Bridge: workspace_threads -> hub_messages
CREATE TABLE IF NOT EXISTS workspace_threads (
  workspace_item_id UUID NOT NULL REFERENCES workspace_items(id) ON DELETE CASCADE,
  hub_message_thread_id UUID NOT NULL REFERENCES hub_messages(id) ON DELETE CASCADE,
  PRIMARY KEY (workspace_item_id)
);

-- Bridge: workspace_polls -> hub_polls
CREATE TABLE IF NOT EXISTS workspace_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES menu_workspaces(id) ON DELETE CASCADE,
  hub_poll_id UUID NOT NULL REFERENCES hub_polls(id) ON DELETE CASCADE,
  poll_scope TEXT NOT NULL CHECK (poll_scope IN ('internal', 'external')),
  stage workspace_stage NOT NULL,
  course_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_polls_workspace
  ON workspace_polls(workspace_id);

-- Trigger: update updated_at on menu_workspaces
CREATE OR REPLACE FUNCTION update_menu_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menu_workspace_updated
  BEFORE UPDATE ON menu_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_menu_workspace_timestamp();

-- Trigger: update updated_at on workspace_items
CREATE TRIGGER trg_workspace_item_updated
  BEFORE UPDATE ON workspace_items
  FOR EACH ROW EXECUTE FUNCTION update_menu_workspace_timestamp();

-- Stage transition validation
CREATE OR REPLACE FUNCTION validate_workspace_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage = NEW.stage THEN RETURN NEW; END IF;

  IF NOT (
    (OLD.stage = 'brainstorm' AND NEW.stage = 'draft') OR
    (OLD.stage = 'draft' AND NEW.stage IN ('brainstorm', 'internal_poll')) OR
    (OLD.stage = 'internal_poll' AND NEW.stage IN ('draft', 'external_poll')) OR
    (OLD.stage = 'external_poll' AND NEW.stage IN ('internal_poll', 'locked')) OR
    (OLD.stage = 'locked' AND NEW.stage = 'draft')
  ) THEN
    RAISE EXCEPTION 'Invalid workspace stage transition: % -> %', OLD.stage, NEW.stage;
  END IF;

  IF NEW.stage = 'locked' THEN
    NEW.locked_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_workspace_stage
  BEFORE UPDATE OF stage ON menu_workspaces
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_stage_transition();

-- RLS
ALTER TABLE menu_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_workspaces_tenant ON menu_workspaces
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY workspace_items_tenant ON workspace_items
  FOR ALL USING (workspace_id IN (
    SELECT id FROM menu_workspaces WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
  ));
CREATE POLICY workspace_item_tags_tenant ON workspace_item_tags
  FOR ALL USING (workspace_item_id IN (
    SELECT wi.id FROM workspace_items wi
    JOIN menu_workspaces mw ON wi.workspace_id = mw.id
    WHERE mw.tenant_id = current_setting('app.tenant_id', true)::uuid
  ));
CREATE POLICY workspace_threads_tenant ON workspace_threads
  FOR ALL USING (workspace_item_id IN (
    SELECT wi.id FROM workspace_items wi
    JOIN menu_workspaces mw ON wi.workspace_id = mw.id
    WHERE mw.tenant_id = current_setting('app.tenant_id', true)::uuid
  ));
CREATE POLICY workspace_polls_tenant ON workspace_polls
  FOR ALL USING (workspace_id IN (
    SELECT id FROM menu_workspaces WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
  ));
```

- [ ] **Step 2: Verify migration numbering**

Run: `ls database/migrations/*.sql | sort -r | head -3` (PowerShell equivalent)
Confirm `20260529000001` is strictly higher than `20260528000001_cohosting_agreements.sql`.

- [ ] **Step 3: Apply migration**

Run: `psql $DATABASE_URL -f database/migrations/20260529000001_menu_workspaces.sql`
Expected: All CREATE TABLE/INDEX/TRIGGER statements succeed.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/20260529000001_menu_workspaces.sql
git commit -m "feat(workspaces): add menu workspace schema (5 tables, 2 enums, RLS)"
```

---

## Task 2: TypeScript Types + Zod Schemas

**Files:**

- Create: `lib/workspaces/types.ts`

- [ ] **Step 1: Write types file**

```ts
import { z } from 'zod'

// Stage enum
export const WORKSPACE_STAGES = [
  'brainstorm',
  'draft',
  'internal_poll',
  'external_poll',
  'locked',
] as const
export type WorkspaceStage = (typeof WORKSPACE_STAGES)[number]

// Item type enum
export const WORKSPACE_ITEM_TYPES = ['idea', 'dish', 'note', 'ingredient_ref', 'reference'] as const
export type WorkspaceItemType = (typeof WORKSPACE_ITEM_TYPES)[number]

// Valid stage transitions
export const VALID_STAGE_TRANSITIONS: Record<WorkspaceStage, WorkspaceStage[]> = {
  brainstorm: ['draft'],
  draft: ['brainstorm', 'internal_poll'],
  internal_poll: ['draft', 'external_poll'],
  external_poll: ['internal_poll', 'locked'],
  locked: ['draft'],
}

// System tags
export const SYSTEM_TAGS = [
  'must-include',
  'nice-to-have',
  'seasonal-peak',
  'signature',
  'want-to-push',
  'cut-candidate',
] as const
export type SystemTag = (typeof SYSTEM_TAGS)[number]

// Conflict tag pairs (when two cohosts tag these on the same item = conflict)
export const CONFLICT_PAIRS: [string, string][] = [
  ['must-include', 'cut-candidate'],
  ['want-to-push', 'cut-candidate'],
]

// Theme presets
export const THEME_PRESETS = {
  farm_fresh: { accent: '#10b981', ribbon: '#059669', card: '#34d399', bg_tint: '#064e3b' },
  golden_hour: { accent: '#f59e0b', ribbon: '#d97706', card: '#fbbf24', bg_tint: '#78350f' },
  coastal: { accent: '#06b6d4', ribbon: '#0891b2', card: '#67e8f9', bg_tint: '#164e63' },
  wine_country: { accent: '#a855f7', ribbon: '#7e22ce', card: '#c084fc', bg_tint: '#3b0764' },
  ember: { accent: '#f43f5e', ribbon: '#e11d48', card: '#fb7185', bg_tint: '#4c0519' },
  midnight: { accent: '#6366f1', ribbon: '#4338ca', card: '#818cf8', bg_tint: '#1e1b4b' },
  herb_garden: { accent: '#84cc16', ribbon: '#65a30d', card: '#a3e635', bg_tint: '#365314' },
  truffle: { accent: '#a8a29e', ribbon: '#78716c', card: '#d6d3d1', bg_tint: '#292524' },
} as const
export type ThemePreset = keyof typeof THEME_PRESETS

export interface WorkspaceSettings {
  theme_preset?: ThemePreset
  accent_color?: string
  ribbon_color?: string
  card_color?: string
  bg_tint?: string
  emoji?: string
  cover_url?: string | null
}

// DB row types
export interface MenuWorkspace {
  id: string
  tenant_id: string
  circle_group_id: string | null
  event_id: string | null
  name: string
  stage: WorkspaceStage
  created_by: string
  locked_at: string | null
  materialized_menu_id: string | null
  share_token: string
  settings: WorkspaceSettings
  created_at: string
  updated_at: string
}

export interface WorkspaceItem {
  id: string
  workspace_id: string
  type: WorkspaceItemType
  title: string
  body: string | null
  course_label: string | null
  sort_order: number
  source_dish_index_id: string | null
  source_ingredient_board_id: string | null
  created_by: string
  stage_added: WorkspaceStage
  created_at: string
  updated_at: string
}

export interface WorkspaceItemTag {
  id: string
  workspace_item_id: string
  tag_name: string
  tagged_by: string
  is_system_tag: boolean
  created_at: string
}

export interface WorkspaceItemWithTags extends WorkspaceItem {
  tags: WorkspaceItemTag[]
  thread_count: number
  has_conflict: boolean
}

export interface WorkspaceWithItems extends MenuWorkspace {
  items: WorkspaceItemWithTags[]
  member_count: number
}

// Zod schemas for input validation
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  circleGroupId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  settings: z
    .object({
      theme_preset: z.string().optional(),
      emoji: z.string().max(4).optional(),
    })
    .optional(),
})

export const CreateItemSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(WORKSPACE_ITEM_TYPES),
  title: z.string().min(1).max(500),
  body: z.string().max(5000).optional(),
  courseLabel: z.string().max(100).optional(),
  sourceDishIndexId: z.string().uuid().optional(),
  sourceIngredientBoardId: z.string().uuid().optional(),
})

export const UpdateItemSchema = z.object({
  itemId: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  body: z.string().max(5000).optional(),
  courseLabel: z.string().max(100).nullable().optional(),
  type: z.enum(WORKSPACE_ITEM_TYPES).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const TagItemSchema = z.object({
  itemId: z.string().uuid(),
  tagName: z.string().min(1).max(50).toLowerCase(),
})

export const TransitionStageSchema = z.object({
  workspaceId: z.string().uuid(),
  targetStage: z.enum(WORKSPACE_STAGES),
})

export const UpdateSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  settings: z.object({
    theme_preset: z.string().optional(),
    accent_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    ribbon_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    card_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    bg_tint: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    emoji: z.string().max(4).optional(),
    cover_url: z.string().url().nullable().optional(),
  }),
})
```

- [ ] **Step 2: Commit**

```bash
git add lib/workspaces/types.ts
git commit -m "feat(workspaces): add TypeScript types, Zod schemas, theme presets"
```

---

## Task 3: Core Server Actions (CRUD + Stage Transitions)

**Files:**

- Create: `lib/workspaces/actions.ts`

- [ ] **Step 1: Write the test file**

Create `tests/workspaces/workspace-actions.test.ts` with tests for:

- `createWorkspace` returns workspace with brainstorm stage and share_token
- `getWorkspace` returns workspace with items and tags
- `addItem` adds item with correct stage_added
- `updateItem` updates fields
- `deleteItem` removes item
- `transitionStage` validates allowed transitions
- `transitionStage` rejects invalid transitions
- `updateSettings` persists theme

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/workspaces/workspace-actions.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement actions.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import {
  CreateWorkspaceSchema,
  CreateItemSchema,
  UpdateItemSchema,
  TransitionStageSchema,
  UpdateSettingsSchema,
  VALID_STAGE_TRANSITIONS,
  SYSTEM_TAGS,
  CONFLICT_PAIRS,
  type MenuWorkspace,
  type WorkspaceWithItems,
  type WorkspaceItemWithTags,
} from './types'
import { postWorkspaceEvent } from './lifecycle-hooks'
import type { z } from 'zod'

export async function createWorkspace(
  input: z.infer<typeof CreateWorkspaceSchema>
): Promise<{ success: boolean; workspace?: MenuWorkspace; error?: string }> {
  const { tenantId, profileId } = await requireChef()
  const validated = CreateWorkspaceSchema.parse(input)
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    INSERT INTO menu_workspaces (tenant_id, circle_group_id, event_id, name, created_by, settings)
    VALUES (${tenantId}, ${validated.circleGroupId ?? null}, ${validated.eventId ?? null},
            ${validated.name}, ${profileId}, ${JSON.stringify(validated.settings ?? {})})
    RETURNING *
  `

  if (validated.circleGroupId) {
    await postWorkspaceEvent(db, validated.circleGroupId, profileId, 'created', {
      workspaceId: workspace.id,
      name: validated.name,
    })
  }

  revalidatePath('/menus/workspace')
  return { success: true, workspace }
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceWithItems | null> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    SELECT mw.*, (
      SELECT count(*) FROM hub_group_members hgm
      WHERE hgm.group_id = mw.circle_group_id AND hgm.is_co_host = true
    )::int as member_count
    FROM menu_workspaces mw
    WHERE mw.id = ${workspaceId} AND mw.tenant_id = ${tenantId}
  `
  if (!workspace) return null

  const items = await db`
    SELECT wi.*,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', wit.id, 'workspace_item_id', wit.workspace_item_id,
          'tag_name', wit.tag_name, 'tagged_by', wit.tagged_by,
          'is_system_tag', wit.is_system_tag, 'created_at', wit.created_at
        )) FROM workspace_item_tags wit WHERE wit.workspace_item_id = wi.id),
        '[]'::json
      ) as tags,
      COALESCE(
        (SELECT count(*) FROM hub_messages hm
         JOIN workspace_threads wt ON wt.hub_message_thread_id = hm.reply_to_message_id
         WHERE wt.workspace_item_id = wi.id),
        0
      )::int as thread_count
    FROM workspace_items wi
    WHERE wi.workspace_id = ${workspaceId}
    ORDER BY wi.course_label NULLS LAST, wi.sort_order
  `

  const itemsWithConflicts: WorkspaceItemWithTags[] = items.map((item: any) => ({
    ...item,
    tags: item.tags || [],
    has_conflict: detectConflict(item.tags || []),
  }))

  return { ...workspace, items: itemsWithConflicts } as WorkspaceWithItems
}

function detectConflict(tags: { tag_name: string; tagged_by: string }[]): boolean {
  for (const [a, b] of CONFLICT_PAIRS) {
    const aTaggers = tags.filter((t) => t.tag_name === a).map((t) => t.tagged_by)
    const bTaggers = tags.filter((t) => t.tag_name === b).map((t) => t.tagged_by)
    if (aTaggers.length > 0 && bTaggers.length > 0) {
      const aSet = new Set(aTaggers)
      const hasConflict = bTaggers.some((b) => !aSet.has(b))
      if (hasConflict) return true
    }
  }
  return false
}

export async function addItem(
  input: z.infer<typeof CreateItemSchema>
): Promise<{ success: boolean; item?: any; error?: string }> {
  const { profileId } = await requireChef()
  const validated = CreateItemSchema.parse(input)
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    SELECT stage FROM menu_workspaces WHERE id = ${validated.workspaceId}
  `
  if (!workspace) return { success: false, error: 'Workspace not found' }

  const [item] = await db`
    INSERT INTO workspace_items (
      workspace_id, type, title, body, course_label, sort_order,
      source_dish_index_id, source_ingredient_board_id, created_by, stage_added
    ) VALUES (
      ${validated.workspaceId}, ${validated.type}, ${validated.title},
      ${validated.body ?? null}, ${validated.courseLabel ?? null},
      COALESCE((SELECT max(sort_order) + 1 FROM workspace_items WHERE workspace_id = ${validated.workspaceId}), 0),
      ${validated.sourceDishIndexId ?? null}, ${validated.sourceIngredientBoardId ?? null},
      ${profileId}, ${workspace.stage}
    ) RETURNING *
  `

  revalidatePath(`/menus/workspace/${validated.workspaceId}`)
  return { success: true, item }
}

export async function updateItem(
  input: z.infer<typeof UpdateItemSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireChef()
  const validated = UpdateItemSchema.parse(input)
  const db = createServerClient({ admin: true })

  const sets: string[] = []
  const vals: any = {}
  if (validated.title !== undefined) {
    vals.title = validated.title
  }
  if (validated.body !== undefined) {
    vals.body = validated.body
  }
  if (validated.courseLabel !== undefined) {
    vals.course_label = validated.courseLabel
  }
  if (validated.type !== undefined) {
    vals.type = validated.type
  }
  if (validated.sortOrder !== undefined) {
    vals.sort_order = validated.sortOrder
  }

  await db`
    UPDATE workspace_items SET ${db(vals)} WHERE id = ${validated.itemId}
  `
  return { success: true }
}

export async function deleteItem(itemId: string): Promise<{ success: boolean }> {
  await requireChef()
  const db = createServerClient({ admin: true })
  await db`DELETE FROM workspace_items WHERE id = ${itemId}`
  return { success: true }
}

export async function transitionStage(
  input: z.infer<typeof TransitionStageSchema>
): Promise<{ success: boolean; error?: string }> {
  const { profileId } = await requireChef()
  const validated = TransitionStageSchema.parse(input)
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    SELECT * FROM menu_workspaces WHERE id = ${validated.workspaceId}
  `
  if (!workspace) return { success: false, error: 'Workspace not found' }

  const allowed = VALID_STAGE_TRANSITIONS[workspace.stage as keyof typeof VALID_STAGE_TRANSITIONS]
  if (!allowed.includes(validated.targetStage)) {
    return {
      success: false,
      error: `Cannot transition from ${workspace.stage} to ${validated.targetStage}`,
    }
  }

  await db`
    UPDATE menu_workspaces SET stage = ${validated.targetStage} WHERE id = ${validated.workspaceId}
  `

  if (workspace.circle_group_id) {
    await postWorkspaceEvent(db, workspace.circle_group_id, profileId, 'stage_changed', {
      workspaceId: workspace.id,
      from: workspace.stage,
      to: validated.targetStage,
    })
  }

  revalidatePath(`/menus/workspace/${validated.workspaceId}`)
  return { success: true }
}

export async function updateWorkspaceSettings(
  input: z.infer<typeof UpdateSettingsSchema>
): Promise<{ success: boolean }> {
  await requireChef()
  const validated = UpdateSettingsSchema.parse(input)
  const db = createServerClient({ admin: true })

  await db`
    UPDATE menu_workspaces
    SET settings = settings || ${JSON.stringify(validated.settings)}::jsonb
    WHERE id = ${validated.workspaceId}
  `
  revalidatePath(`/menus/workspace/${validated.workspaceId}`)
  return { success: true }
}

export async function getWorkspaceByToken(token: string) {
  const db = createServerClient({ admin: true })
  const [workspace] = await db`
    SELECT * FROM menu_workspaces WHERE share_token = ${token}
  `
  if (!workspace) return null

  const items = await db`
    SELECT wi.*, COALESCE(
      (SELECT json_agg(json_build_object(
        'tag_name', wit.tag_name, 'tagged_by', wit.tagged_by
      )) FROM workspace_item_tags wit WHERE wit.workspace_item_id = wi.id),
      '[]'::json
    ) as tags
    FROM workspace_items wi
    WHERE wi.workspace_id = ${workspace.id} AND wi.type = 'dish'
    ORDER BY wi.course_label NULLS LAST, wi.sort_order
  `
  return { ...workspace, items }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/workspaces/workspace-actions.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/workspaces/actions.ts tests/workspaces/workspace-actions.test.ts
git commit -m "feat(workspaces): core CRUD + stage transitions + queries"
```

---

## Task 4: Tag Actions + Conflict Detection

**Files:**

- Create: `lib/workspaces/tag-actions.ts`
- Create: `tests/workspaces/tag-actions.test.ts`

- [ ] **Step 1: Write tag-actions.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { TagItemSchema, SYSTEM_TAGS } from './types'
import type { z } from 'zod'

export async function tagItem(
  input: z.infer<typeof TagItemSchema>
): Promise<{ success: boolean; error?: string }> {
  const { profileId } = await requireChef()
  const validated = TagItemSchema.parse(input)
  const db = createServerClient({ admin: true })

  const isSystem = (SYSTEM_TAGS as readonly string[]).includes(validated.tagName)

  await db`
    INSERT INTO workspace_item_tags (workspace_item_id, tag_name, tagged_by, is_system_tag)
    VALUES (${validated.itemId}, ${validated.tagName}, ${profileId}, ${isSystem})
    ON CONFLICT (workspace_item_id, tag_name, tagged_by) DO NOTHING
  `
  return { success: true }
}

export async function untagItem(itemId: string, tagName: string): Promise<{ success: boolean }> {
  const { profileId } = await requireChef()
  const db = createServerClient({ admin: true })

  await db`
    DELETE FROM workspace_item_tags
    WHERE workspace_item_id = ${itemId}
      AND tag_name = ${tagName}
      AND tagged_by = ${profileId}
  `
  return { success: true }
}

export async function getItemTags(itemId: string) {
  await requireChef()
  const db = createServerClient({ admin: true })
  return db`
    SELECT wit.*, hgp.display_name as tagger_name
    FROM workspace_item_tags wit
    JOIN hub_guest_profiles hgp ON hgp.id = wit.tagged_by
    WHERE wit.workspace_item_id = ${itemId}
    ORDER BY wit.created_at
  `
}

export async function getWorkspaceTagSummary(workspaceId: string) {
  await requireChef()
  const db = createServerClient({ admin: true })
  return db`
    SELECT wit.tag_name, count(DISTINCT wit.workspace_item_id)::int as item_count
    FROM workspace_item_tags wit
    JOIN workspace_items wi ON wi.id = wit.workspace_item_id
    WHERE wi.workspace_id = ${workspaceId}
    GROUP BY wit.tag_name
    ORDER BY item_count DESC
  `
}
```

- [ ] **Step 2: Write tests, run, verify**
- [ ] **Step 3: Commit**

```bash
git add lib/workspaces/tag-actions.ts tests/workspaces/tag-actions.test.ts
git commit -m "feat(workspaces): tag actions with per-cohost independence + conflict detection"
```

---

## Task 5: Lifecycle Hooks (Circle System Messages)

**Files:**

- Create: `lib/workspaces/lifecycle-hooks.ts`

- [ ] **Step 1: Write lifecycle-hooks.ts**

```ts
import type { Sql } from 'postgres'

type WorkspaceEvent = 'created' | 'stage_changed' | 'external_poll_opened' | 'locked' | 'conflict'

const EVENT_MESSAGES: Record<WorkspaceEvent, (meta: any) => string> = {
  created: (m) => `Menu planning started for ${m.name}`,
  stage_changed: (m) => `Menu workspace moved to ${formatStage(m.to)}`,
  external_poll_opened: (m) =>
    `Menu poll shared with guests (${m.optionCount} options, ${m.courseCount} courses)`,
  locked: (m) => `Menu finalized: ${m.menuName} (${m.courseCount} courses, ${m.guestCount} guests)`,
  conflict: (m) => `${m.userA} and ${m.userB} disagree on ${m.itemTitle}`,
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function postWorkspaceEvent(
  db: Sql,
  groupId: string,
  profileId: string,
  event: WorkspaceEvent,
  metadata: Record<string, any>
) {
  const body = EVENT_MESSAGES[event](metadata)

  await db`
    INSERT INTO hub_messages (group_id, author_profile_id, message_type, body, system_event_type, system_metadata)
    VALUES (${groupId}, ${profileId}, 'system', ${body}, ${'workspace_' + event}, ${JSON.stringify(metadata)})
  `
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/workspaces/lifecycle-hooks.ts
git commit -m "feat(workspaces): circle lifecycle hooks for workspace events"
```

---

## Task 6: Materialization (Lock -> Menu)

**Files:**

- Create: `lib/workspaces/materialize.ts`
- Create: `tests/workspaces/materialize.test.ts`

- [ ] **Step 1: Write materialize.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { createMenuWithCourses } from '@/lib/menus/actions'
import { revalidatePath } from 'next/cache'
import { postWorkspaceEvent } from './lifecycle-hooks'

export async function materializeWorkspace(
  workspaceId: string
): Promise<{ success: boolean; menuId?: string; error?: string }> {
  const { tenantId, profileId } = await requireChef()
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    SELECT * FROM menu_workspaces WHERE id = ${workspaceId} AND tenant_id = ${tenantId}
  `
  if (!workspace) return { success: false, error: 'Workspace not found' }
  if (workspace.stage !== 'locked') return { success: false, error: 'Workspace must be locked' }
  if (workspace.materialized_menu_id) return { success: false, error: 'Already materialized' }

  const dishes = await db`
    SELECT wi.*, COALESCE(
      (SELECT string_agg(wit.tag_name, ', ')
       FROM workspace_item_tags wit WHERE wit.workspace_item_id = wi.id),
      ''
    ) as tag_summary
    FROM workspace_items wi
    WHERE wi.workspace_id = ${workspaceId} AND wi.type = 'dish' AND wi.course_label IS NOT NULL
    ORDER BY wi.course_label, wi.sort_order
  `

  if (dishes.length === 0) return { success: false, error: 'No dishes to materialize' }

  const courseMap = new Map<string, typeof dishes>()
  for (const dish of dishes) {
    const existing = courseMap.get(dish.course_label) || []
    existing.push(dish)
    courseMap.set(dish.course_label, existing)
  }

  const courses = Array.from(courseMap.entries()).map(([label, items], idx) => ({
    course_label: label,
    course_number: idx + 1,
    dishes: items.map((d) => ({
      name: d.title,
      description: d.body || '',
      chef_notes: d.tag_summary ? `Tags: ${d.tag_summary}` : undefined,
    })),
  }))

  const menuName = workspace.settings?.emoji
    ? `${workspace.settings.emoji} ${workspace.name}`
    : workspace.name

  const result = await createMenuWithCourses(
    { name: menuName, event_id: workspace.event_id, status: 'draft' },
    courses.flatMap((c) =>
      c.dishes.map((d) => ({
        course_label: c.course_label,
        name: d.name,
        description: d.description,
        chef_notes: d.chef_notes,
      }))
    )
  )

  if (result.menu) {
    await db`
      UPDATE menu_workspaces SET materialized_menu_id = ${result.menu.id}
      WHERE id = ${workspaceId}
    `

    if (workspace.circle_group_id) {
      await postWorkspaceEvent(db, workspace.circle_group_id, profileId, 'locked', {
        workspaceId,
        menuName,
        courseCount: courses.length,
        guestCount: workspace.event_id ? '(from event)' : 'TBD',
      })
    }
  }

  revalidatePath(`/menus/workspace/${workspaceId}`)
  revalidatePath('/menus')
  return { success: true, menuId: result.menu?.id }
}
```

- [ ] **Step 2: Write tests, run, verify**
- [ ] **Step 3: Commit**

```bash
git add lib/workspaces/materialize.ts tests/workspaces/materialize.test.ts
git commit -m "feat(workspaces): materialization engine (workspace -> menu on lock)"
```

---

## Task 7: Ingredient Bridge + Poll Bridge + Thread Bridge

**Files:**

- Create: `lib/workspaces/ingredient-bridge.ts`
- Create: `lib/workspaces/poll-bridge.ts`
- Create: `lib/workspaces/thread-bridge.ts`

- [ ] **Step 1: Write ingredient-bridge.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export async function getCircleIngredients(circleGroupId: string) {
  await requireChef()
  const db = createServerClient({ admin: true })
  return db`
    SELECT cii.*, hgp.display_name as offered_by_display
    FROM circle_ingredient_items cii
    JOIN circle_ingredient_board cib ON cib.id = cii.board_id
    LEFT JOIN hub_guest_profiles hgp ON hgp.id = cii.offered_by_profile_id
    WHERE cib.group_id = ${circleGroupId}
      AND cii.status IN ('available', 'limited')
    ORDER BY cii.status, cii.ingredient_name
  `
}

export async function checkIngredientAvailability(workspaceId: string) {
  await requireChef()
  const db = createServerClient({ admin: true })
  return db`
    SELECT wi.id as item_id, wi.title, cii.status, cii.quantity_notes,
           cii.available_from, cii.available_to
    FROM workspace_items wi
    JOIN circle_ingredient_items cii ON cii.id = wi.source_ingredient_board_id
    WHERE wi.workspace_id = ${workspaceId}
      AND wi.source_ingredient_board_id IS NOT NULL
      AND cii.status = 'unavailable'
  `
}
```

- [ ] **Step 2: Write poll-bridge.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function createWorkspacePoll(input: {
  workspaceId: string
  groupId: string
  question: string
  options: string[]
  pollScope: 'internal' | 'external'
  courseLabel?: string
}): Promise<{ success: boolean; pollId?: string }> {
  const { profileId } = await requireChef()
  const db = createServerClient({ admin: true })

  const [workspace] = await db`
    SELECT stage FROM menu_workspaces WHERE id = ${input.workspaceId}
  `
  if (!workspace) return { success: false }

  const [poll] = await db`
    INSERT INTO hub_polls (group_id, created_by_profile_id, question, poll_type)
    VALUES (${input.groupId}, ${profileId}, ${input.question}, 'multi_choice')
    RETURNING id
  `

  for (let i = 0; i < input.options.length; i++) {
    await db`
      INSERT INTO hub_poll_options (poll_id, label, sort_order)
      VALUES (${poll.id}, ${input.options[i]}, ${i})
    `
  }

  await db`
    INSERT INTO workspace_polls (workspace_id, hub_poll_id, poll_scope, stage, course_label)
    VALUES (${input.workspaceId}, ${poll.id}, ${input.pollScope}, ${workspace.stage}, ${input.courseLabel ?? null})
  `

  revalidatePath(`/menus/workspace/${input.workspaceId}`)
  return { success: true, pollId: poll.id }
}

export async function getWorkspacePolls(workspaceId: string) {
  await requireChef()
  const db = createServerClient({ admin: true })
  return db`
    SELECT wp.*, hp.question, hp.is_closed, hp.closes_at,
      (SELECT json_agg(json_build_object(
        'id', hpo.id, 'label', hpo.label,
        'vote_count', (SELECT count(*) FROM hub_poll_votes hpv WHERE hpv.option_id = hpo.id)
      ) ORDER BY hpo.sort_order)
      FROM hub_poll_options hpo WHERE hpo.poll_id = hp.id) as options
    FROM workspace_polls wp
    JOIN hub_polls hp ON hp.id = wp.hub_poll_id
    WHERE wp.workspace_id = ${workspaceId}
    ORDER BY wp.created_at DESC
  `
}
```

- [ ] **Step 3: Write thread-bridge.ts**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export async function getOrCreateItemThread(
  workspaceId: string,
  itemId: string,
  groupId: string
): Promise<{ threadId: string }> {
  const { profileId } = await requireChef()
  const db = createServerClient({ admin: true })

  const [existing] = await db`
    SELECT hub_message_thread_id FROM workspace_threads WHERE workspace_item_id = ${itemId}
  `
  if (existing) return { threadId: existing.hub_message_thread_id }

  const [item] = await db`SELECT title FROM workspace_items WHERE id = ${itemId}`

  const [rootMsg] = await db`
    INSERT INTO hub_messages (group_id, author_profile_id, message_type, body, system_event_type)
    VALUES (${groupId}, ${profileId}, 'system', ${'Discussion: ' + (item?.title || 'item')}, 'workspace_thread')
    RETURNING id
  `

  await db`
    INSERT INTO workspace_threads (workspace_item_id, hub_message_thread_id)
    VALUES (${itemId}, ${rootMsg.id})
  `

  return { threadId: rootMsg.id }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/workspaces/ingredient-bridge.ts lib/workspaces/poll-bridge.ts lib/workspaces/thread-bridge.ts
git commit -m "feat(workspaces): ingredient, poll, and thread bridges"
```

---

## Task 8: Workspace Shell + Theme Provider

**Files:**

- Create: `components/workspaces/workspace-shell.tsx`

- [ ] **Step 1: Write workspace-shell.tsx**

The themed layout shell. Reads `workspace.settings`, applies CSS custom properties, renders topbar + stage ribbon + slot for stage content + sidebar.

Key behaviors:

- `--ws-accent`, `--ws-ribbon`, `--ws-card`, `--ws-bg-tint` CSS vars from settings or theme preset
- Stage ribbon with clickable steps (only backward transitions from current stage)
- Avatar stack from circle members
- "Organize into Draft" / "Start Polling" / "Share with Guests" / "Lock Menu" CTA based on current stage
- Right sidebar slot for ingredients, activity, Remy

Use the mockup at `.superpowers/brainstorm/1214-1779820314/content/ui-workspace-brainstorm.html` as the visual reference. Match the dark theme, spacing, typography (Inter + Playfair Display), and card styling exactly.

- [ ] **Step 2: Commit**

```bash
git add components/workspaces/workspace-shell.tsx
git commit -m "feat(workspaces): themed workspace shell with stage ribbon"
```

---

## Task 9: Item Card + Tag Picker

**Files:**

- Create: `components/workspaces/item-card.tsx`
- Create: `components/workspaces/tag-picker.tsx`

- [ ] **Step 1: Write item-card.tsx**

Universal card component matching the mockup. Props: `item: WorkspaceItemWithTags`, `currentProfileId`, `onTag`, `onDelete`, `onUpdate`, `onOpenThread`.

Key behaviors:

- Color-coded type badge (amber=idea, indigo=dish, green=ingredient_ref, cyan=reference, gray=note)
- Tag pills with tiny avatar dots showing who tagged
- Red left border + "CONFLICT" badge when `item.has_conflict`
- Thread count in footer
- Hover: subtle elevation + border glow

- [ ] **Step 2: Write tag-picker.tsx**

Dropdown/popover for adding tags. Shows system tags as suggestions, custom text input at bottom. Shows existing tags with remove button (only for tags you created).

- [ ] **Step 3: Commit**

```bash
git add components/workspaces/item-card.tsx components/workspaces/tag-picker.tsx
git commit -m "feat(workspaces): item card with per-cohost tags + conflict highlighting"
```

---

## Task 10: Brainstorm Canvas + Quick Add

**Files:**

- Create: `components/workspaces/brainstorm-canvas.tsx`

- [ ] **Step 1: Write brainstorm-canvas.tsx**

Grid layout matching mockup. Features:

- `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` card grid
- Tag filter bar (buttons for each unique tag, click to filter)
- "All / Mine / [Cohost name] / Conflicts" quick filters
- Quick-add card (dashed border) that expands into inline form (title, body, type selector)
- Maps `WorkspaceItemWithTags[]` to `ItemCard` components

- [ ] **Step 2: Commit**

```bash
git add components/workspaces/brainstorm-canvas.tsx
git commit -m "feat(workspaces): brainstorm canvas with card grid, filters, quick-add"
```

---

## Task 11: Draft Organizer

**Files:**

- Create: `components/workspaces/draft-organizer.tsx`

- [ ] **Step 1: Write draft-organizer.tsx**

Course-grouped view. Features:

- Items grouped by `course_label` with editable course headers
- "Parking Lot" section for items with no course_label
- Drag items between courses (or use dropdown selector)
- Placing an `idea` in a course auto-promotes to `dish` type
- Course suggestions (Amuse-Bouche, First Course, Soup, Salad, Fish, Intermezzo, Main, Cheese, Pre-Dessert, Dessert)

- [ ] **Step 2: Commit**

```bash
git add components/workspaces/draft-organizer.tsx
git commit -m "feat(workspaces): draft organizer with course grouping + idea promotion"
```

---

## Task 12: Poll Manager + Lock Review

**Files:**

- Create: `components/workspaces/poll-manager.tsx`
- Create: `components/workspaces/lock-review.tsx`

- [ ] **Step 1: Write poll-manager.tsx**

Used in both INTERNAL_POLL and EXTERNAL_POLL stages. Features:

- Create poll per course (select dishes as options from that course)
- Show existing polls with vote tallies
- Internal: only cohosts vote. External: token link share button
- Close poll button for chef

- [ ] **Step 2: Write lock-review.tsx**

Final review before materialization. Features:

- Read-only view of all courses with decided dishes
- "Materialize Menu" button calling `materializeWorkspace`
- Success: shows link to new menu in editor
- Warning if any courses have no dishes

- [ ] **Step 3: Commit**

```bash
git add components/workspaces/poll-manager.tsx components/workspaces/lock-review.tsx
git commit -m "feat(workspaces): poll manager + lock review with materialization"
```

---

## Task 13: Sidebar Components

**Files:**

- Create: `components/workspaces/sidebar-ingredients.tsx`
- Create: `components/workspaces/sidebar-activity.tsx`
- Create: `components/workspaces/sidebar-remy.tsx`
- Create: `components/workspaces/theme-picker.tsx`

- [ ] **Step 1: Write sidebar-ingredients.tsx**

Reads from `getCircleIngredients`. Shows availability dot (green=available, amber=limited), name, quantity notes, "+ Add to brainstorm" button.

- [ ] **Step 2: Write sidebar-activity.tsx**

Queries recent `workspace_items` and `workspace_item_tags` ordered by created_at. Shows avatar, action, timestamp.

- [ ] **Step 3: Write sidebar-remy.tsx**

Placeholder component structure. Calls allergen check (cross-ref client dietary data with workspace dish items). Shows dismissible suggestion cards with purple accent.

- [ ] **Step 4: Write theme-picker.tsx**

8 preset cards (matching mockup), emoji grid, "Fine-tune" section (V2, disabled with "Coming soon" label). Calls `updateWorkspaceSettings` on selection.

- [ ] **Step 5: Commit**

```bash
git add components/workspaces/sidebar-ingredients.tsx components/workspaces/sidebar-activity.tsx \
  components/workspaces/sidebar-remy.tsx components/workspaces/theme-picker.tsx
git commit -m "feat(workspaces): sidebar components (ingredients, activity, remy, theming)"
```

---

## Task 14: Routes (Chef + Public)

**Files:**

- Create: `app/(chef)/menus/workspace/new/page.tsx`
- Create: `app/(chef)/menus/workspace/[id]/page.tsx`
- Create: `app/(chef)/menus/workspace/[id]/workspace-client.tsx`
- Create: `app/(public)/menu-collab/[token]/page.tsx`

- [ ] **Step 1: Write new workspace page**

Form: workspace name, select circle (from chef's circles), select event (optional), theme preset picker, emoji. Submit calls `createWorkspace`, redirects to workspace.

- [ ] **Step 2: Write workspace server page**

```tsx
import { getWorkspace } from '@/lib/workspaces/actions'
import { WorkspaceClient } from './workspace-client'
import { notFound } from 'next/navigation'

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const workspace = await getWorkspace(params.id)
  if (!workspace) notFound()
  return <WorkspaceClient workspace={workspace} />
}
```

- [ ] **Step 3: Write workspace client component**

Switches stage view: brainstorm -> `BrainstormCanvas`, draft -> `DraftOrganizer`, internal_poll/external_poll -> `PollManager`, locked -> `LockReview`. Wraps in `WorkspaceShell` for theming.

- [ ] **Step 4: Write public collab page**

Token-based access. Shows workspace dishes grouped by course. External guests can vote on open polls (creates anonymous `hub_guest_profiles` entry if needed). No auth required.

- [ ] **Step 5: Commit**

```bash
git add app/(chef)/menus/workspace/ app/(public)/menu-collab/
git commit -m "feat(workspaces): chef workspace routes + public collab token page"
```

---

## Task 15: Wire-Audit + Closeout

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

- [ ] **Step 2: Run test suite**

Run: `npx vitest run tests/workspaces/`
Expected: All pass

- [ ] **Step 3: Run wire-audit**

Run: `/wire-audit`
Verify workspace routes are wired, no orphans.

- [ ] **Step 4: Run regression firewall**

Run: `npm run regression:firewall`
Expected: Pass

- [ ] **Step 5: Manual verification**

Navigate to `http://localhost:3100/menus/workspace/new`, create a workspace, add items, tag them, transition stages, verify circle gets system messages, lock and verify menu materializes.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(workspaces): collaborative menu workspace complete"
```

---

## Summary

| Task | What                               | Files         |
| ---- | ---------------------------------- | ------------- |
| 1    | Migration + enums                  | 1 SQL         |
| 2    | Types + Zod                        | 1 TS          |
| 3    | Core CRUD + transitions            | 1 TS + 1 test |
| 4    | Tag actions                        | 1 TS + 1 test |
| 5    | Lifecycle hooks                    | 1 TS          |
| 6    | Materialization                    | 1 TS + 1 test |
| 7    | Bridges (ingredient, poll, thread) | 3 TS          |
| 8    | Workspace shell                    | 1 TSX         |
| 9    | Item card + tag picker             | 2 TSX         |
| 10   | Brainstorm canvas                  | 1 TSX         |
| 11   | Draft organizer                    | 1 TSX         |
| 12   | Poll manager + lock review         | 2 TSX         |
| 13   | Sidebar components                 | 4 TSX         |
| 14   | Routes (chef + public)             | 4 TSX         |
| 15   | Wire-audit + closeout              | verification  |

**Total: ~24 files, 15 tasks. Tasks 1-7 are backend (dispatchable to agents in parallel after Task 1). Tasks 8-14 are frontend (sequential, each builds on prior). Task 15 is closeout.**
