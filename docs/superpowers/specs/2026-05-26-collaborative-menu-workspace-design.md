# Collaborative Menu Workspace

**Date:** 2026-05-26
**Status:** Approved
**Approach:** Standalone Workspace + Circle Bridge (Approach B)

## Summary

A dedicated menu planning workspace where cohosts (chef + farmer, chef + chef, etc.) collaboratively brainstorm, draft, poll, and lock a menu. The workspace is a standalone route (`/menus/workspace/[id]`) with its own full-page layout. Key moments surface into the Dinner Circle as system messages. External guests vote via token links.

## Architecture: Standalone + Circle Bridge

- Workspace owns the planning lifecycle (5 stages)
- Circle owns communication (chat, notifications, unread badges)
- Ingredient board data flows into workspace as suggestions (read-only bridge)
- Polls bridge to `hub_polls` for voting infrastructure
- Discussion threads bridge to `hub_messages` for notification infrastructure
- On LOCK, workspace materializes into a real `menus` record via `createMenuWithCourses`

## 5-Stage State Machine

```
BRAINSTORM -> DRAFT -> INTERNAL_POLL -> EXTERNAL_POLL -> LOCKED
```

Valid transitions (including back-steps):

- BRAINSTORM <-> DRAFT
- DRAFT <-> INTERNAL_POLL
- INTERNAL_POLL <-> EXTERNAL_POLL
- EXTERNAL_POLL -> LOCKED
- LOCKED -> DRAFT (rare, unlock to revise)

On LOCK: materializes into `menus` table (draft status). Workspace preserved as history.

## Data Model

### New Tables (3 core + 2 bridge)

#### `menu_workspaces`

```sql
id UUID PRIMARY KEY,
tenant_id UUID NOT NULL REFERENCES tenants(id),
circle_group_id UUID REFERENCES hub_groups(id),
event_id UUID REFERENCES events(id),
name TEXT NOT NULL,
stage workspace_stage NOT NULL DEFAULT 'brainstorm',
created_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
locked_at TIMESTAMPTZ,
materialized_menu_id UUID REFERENCES menus(id),
share_token TEXT UNIQUE,
settings JSONB DEFAULT '{}',
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

`settings` JSONB stores theming:

```json
{
  "theme_preset": "golden_hour",
  "accent_color": "#f59e0b",
  "ribbon_color": "#d97706",
  "card_color": "#fbbf24",
  "bg_tint": "#78350f",
  "emoji": "🌾",
  "cover_url": null
}
```

#### `workspace_items`

```sql
id UUID PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES menu_workspaces(id),
type workspace_item_type NOT NULL, -- idea, dish, note, ingredient_ref, reference
title TEXT NOT NULL,
body TEXT,
course_label TEXT, -- null in BRAINSTORM, assigned in DRAFT+
sort_order INTEGER NOT NULL DEFAULT 0,
source_dish_index_id UUID REFERENCES dish_index(id),
source_ingredient_board_id UUID REFERENCES circle_ingredient_items(id),
created_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
stage_added workspace_stage NOT NULL,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

#### `workspace_item_tags`

```sql
id UUID PRIMARY KEY,
workspace_item_id UUID NOT NULL REFERENCES workspace_items(id),
tag_name TEXT NOT NULL,
tagged_by UUID NOT NULL REFERENCES hub_guest_profiles(id),
is_system_tag BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ DEFAULT now(),
UNIQUE(workspace_item_id, tag_name, tagged_by)
```

System tag defaults: `must-include`, `nice-to-have`, `seasonal-peak`, `signature`, `want-to-push`, `cut-candidate`. Custom tags: anything the cohost types.

Each cohost tags independently. Chef and farmer can have different tags on the same item. Conflicts (chef: must-include vs farmer: cut-candidate) auto-surface with red left border and "CONFLICT" badge.

#### `workspace_threads` (bridge)

