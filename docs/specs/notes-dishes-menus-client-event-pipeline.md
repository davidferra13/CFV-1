# Spec: Notes to Dishes to Menus Pipeline Hardening

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session   | Commit |
| --------------------- | ---------------- | --------------- | ------ |
| Created               | 2026-03-31 18:05 | planner session |        |
| Status: ready         | 2026-03-31 18:05 | planner session |        |
| Claimed (in-progress) |                  |                 |        |
| Spike completed       |                  |                 |        |
| Pre-flight passed     |                  |                 |        |
| Build completed       |                  |                 |        |
| Type check passed     |                  |                 |        |
| Build check passed    |                  |                 |        |
| Playwright verified   |                  |                 |        |
| Status: verified      |                  |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- "We are not building a new feature."
- "We are fixing and strengthening an existing workflow that is already partially implemented."
- "Do NOT rebuild anything. Start by auditing what exists and how it actually behaves."
- "Menu creation currently exists, but it assumes menus are the starting point. In real usage, menus are not the starting point."
- "The workflow actually starts with scattered notes, client-specific thoughts, partial ideas, incomplete dishes, out-of-order development (dessert first, etc.)."
- "Over time, these notes become structured dishes, full menus, reusable components."
- "Enforce a single continuous pipeline: Notes -> Dishes -> Menus -> Client/Event."
- "This must work without duplication, without data loss, without forcing structure too early, without breaking existing functionality."
- "Notes are independent."
- "Notes can be attached at any time."
- "Notes can become dishes (non-destructive)."
- "Dishes are reusable (single source of truth)."
- "Reference vs Copy is explicit."
- "Menus are flexible."
- "Context assignment is flexible."
- "No data loss at any stage."
- "Clear ownership of data."
- "Menu finalization."
- "Return what currently exists, where it breaks, data model gaps, API gaps, UI gaps, and the minimal changes required to fix it."
- "Capture this conversation and attach it to the spec."
- "Do NOT compress away important nuance. The builder must understand WHY things exist, not just WHAT to build."
- "Confirm full alignment before proceeding."
- "What is verified vs unverified?"
- "What is necessary vs noise?"
- "Will anything we do cause regression or break existing systems?"

### Developer Intent

- **Core goal:** turn the current menu-first culinary workflow into a notes-first pipeline without throwing away the existing menu editor, menu library, dish index, approval, template, and client preference surfaces.
- **Key constraints:** no rebuild, no destructive migrations, no forced early structure, no silent duplication, no data loss on note promotion, no regression to current menu creation, and no third disconnected workflow.
- **Motivation:** the chef's real work starts as idea capture and partial dish thinking, but the current code only becomes structured after a menu record already exists. That mismatch is the source of fragility.
- **Success from the developer's perspective:** the chef can write ideas instantly, leave them global or attach them later, promote the right note into a reusable dish, add that dish to menus by reference or copy on purpose, keep menus incomplete while building, and lock a final menu without silent reopen behavior.
- **Working style requirement:** every recommendation must separate verified current behavior from design inference, and the spec should stay tightly scoped to required changes rather than broad architecture cleanup.

---

## What This Does (Plain English)

This hardens the existing culinary workflow so chefs can capture raw ideas first, turn the useful ones into reusable dishes without deleting the original notes, and then compose menus from those dishes while preserving the current menu builder, client preference intake, showcase/template flows, and approval flow. The result is one continuous path from note capture to dish reuse to menu assembly to client/event assignment, instead of the current menu-first flow that forces structure too early.

---

## Why It Matters

The current product already has menus, client menu intake, templates, showcase menus, approval, and a dish index, but they do not connect into the workflow the developer actually uses. Fixing this now prevents more copy-based drift and avoids building new surfaces on top of the wrong root object.

---

## Files to Create