```sql
workspace_item_id UUID NOT NULL REFERENCES workspace_items(id),
hub_message_thread_id UUID NOT NULL REFERENCES hub_messages(id),
PRIMARY KEY (workspace_item_id)
```

#### `workspace_polls` (bridge)

```sql
id UUID PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES menu_workspaces(id),
hub_poll_id UUID NOT NULL REFERENCES hub_polls(id),
poll_scope TEXT NOT NULL CHECK (poll_scope IN ('internal', 'external')),
stage workspace_stage NOT NULL,
course_label TEXT
```

### New Enums

```sql
CREATE TYPE workspace_stage AS ENUM (
  'brainstorm', 'draft', 'internal_poll', 'external_poll', 'locked'
);

CREATE TYPE workspace_item_type AS ENUM (
  'idea', 'dish', 'note', 'ingredient_ref', 'reference'
);
```

## Routes

| Route                   | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `/menus/workspace/[id]` | Main workspace (chef, authenticated)         |
| `/menus/workspace/new`  | Create workspace (linked to circle/event)    |
| `/menu-collab/[token]`  | Public token link for external guest polling |

## UI Design

### Brainstorm Stage

- Full-page canvas with card grid (auto-fill, min 240px)
- 5 card types: idea (amber), dish (indigo), ingredient-ref (green), reference (cyan), note (gray)
- Per-cohost tags with tiny avatar badges showing who tagged what
- Tag filter bar across top of canvas
- Right sidebar: circle link, farmer's ingredient board (auto-suggestions), Remy AI cards, activity feed
- Quick-add card (dashed border, "+ Add idea, dish, note, or photo")
- Conflict highlighting: red left border + "CONFLICT" badge when cohosts disagree

### Draft Stage

- Cards organized into course groups (drag to reorder/reassign)
- Course labels editable (Amuse-Bouche, First Course, Main, etc.)
- Items promoted from idea -> dish when placed in a course
- Unpromoted ideas remain visible in a "Parking Lot" section
- Cost estimates begin appearing per dish (if recipe linked)

### Internal Poll Stage

- Chef creates polls per course (or whole menu)
- Uses `hub_polls` with `ranked_choice` or `multi_choice`
- Only circle members with co-host role can vote
- Results visible to all cohosts in real-time
- Gate: external poll blocked until internal consensus

### External Poll Stage

- Narrowed options (3-4 per course) shared via token link
- No account needed for guests; vote with name
- Results merge with internal votes in same `hub_poll_votes`
- Chef controls when to open/close external polling
- Circle gets system message: "Menu poll shared with guests"

### Lock Stage

- Final review of all decisions
- One-click materialization into `menus` table
- Workspace preserved as read-only history
- Circle gets system message: "Menu locked for [event name]"

### Workspace Theming

- 8 curated presets: Farm Fresh, Golden Hour, Coastal, Wine Country, Ember, Midnight, Herb Garden, Truffle
- Custom emoji per workspace
- Cover photo (upload or gradient)
- Fine-tune individual colors (accent, ribbon, card highlight, bg tint)
- Stored in `menu_workspaces.settings` JSONB
- Applied via CSS custom properties on the workspace shell
- Dashboard cards show themed preview (instant visual identity)
- V1 ships with presets + emoji; fine-tune colors is V2 polish

### Remy Integration (opt-in)

- Allergen conflict detection ("Client allergic to X, you brainstormed Y")
- Past dish performance suggestions ("Last farm dinner, peach burrata rated 4.8/5")
- Seasonal ingredient suggestions based on farmer's board
- All Remy cards dismissible; no AI required for core workflow

## Circle Bridge Events

System messages posted to circle on workspace events:

- Workspace created: "Menu planning started for [event]"
- Stage advanced: "Menu moved to [stage]"
- External poll opened: "Menu poll shared with guests (12 options, 4 courses)"
- Menu locked: "Menu finalized: [menu name] (5 courses, 60 guests)"
- Conflict flagged: "David and Sarah disagree on Pan-Seared Duck Breast"

## Ingredient Board Bridge

- `circle_ingredient_items` with status `available` or `limited` surface in workspace sidebar
- One-click "Add to brainstorm" creates a `workspace_item` with `type: ingredient_ref` and `source_ingredient_board_id`
- If farmer updates availability (available -> unavailable), workspace item gets flagged
- Read-only pull; workspace never writes back to ingredient board

## Materialization (LOCK -> Menu)

On lock, workspace items with `type: dish` become:

1. Group by `course_label` -> `dishes` records with `course_name`, `course_number`
2. `workspace_item.title` -> `dishes.name`
3. `workspace_item.body` -> `dishes.description`
4. Tags compress into `dishes.chef_notes` (e.g., "Tags: signature, seasonal-peak, farmer-highlight")
5. Thread summaries become `menus.notes`
6. Workspace `settings.emoji` + name used for menu name if none specified
7. `menu_workspaces.materialized_menu_id` set to new menu ID
8. Menu created in `draft` status; normal menu lifecycle takes over

## What This Does NOT Do

- No real-time collaborative editing (CRDT). Optimistic updates with last-write-wins. Good enough for 2-5 cohosts.
- No video/voice integration. Chat happens in the circle.
- No payment/billing for workspace access. Part of existing circle membership.
- No mobile-specific layout in V1. Responsive grid works on tablet; phone is stretch goal.

## Files to Create

| File                                                   | Purpose                                                  |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `database/migrations/YYYYMMDD_menu_workspaces.sql`     | Schema: tables, enums, indexes, RLS                      |
| `lib/workspaces/types.ts`                              | TypeScript types for workspace, items, tags              |
| `lib/workspaces/actions.ts`                            | Server actions: CRUD, stage transitions, materialization |
| `lib/workspaces/tag-actions.ts`                        | Tag CRUD, conflict detection, system tag defaults        |
| `lib/workspaces/poll-bridge.ts`                        | Create/link workspace polls to hub_polls                 |
| `lib/workspaces/thread-bridge.ts`                      | Create/link item threads to hub_messages                 |
| `lib/workspaces/ingredient-bridge.ts`                  | Pull ingredient board items, flag changes                |
| `lib/workspaces/lifecycle-hooks.ts`                    | Circle system messages on workspace events               |
| `lib/workspaces/materialize.ts`                        | Lock stage: workspace -> menu conversion                 |
| `app/(chef)/menus/workspace/new/page.tsx`              | Create workspace form                                    |
| `app/(chef)/menus/workspace/[id]/page.tsx`             | Main workspace shell                                     |
| `app/(chef)/menus/workspace/[id]/workspace-client.tsx` | Client component with stage views                        |
| `app/(public)/menu-collab/[token]/page.tsx`            | Public external polling page                             |
| `components/workspaces/workspace-shell.tsx`            | Layout shell with theming                                |
| `components/workspaces/brainstorm-canvas.tsx`          | Brainstorm stage card grid                               |
| `components/workspaces/draft-organizer.tsx`            | Draft stage course organizer                             |
| `components/workspaces/poll-manager.tsx`               | Internal/external poll creation and display              |
| `components/workspaces/item-card.tsx`                  | Universal item card (idea/dish/ref/note)                 |
| `components/workspaces/tag-picker.tsx`                 | Tag creation and assignment                              |
| `components/workspaces/theme-picker.tsx`               | Theme preset and custom color picker                     |
| `components/workspaces/sidebar-ingredients.tsx`        | Ingredient board sidebar                                 |
| `components/workspaces/sidebar-activity.tsx`           | Activity feed sidebar                                    |
| `components/workspaces/sidebar-remy.tsx`               | Remy suggestion cards                                    |

## Mockups

Visual mockups saved to `.superpowers/brainstorm/1214-1779820314/content/`:

- `ui-workspace-brainstorm.html` - Full brainstorm stage layout
- `ui-workspace-theming.html` - Theme picker and dashboard previews

Theming noted as "good start, iterate later."