| File                                                                 | Purpose                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260401000149_notes_dish_sources_pipeline.sql` | Add standalone workflow notes, note-menu links, dish-note lineage, canonical dish components, and source metadata columns |
| `lib/notes/workflow-actions.ts`                                      | CRUD, context assignment, menu linking, and note-to-dish promotion for workflow notes                                     |
| `lib/menus/dish-source-actions.ts`                                   | Add canonical dishes to menus by reference or copy, sync referenced menu dishes, and convert reference dishes to copies   |
| `components/menus/workflow-notes-panel.tsx`                          | Quick capture, list, filter, attach, and promote UI for workflow notes inside existing menu screens                       |

---

## Files to Modify

| File                                            | What to Change                                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/menus/actions.ts`                          | Persist `season`, `client_id`, and `target_date` on create; add explicit unlock action; stop archive as the implicit reopen path; preserve current attach/apply flows        |
| `lib/menus/editor-actions.ts`                   | Load workflow notes, dish source metadata, and ownership scope into editor context; persist menu ownership scope when client/event context changes                           |
| `lib/menus/dish-index-actions.ts`               | Extend canonical dish CRUD to manage ownership scope, canonical components, and note lineage; expose canonical dish picker data for menu assembly                            |
| `lib/menus/dish-index-bridge.ts`                | When locking menus, attach appearances to canonical dishes without creating duplicate canonical records for already linked reference/copy rows                               |
| `lib/menus/approval-portal.ts`                  | Keep client approval snapshots stable, but include enough source metadata for chef-side audit/debug so reference/copy behavior is not invisible in revision history          |
| `lib/communication/menu-revision-actions.ts`    | Preserve revision compatibility with new dish source metadata; do not assume every dish is purely menu-local                                                                 |
| `lib/menus/menu-intelligence-actions.ts`        | Add source queries for workflow notes and canonical dishes; add note attachment helpers used by menu creation and editor flows                                               |
| `lib/menus/menu-history-actions.ts`             | Keep service-history and repeat-analysis compatibility with source-backed dishes; do not force those readers to switch to canonical-only queries                             |
| `lib/ai/agent-actions/intake-actions.ts`        | On approved transcript/brain-dump intake, commit extracted notes into workflow notes instead of leaving them only in chat preview                                            |
| `components/culinary/menu-assembly-browser.tsx` | Add a canonical dish tab; require explicit `Reference` or `Copy` choice when adding a dish to a menu; keep existing template/past-menu/recipe/quick-add tabs                 |
| `app/(chef)/menus/new/create-menu-form.tsx`     | Generate a draft menu key, allow workflow note linking before save, attach notes during create flow, and continue collecting menu metadata without requiring prior structure |
| `app/(chef)/menus/menus-client-wrapper.tsx`     | Add quick workflow note capture on the menus landing page; stop collapsing `shared` and `locked` into one display status                                                     |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`  | Show linked workflow notes, allow attach/detach/promote actions, and replace archive-to-draft reopen behavior with explicit unlock or duplicate                              |
| `app/api/v2/menus/route.ts`                     | Align request body with real schema (`name`, `season`, `client_id`, `target_date`) instead of stale `menu_name`                                                              |
| `app/api/v2/menus/[id]/route.ts`                | Same as above for PATCH                                                                                                                                                      |

---

## Database Changes

### New Tables

```sql
CREATE TYPE workflow_ownership_scope AS ENUM ('global', 'client', 'event');
CREATE TYPE workflow_note_status AS ENUM ('open', 'promoted', 'archived');
CREATE TYPE workflow_note_dish_relation AS ENUM ('promoted', 'source');
CREATE TYPE menu_dish_source_mode AS ENUM ('manual', 'reference', 'copy');

CREATE TABLE workflow_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global',
  title TEXT,
  body TEXT NOT NULL,
  status workflow_note_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (
    (ownership_scope = 'global' AND client_id IS NULL AND event_id IS NULL) OR
    (ownership_scope = 'client' AND client_id IS NOT NULL AND event_id IS NULL) OR
    (ownership_scope = 'event' AND event_id IS NOT NULL)
  )
);

CREATE INDEX idx_workflow_notes_tenant_created ON workflow_notes(tenant_id, created_at DESC);
CREATE INDEX idx_workflow_notes_tenant_scope ON workflow_notes(tenant_id, ownership_scope);
CREATE INDEX idx_workflow_notes_client ON workflow_notes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_workflow_notes_event ON workflow_notes(event_id) WHERE event_id IS NOT NULL;

ALTER TABLE workflow_notes ENABLE ROW LEVEL SECURITY;
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

CREATE TABLE workflow_note_menu_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES workflow_notes(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  draft_menu_key TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (menu_id IS NOT NULL OR draft_menu_key IS NOT NULL)
);

CREATE UNIQUE INDEX uq_workflow_note_menu_links_menu
  ON workflow_note_menu_links(note_id, menu_id)
  WHERE menu_id IS NOT NULL;

CREATE UNIQUE INDEX uq_workflow_note_menu_links_draft
  ON workflow_note_menu_links(note_id, draft_menu_key)
  WHERE draft_menu_key IS NOT NULL;

CREATE INDEX idx_workflow_note_menu_links_menu ON workflow_note_menu_links(menu_id) WHERE menu_id IS NOT NULL;
CREATE INDEX idx_workflow_note_menu_links_draft ON workflow_note_menu_links(draft_menu_key) WHERE draft_menu_key IS NOT NULL;

ALTER TABLE workflow_note_menu_links ENABLE ROW LEVEL SECURITY;
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

CREATE TABLE dish_index_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category component_category NOT NULL DEFAULT 'other',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_dish_index_components_dish ON dish_index_components(dish_id);
CREATE INDEX idx_dish_index_components_recipe ON dish_index_components(recipe_id) WHERE recipe_id IS NOT NULL;

ALTER TABLE dish_index_components ENABLE ROW LEVEL SECURITY;
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

CREATE TABLE dish_index_note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES workflow_notes(id) ON DELETE CASCADE,
  relation workflow_note_dish_relation NOT NULL DEFAULT 'promoted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (dish_id, note_id, relation)
);

CREATE INDEX idx_dish_index_note_links_dish ON dish_index_note_links(dish_id);
CREATE INDEX idx_dish_index_note_links_note ON dish_index_note_links(note_id);

ALTER TABLE dish_index_note_links ENABLE ROW LEVEL SECURITY;
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
```

### New Columns on Existing Tables

```sql
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global';

ALTER TABLE dish_index
  ADD COLUMN IF NOT EXISTS ownership_scope workflow_ownership_scope NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS dish_index_id UUID REFERENCES dish_index(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_mode menu_dish_source_mode NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS copied_from_dish_index_id UUID REFERENCES dish_index(id) ON DELETE SET NULL;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS dish_index_component_id UUID REFERENCES dish_index_components(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menus_ownership_scope ON menus(tenant_id, ownership_scope);
CREATE INDEX IF NOT EXISTS idx_dish_index_scope ON dish_index(tenant_id, ownership_scope);
CREATE INDEX IF NOT EXISTS idx_dishes_dish_index_id ON dishes(dish_index_id) WHERE dish_index_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dishes_source_mode ON dishes(menu_id, source_mode);
CREATE INDEX IF NOT EXISTS idx_components_dish_index_component_id
  ON components(dish_index_component_id)
  WHERE dish_index_component_id IS NOT NULL;

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
```

### Migration Notes

- Migration filename must be `20260401000149_notes_dish_sources_pipeline.sql`. `20260401000149` is currently unused in `database/migrations/`.
- Keep this additive. Do not drop or rename `client_notes`, `inquiry_notes`, `menus`, `dishes`, `components`, `menu_preferences`, or `menu_approval_requests`.
- Backfill only ownership scope and menu client context. Do not bulk rewrite existing dish rows into canonical references in this spec.

---

## Data Model

### 1. Workflow Notes

`workflow_notes` is the new independent capture layer for culinary idea work. A note can be:

- global: no client, no event
- client-specific: tied to a client but not an event
- event-specific: tied to an event

Notes are not required to belong to a menu. Menu links live in `workflow_note_menu_links` so a single note can be attached to zero, one, or multiple menus without copying the note itself.

### 2. Canonical Dishes

Canonical reusable dishes continue to live in `dish_index`, but this spec promotes `dish_index` from a historical catalog to the canonical reusable dish source. `dish_index_components` stores the canonical multi-component dish structure that the current schema does not capture in `dish_index` today (`database/migrations/20260327000004_dish_index.sql:45-75` only stores one linked recipe plus metadata).

`dish_index_note_links` preserves note lineage so promotion never destroys the original note.

### 3. Menu Dishes

The existing `dishes` and `components` tables remain the live compatibility layer used by the menu editor (`database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150-179`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:357-387`). This spec does not rebuild that editor around a new join model.

Instead:

- `source_mode = 'manual'` means menu-local dish with no canonical source
- `source_mode = 'reference'` means menu-local compatibility rows synced from canonical `dish_index` + `dish_index_components`
- `source_mode = 'copy'` means a one-time clone from canonical `dish_index` that no longer syncs

This is a deliberate compatibility cache, not a perfectly normalized redesign.

### 4. Ownership Rules

The same ownership language must apply everywhere:

- global: no client and no event
- client-specific: client set, event unset
- event-specific: event set

Menus, workflow notes, and canonical dishes all need explicit ownership scope so builders do not guess based on loose combinations of flags.

---

## Server Actions

| Action                                        | Auth            | Input                                                                                                         | Output                                | Side Effects                                                                                                                                 |
| --------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `createWorkflowNote(input)`                   | `requireChef()` | `{ title?, body, ownership_scope, client_id?, event_id? }`                                                    | `{ success, note }`                   | Inserts `workflow_notes`, revalidates menus surfaces                                                                                         |
| `updateWorkflowNote(noteId, input)`           | `requireChef()` | partial note fields                                                                                           | `{ success, note }`                   | Updates note, revalidates linked menus                                                                                                       |
| `assignWorkflowNoteContext(noteId, input)`    | `requireChef()` | `{ ownership_scope, client_id?, event_id? }`                                                                  | `{ success }`                         | Moves note from global to client/event safely                                                                                                |
| `linkWorkflowNoteToMenu(input)`               | `requireChef()` | `{ noteId, menuId?, draftMenuKey? }`                                                                          | `{ success }`                         | Inserts `workflow_note_menu_links` without duplicating notes                                                                                 |
| `unlinkWorkflowNoteFromMenu(input)`           | `requireChef()` | `{ noteId, menuId }`                                                                                          | `{ success }`                         | Removes one menu link only                                                                                                                   |
| `promoteWorkflowNoteToDish(input)`            | `requireChef()` | `{ noteId, name, course, description?, ownership_scope?, client_id?, event_id?, attachMenuId?, attachMode? }` | `{ success, dishId, menuDishId? }`    | Creates or updates canonical `dish_index`, optional `dish_index_components`, creates lineage link, optionally adds to menu by reference/copy |
| `addCanonicalDishToMenu(input)`               | `requireChef()` | `{ menuId, dishId, mode: 'reference'                                                                          | 'copy', courseNumber?, courseName? }` | `{ success, menuDishId }`                                                                                                                    | Creates compatible `dishes` and `components` rows; `reference` keeps sync metadata, `copy` severs sync |
| `convertReferencedMenuDishToCopy(menuDishId)` | `requireChef()` | `menuDishId`                                                                                                  | `{ success }`                         | Changes a referenced menu dish into a frozen copy                                                                                            |
| `syncReferencedMenuDish(menuDishId)`          | internal helper | `menuDishId`                                                                                                  | `{ success }`                         | Updates unlocked menu rows from canonical dish source                                                                                        |
| `unlockMenu(menuId, reason)`                  | `requireChef()` | `{ menuId, reason }`                                                                                          | `{ success }`                         | Explicitly moves a locked menu back to draft, records transition reason                                                                      |

Behavior rules:

- `promoteWorkflowNoteToDish()` never deletes or overwrites the source note.
- `addCanonicalDishToMenu(mode='reference')` must refuse to create an editable local source. Source edits happen in canonical dish editing, not inside the menu row.
- `syncReferencedMenuDish()` only applies to menus in `draft` or `shared`. Locked menus are frozen.
- `unlockMenu()` is the only supported reopen path. Generic archive/restore must not silently reopen finalized menus.

---

## UI / Component Spec

### Page Layout

1. Menus landing page
   Add a compact `WorkflowNotesPanel` above the current menu library in `app/(chef)/menus/menus-client-wrapper.tsx`. This is the fastest capture point for "scattered notes" without forcing menu creation.

2. Create menu flow
   Add a "Linked Notes" step or inline section to `app/(chef)/menus/new/create-menu-form.tsx`. It must:
   - generate a `draftMenuKey` on first load
   - allow quick capture of notes against that draft key before the menu exists
   - allow selecting existing workflow notes to attach during creation
   - keep existing metadata flow and course creation flow intact

3. Menu detail screen
   Add the same `WorkflowNotesPanel` in menu-linked mode on `app/(chef)/menus/[id]/menu-detail-client.tsx` so notes can be attached after creation and promoted in context.

4. Menu assembly browser
   Add a new tab to `components/culinary/menu-assembly-browser.tsx` for canonical dishes from `dish_index`. Every add action must present `Reference` or `Copy` before writing.

### States

- **Loading:** existing skeleton/loading states remain; workflow notes panel can show a small loading list.
- **Empty:** if there are no workflow notes yet, show a short "capture your first idea" empty state. If there are no canonical dishes, point to the Dish Index and note promotion flow.
- **Error:** show inline errors for attach/promote/reference-copy actions. Do not drop the note from view when a promote action fails.
- **Populated:** show note cards with scope badge, link badges, and promotion status. Show canonical dish cards with source mode badges in menu assembly.

### Interactions

- Quick capture note
  - User types note body and optional scope
  - `createWorkflowNote()` runs
  - New note appears at top of list

- Attach note before menu exists
  - Create-menu form generates `draftMenuKey`
  - `linkWorkflowNoteToMenu({ noteId, draftMenuKey })`
  - After menu creation, backend moves draft links onto real `menu_id`

- Attach note after menu exists
  - `linkWorkflowNoteToMenu({ noteId, menuId })`
  - Note appears in menu detail/editor context

- Promote note to dish
  - User chooses dish name and course, optional ownership scope
  - `promoteWorkflowNoteToDish()` creates canonical dish and lineage link
  - Original note stays visible and marked as promoted

- Add canonical dish to menu
  - User chooses `Reference` or `Copy`
  - `Reference` creates synced compatible rows
  - `Copy` creates isolated compatible rows
  - UI badge must show mode on the resulting menu dish

- Finalize menu
  - Existing `locked` status stays
  - Editing a locked menu requires `Duplicate` or explicit `Unlock`
  - Archive is archival only, not implicit reopen

---

## Edge Cases and Error Handling

| Scenario                                                       | Correct Behavior                                                                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Note has no client, event, or menu                             | Store as `ownership_scope = 'global'`; do not block capture                                                                            |
| Note linked to draft menu but menu creation is abandoned       | Draft note links stay recoverable by draft key until manually removed                                                                  |
| Same note promoted more than once                              | Allow it only if the user explicitly chooses another promotion; lineage must show multiple dish links instead of overwriting the first |
| Canonical dish edited after being referenced in multiple menus | Sync only `draft` and `shared` menus; locked menus stay frozen                                                                         |
| Canonical dish edited after being copied into a menu           | No sync; copied menu dish stays isolated                                                                                               |
| Menu is locked and user clicks edit                            | Show duplicate or unlock flow; do not reopen by archive toggle                                                                         |
| Client or event gets assigned after note capture               | Update note ownership without deleting menu links or dish lineage                                                                      |
| Brain-dump intake produces notes only                          | Commit notes into workflow notes so the output does not disappear into chat preview only                                               |

---

## Verification Steps

1. Open the menus landing page and create a workflow note with no menu, no client, and no event.
2. Verify the note persists as global and is visible after refresh.
3. Start a new menu, link the existing note before save, then create the menu.
4. Verify the note is attached to the created menu and the menu still saves `season`, `client_id`, and `target_date`.
5. Promote the attached note into a canonical dish.
6. Verify the original note still exists, the new dish appears in the Dish Index, and note lineage is visible.
7. Add that canonical dish to Menu A as `Reference` and to Menu B as `Copy`.
8. Edit the canonical dish and verify Menu A updates while Menu B does not.
9. Lock Menu A and edit the canonical dish again. Verify the locked menu does not change.
10. Attempt to edit the locked menu and verify the UI only offers `Duplicate` or explicit `Unlock`.
11. Create a brain-dump intake with extracted notes only. Approve it and verify the notes land in workflow notes instead of disappearing after chat commit.
12. Confirm existing client choose-menu flow still works from `/my-events/[id]/choose-menu`.

---

## Out of Scope

- Replacing `client_notes` or `inquiry_notes` as general CRM note systems
- Rewriting the menu editor to eliminate materialized `dishes` and `components`
- Backfilling every historical menu dish into canonical source links
- Replacing `menu_preferences` with workflow notes
- Rebuilding approval, showcase, template, or client choose-menu flows

---

## Notes for Builder Agent

- Reuse `dish_index` as the canonical dish root. Do not create a second dish catalog.
- Keep the existing `menus -> dishes -> components` editor working. This spec deliberately uses compatibility rows for menu editing instead of a ground-up join-table rewrite.
- Fix the existing `createMenu()` persistence bug before adding new workflow behavior.
- Treat `client_notes` and `inquiry_notes` as preserved legacy/general note systems. This spec adds a culinary workflow note layer; it does not delete or merge the existing note tables.
- Keep all new writes chef-scoped through existing auth/RLS patterns.
- Preserve `source_mode`, `dish_index_id`, and `copied_from_dish_index_id` through `duplicateMenu()`, `cloneMenu()`, template instantiation, and showcase application. Do not silently strip or rewrite those semantics.
- Leave PDF/doc export, repeat detection, service history, and most client-facing reads on menu-owned compatibility rows. Those downstream readers are the reason this spec does not replace `dishes` and `components`.

---

## Spec Validation

### 1. What exists today that this touches?

- Menu root model: `menus` and `dishes` are the live operational model, and `dishes.menu_id` is required (`database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83-116`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150-179`).
- Menu creation UI is menu-first and requires a name before anything else (`app/(chef)/menus/new/create-menu-form.tsx:5`, `app/(chef)/menus/new/create-menu-form.tsx:262-285`, `app/(chef)/menus/new/create-menu-form.tsx:398-405`).
- Create schema accepts `season`, `client_id`, and `target_date`, but `createMenu()` does not insert them (`lib/menus/actions.ts:28-42`, `lib/menus/actions.ts:195-210`).
- Notes exist only in fragmented systems today: `client_notes` requires `client_id`, and `inquiry_notes` is a separate system (`database/migrations/20260221000004_client_notes.sql:22-26`, `database/migrations/20260228000003_inquiry_notes_system.sql:27`, `lib/notes/actions.ts:56-199`, `lib/inquiries/note-actions.ts:97-403`).
- Dish Index exists as a standalone catalog with linked recipe, feedback, and appearances, but it is built around historical indexing and manual CRUD (`database/migrations/20260327000004_dish_index.sql:45-75`, `database/migrations/20260327000004_dish_index.sql:83-94`, `lib/menus/dish-index-actions.ts:72-327`, `lib/menus/dish-index-bridge.ts:12-20`).
- Locking a menu indexes dishes into `dish_index`, which confirms the index is downstream of the menu flow today (`lib/menus/actions.ts:892-895`, `lib/menus/dish-index-bridge.ts:20-176`).
- Menu assembly currently copies from templates or past menus and hides the panel entirely when locked (`components/culinary/menu-assembly-browser.tsx:23-36`, `components/culinary/menu-assembly-browser.tsx:49`, `components/culinary/menu-assembly-browser.tsx:59`, `components/culinary/menu-assembly-browser.tsx:312`).
- Template and showcase flows are copy/snapshot-based (`lib/menus/template-actions.ts:249-351`, `lib/menus/template-actions.ts:364-445`, `lib/menus/showcase-actions.ts:42-104`, `lib/menus/actions.ts:1689-1739`).
- Clone/duplicate flows already deep-copy menu rows, which means source semantics can be lost or rewritten if builders do not preserve them explicitly (`lib/menus/actions.ts:1293-1430`, `components/menus/clone-menu-button.tsx:6-24`).
- Client preference intake already exists as a four-path flow feeding `menu_preferences` (`app/(client)/my-events/[id]/choose-menu/page.tsx:2-30`, `app/(client)/my-events/[id]/choose-menu/choose-menu-client.tsx:66-70`, `app/(client)/my-events/[id]/choose-menu/choose-menu-client.tsx:170-255`, `lib/menus/preference-actions.ts:25-27`, `lib/menus/preference-actions.ts:40-71`).
- Menu finalization exists but the UI and transition rules still allow indirect reopen via archive/restore (`lib/menus/actions.ts:761-765`, `app/(chef)/menus/menus-client-wrapper.tsx:71-72`, `app/(chef)/menus/menus-client-wrapper.tsx:388`, `app/(chef)/menus/[id]/menu-detail-client.tsx:296-298`, `app/(chef)/menus/[id]/menu-detail-client.tsx:642`).
- API v2 is stale and still uses `menu_name` instead of the live schema's `name` (`app/api/v2/menus/route.ts:19`, `app/api/v2/menus/route.ts:91`, `app/api/v2/menus/[id]/route.ts:19`).
- Brain-dump intake already parses notes, recipes, and clients, but commit logic only creates clients/inquiries and leaves notes in chat output (`lib/ai/parse-brain-dump.ts:35-37`, `lib/ai/agent-actions/intake-actions.ts:410-430`, `lib/ai/agent-actions/intake-actions.ts:492-527`).
- Menu history and repeat-detection flows snapshot or derive dishes from menu-owned rows rather than canonical dishes (`database/migrations/20260401000029_menu_history.sql:5-21`, `lib/menus/menu-history-actions.ts:114-177`, `lib/menus/repeat-detection.ts:47-239`).
- Approval and revision flows snapshot menu dishes from the live menu rows, not from a canonical reusable dish source (`database/migrations/20260303000004_menu_approval_workflow.sql:41-57`, `lib/menus/approval-portal.ts:31-123`, `lib/menus/revisions.ts:56-68`, `lib/communication/menu-revision-actions.ts:84-117`).
- PDF export already reads menu-owned dishes/components, and commerce event bridging already reads `dish_appearances.dish_index_id`, so downstream consumers are split between compatibility rows and canonical appearances today (`lib/documents/generate-menu-pdf.ts:62-233`, `lib/commerce/event-bridge-actions.ts:88-112`).

### 2. What exactly changes?

- Add one new independent workflow note layer instead of changing `client_notes` or `inquiry_notes`.
- Extend `dish_index` into the canonical reusable dish source by adding ownership and canonical components.
- Keep `dishes` and `components` as compatibility rows used by the current editor, but add source metadata so a row can be `manual`, `reference`, or `copy`.
- Fix `createMenu()` so it persists context fields already accepted by the schema.
- Add note capture/link/promotion UI to existing menu pages instead of building a brand new culinary app.
- Add an explicit unlock path and remove archive as the accidental reopen path.
- Align API v2 request fields with the real schema.

### 3. What assumptions are you making?

- **Verified:** the live menu editor depends on `menus -> dishes -> components`, so replacing that storage model would be a rebuild (`database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150-179`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:357-387`, `components/culinary/menu-assembly-browser.tsx:23-92`).
- **Verified:** `dish_index` exists but is not the source the menu builder adds from today (`lib/menus/dish-index-bridge.ts:198-214`, `components/culinary/menu-assembly-browser.tsx:23-36`, `components/culinary/menu-assembly-browser.tsx:85-92`).
- **Verified:** no existing workflow-note, note-to-dish promotion, or reference/copy dish-add actions were found in the current note, menu, and dish source action surfaces (`lib/notes/actions.ts:56-199`, `lib/inquiries/note-actions.ts:97-403`, `lib/menus/actions.ts:28-1740`, `lib/menus/dish-index-actions.ts:72-664`, `components/culinary/menu-assembly-browser.tsx:23-92`).
- **Deliberate tradeoff, not an uncertainty:** `reference` mode uses synced compatibility rows in `dishes` and `components` instead of a full relational rebuild. That is intentional because the current editor already depends on those tables.
- **Unverified and fenced:** whether other hidden internal tooling writes culinary notes somewhere outside the inspected surfaces. I did not find such a path in the inspected menu, note, inquiry, AI, and migration surfaces, but I am not claiming every file in the repo is relevant to this spec.

### 4. Where will this most likely break?

1. Reference sync behavior.
   - If canonical dish edits do not sync cleanly into unlocked menu rows, reference mode will look like copy mode with hidden drift. This is the highest risk because the current editor is row-based (`database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150-179`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:357-387`).
2. Menu lock/unlock rules.
   - Current transitions and UI already blur `shared`, `locked`, `archived`, and `draft` (`lib/menus/actions.ts:761-765`, `app/(chef)/menus/menus-client-wrapper.tsx:71-72`, `app/(chef)/menus/[id]/menu-detail-client.tsx:296-298`). Builders can easily preserve the old loophole by accident.
3. Draft note linking during create-menu flow.
   - The create form is currently local-state driven and only persists after submit (`app/(chef)/menus/new/create-menu-form.tsx:151-163`, `app/(chef)/menus/new/create-menu-form.tsx:188`, `app/(chef)/menus/new/create-menu-form.tsx:262-285`). Builders can lose draft-linked notes if they do not persist a stable draft key.

### 5. What is underspecified?

- Canonical dish sync scope must be explicit. This spec resolves that by syncing only `draft` and `shared` menus; locked menus never auto-change.
- Ownership rules must be explicit. This spec resolves that with `workflow_ownership_scope` and exact field rules.
- Menu reopen behavior must be explicit. This spec resolves that with an `unlockMenu()` action and by fencing archive away from implicit reopen.
- Brain-dump note persistence must be explicit. This spec resolves that by committing approved extracted notes into `workflow_notes`.

### 6. What dependencies or prerequisites exist?

- The new migration must follow existing menu and note schema (`database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83-387`, `database/migrations/20260221000004_client_notes.sql:22-26`, `database/migrations/20260327000004_dish_index.sql:45-121`, `database/migrations/20260401000106_menu_context_columns.sql:1-18`).
- API v2 alignment depends on the same live `menus` schema used by server actions (`lib/menus/actions.ts:28-42`, `app/api/v2/menus/route.ts:19`, `app/api/v2/menus/[id]/route.ts:19`).
- Approval, showcase, and template flows must keep working against menus after the new ownership/source fields land (`lib/events/menu-approval-actions.ts:40-98`, `lib/menus/template-actions.ts:249-351`, `lib/menus/showcase-actions.ts:42-104`).

### 7. What existing logic could this conflict with?

- `applyMenuToEvent()` duplicates templates/showcase menus today (`lib/menus/actions.ts:1689-1739`). New reference/copy dish behavior must not be confused with whole-menu duplication.
- Dish indexing on lock currently creates or updates canonical dish records from menu rows (`lib/menus/dish-index-bridge.ts:12-176`). That bridge must respect new source metadata or it will double-count canonical dishes.
- Menu context sidebar and intelligence helpers assume menus become meaningful after event/client linkage (`components/culinary/menu-context-sidebar.tsx:265`, `lib/menus/menu-intelligence-actions.ts:1000-1133`). New global notes must not break those assumptions.
- Client preference flow already writes to `menu_preferences` and notifies the chef (`lib/menus/preference-actions.ts:40-107`, `components/events/menu-library-picker.tsx:118-215`). This spec must not replace that table.
- `cloneMenu()` and `duplicateMenu()` already deep-copy menu rows (`lib/menus/actions.ts:1293-1430`, `components/menus/clone-menu-button.tsx:6-24`). If builders drop or rewrite source metadata there, cloned menus will silently change from reference to copy or vice versa.
- Menu history and repeat detection still infer meaning from menu-owned dishes and `dishes_served` snapshots (`lib/menus/menu-history-actions.ts:114-418`, `lib/menus/repeat-detection.ts:47-239`, `database/migrations/20260401000029_menu_history.sql:5-21`). The compatibility-row contract must stay intact.
- Approval/revision snapshots currently serialize dishes and linked recipe context from menu rows (`lib/menus/approval-portal.ts:31-123`, `lib/menus/revisions.ts:56-68`, `lib/communication/menu-revision-actions.ts:84-117`). Builders can accidentally make reference/copy behavior invisible there unless snapshot enrichment is explicit.

### 8. What is the end-to-end data flow?

1. User captures a workflow note from the menus landing page or create-menu form.
2. `createWorkflowNote()` writes `workflow_notes`.
3. If created in a new-menu draft, `linkWorkflowNoteToMenu({ draftMenuKey })` writes `workflow_note_menu_links`.
4. When the menu is created, `createMenu()` writes `menus` and resolves draft links onto the new `menu_id`.
5. User promotes a note.
6. `promoteWorkflowNoteToDish()` writes `dish_index`, `dish_index_components`, and `dish_index_note_links`.
7. User adds the canonical dish to a menu.
8. `addCanonicalDishToMenu()` writes compatible `dishes` and `components` rows plus source metadata (`source_mode`, `dish_index_id`, `dish_index_component_id`).
9. Menu editor reads the same menu rows it already reads today, plus source metadata for badges and edit restrictions.
10. If the canonical dish is edited later, `syncReferencedMenuDish()` updates only unlocked referenced menu rows.
11. When the menu is locked, existing menu lock flow runs and dish appearances still land in `dish_index`, but bridge logic uses source metadata to avoid creating duplicate canonical records.

### 9. What is the correct implementation order?

1. Add migration with workflow note tables, canonical dish component table, and source metadata columns.
2. Fix `createMenu()` persistence bug and API v2 field mismatch before new UI starts sending those fields reliably.
3. Implement `lib/notes/workflow-actions.ts`.
4. Extend `dish_index` actions and add `lib/menus/dish-source-actions.ts`.
5. Update dish-index bridge so locking works with source metadata.
6. Add menu create/menu detail/menu landing page workflow note UI.
7. Add canonical dish reference/copy UI to `menu-assembly-browser`.
8. Add explicit unlock flow and remove archive-based reopen.
9. Update AI intake commit logic to persist extracted notes into workflow notes.

### 10. What are the exact success criteria?

- A workflow note can be created with no menu, no client, and no event.
- A workflow note can later be assigned to a client or event without losing its body or links.
- A note can be attached before menu creation via draft key, during creation, or after the menu already exists.
- Promoting a note creates a canonical dish and leaves the original note intact with visible lineage.
- A canonical dish can be added to menus as `Reference` or `Copy`, and the mode is visible after add.
- Editing a canonical dish updates referenced unlocked menus and does not update copied menus.
- Locking a menu freezes referenced dish sync.
- Editing a locked menu requires duplicate or explicit unlock.
- Client choose-menu flow, showcase/template flows, approval flow, and current menu editor still work.

### 11. What are the non-negotiable constraints?

- Chef auth and tenant scoping must match existing menu and note patterns (`lib/menus/actions.ts:170-193`, `lib/notes/actions.ts:56-62`, `lib/inquiries/note-actions.ts:97-103`).
- No destructive migration of existing menu, note, or dish data.
- No silent duplication of notes during menu attachment.
- No destructive overwrite of a note during note-to-dish promotion.
- No implicit reopen of a finalized menu through archive/restore UI.

### 12. What should NOT be touched?

- Do not rewrite the client choose-menu pages beyond keeping them compatible (`app/(client)/my-events/[id]/choose-menu/page.tsx:2-30`, `app/(client)/my-events/[id]/choose-menu/choose-menu-client.tsx:170-411`).
- Do not replace `menu_preferences`, `menu_approval_requests`, or approval RPCs (`database/migrations/20260330000013_menu_preferences_and_showcase.sql:14-35`, `lib/events/menu-approval-actions.ts:40-277`).
- Do not delete or repurpose `client_notes` or `inquiry_notes`.
- Do not rebuild the menu editor around a new data model in this spec.
- Do not rebuild PDF/doc export, repeat detection, or service-history readers around canonical dishes. Their compatibility with menu-owned rows is a deliberate part of this design (`lib/documents/generate-menu-pdf.ts:62-233`, `lib/menus/menu-history-actions.ts:114-418`, `lib/menus/repeat-detection.ts:47-239`).

### 13. Is this the simplest complete version?

Yes. It is the smallest version that satisfies the developer's required truths without a rebuild:

- one new workflow-note layer instead of refactoring legacy CRM notes
- one canonical dish source built on top of existing `dish_index`
- compatibility rows in existing `dishes` and `components` instead of a full editor rewrite
- minimal UI insertion into existing menu pages instead of a separate product area

Anything smaller fails one of the required truths:

- no workflow-note table means notes are still fragmented
- no canonical dish source means reference vs copy cannot be explicit
- no draft note linking means "before menu exists" is still false
- no explicit unlock means finalization remains ambiguous

### 14. If implemented exactly as written, what would still be wrong?

- `Reference` mode still relies on synchronized compatibility rows in `dishes` and `components` rather than a perfectly normalized source-of-truth read model. That is a conscious compromise to avoid rebuilding the editor.
- Existing historical menus and legacy notes will not automatically gain perfect lineage. This spec fixes the workflow going forward and leaves full historical normalization out of scope.
- Brain-dump notes will persist after approval, but this spec does not attempt to rework every other AI or import pathway into the same note system.

### What would a builder get wrong building this as written?

- They would try to reuse `client_notes` or `inquiry_notes` directly and recreate the current fragmentation.
- They would treat `dish_index` as "already good enough" without adding canonical components, which would make reference mode incomplete.
- They would implement `Reference` as a copy with a nicer label and never build sync behavior.
- They would leave `locked -> archived -> draft` intact and claim finalization is fixed.
- They would add a brand new notes app instead of inserting note capture into the existing menu surfaces.
- They would skip the `createMenu()` context bug because it looks unrelated, even though it already breaks attach-later context.
- They would forget that duplicate/clone/template flows must preserve source metadata and would silently strip `reference` vs `copy` semantics when cloning menus.
- They would move history, revision, or export readers onto canonical dishes and accidentally break the compatibility contract that keeps current downstream surfaces working.

### Is anything assumed but not verified?

- Verified: current menu creation, dish index, template, showcase, approval, menu preferences, note actions, AI intake, and menu assembly surfaces were all inspected directly in code and migrations cited above.
- Verified: menu history, repeat detection, clone/duplicate flows, revision snapshots, PDF export, and commerce event-bridge surfaces were also inspected and accounted for in this spec.
- Unverified: whether there are low-traffic internal admin or analytics screens outside the inspected menu/note/inquiry/AI/history/revision/export/commerce surfaces that should also expose workflow notes. I did not find them in the inspected paths, so this is flagged rather than assumed solved.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the intended scope.

The main tradeoff is explicit, not hidden: referenced dishes are synchronized compatibility rows inside the current menu editor model, not a full storage rewrite. That is the simplest complete version that satisfies the developer's constraints and preserves existing functionality.
