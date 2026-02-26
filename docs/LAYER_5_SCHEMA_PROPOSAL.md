# LAYER 5 SCHEMA PROPOSAL

## Planning & Production Documents

Version 1.0 — February 16, 2026

---

## OVERVIEW

Layer 5 implements the complete planning and production document system that allows a chef to prepare for an event with confidence. These documents unlock progressively as facts confirm and represent the externalized execution workflow that reduces mental load and prevents forgotten items.

**Design Principles:**

- Documents unlock progressively (menu confirmed → grocery list → prep list → packing list → execution sheet)
- Documents are versioned (never overwrite, capture state at generation time)
- Documents link to the event + menu + components they represent
- Grocery lists auto-generate from recipes + ingredients
- Prep lists organize by course order with priority (longest cook time first)
- Packing lists verify component counts match menu structure
- Equipment lists track must-bring vs assume-exists
- Timelines work backwards from arrival time
- Execution sheets show on-site actions only (clean, no prep notes)
- Everything is tenant-scoped

**Three Printed Sheets:**

1. **Prep Sheet** — Used at home, organized by course order, gets messy
2. **Service Execution Sheet** — Goes to client's house, clean, on-site actions only
3. **Non-Negotiables Checklist** — Gloves, gum, uniform, towels, trash bags, etc.

---

## TABLE 1: `grocery_lists`

A grocery list belongs to an event and is generated from the menu's recipes and ingredients. Supports progressive refinement: structural → quantified → finalized.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE SET NULL
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1 (increments on regeneration)
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id
- `status` — grocery_list_status enum, NOT NULL, default 'draft'
  - States: draft, finalized, archived
  - draft: items can be added/removed, quantities can change
  - finalized: locked for shopping
  - archived: historical record

#### Shopping Metadata

- `shopping_completed_at` — TIMESTAMPTZ, nullable
- `total_estimated_cost_cents` — INTEGER, nullable (sum of ingredient estimates)
- `actual_cost_cents` — INTEGER, nullable (recorded after shopping)
- `stores` — JSONB, nullable (array of store names/addresses)
- `notes` — TEXT, nullable (chef notes)

#### Status Timestamps

- `finalized_at` — TIMESTAMPTZ, nullable
- `archived_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_grocery_lists_tenant_id` on (tenant_id)
- `idx_grocery_lists_event_id` on (event_id)
- `idx_grocery_lists_menu_id` on (menu_id)
- `idx_grocery_lists_status` on (status)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 2: `grocery_list_items`

Individual items on a grocery list. Generated from recipe_ingredients but can be manually adjusted.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `grocery_list_id` — UUID, NOT NULL, FK to grocery_lists.id ON DELETE CASCADE
- `ingredient_id` — UUID, nullable, FK to ingredients.id (null if manual item)
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Item Details

- `item_name` — TEXT, NOT NULL (ingredient name or custom item)
- `category` — ingredient_category enum, nullable (for organizing list)
- `quantity` — DECIMAL(10,3), NOT NULL
- `unit` — TEXT, NOT NULL (free text, e.g., "lbs", "bunch", "bottle")
- `estimated_price_cents` — INTEGER, nullable
- `actual_price_cents` — INTEGER, nullable (recorded after shopping)

#### Source Tracking

- `source` — grocery_item_source enum, NOT NULL, default 'recipe'
  - Values: recipe, manual, staple
  - recipe: auto-generated from recipe_ingredients
  - manual: chef added manually
  - staple: chef always has this, added for verification

#### Shopping Metadata

- `is_purchased` — BOOLEAN, NOT NULL, default false
- `purchased_at` — TIMESTAMPTZ, nullable
- `vendor` — TEXT, nullable (store name)
- `notes` — TEXT, nullable (e.g., "check frozen section", "ask butcher")
- `sort_order` — INTEGER, NOT NULL, default 0

### Indexes

- `idx_grocery_list_items_grocery_list_id` on (grocery_list_id)
- `idx_grocery_list_items_ingredient_id` on (ingredient_id)
- `idx_grocery_list_items_category` on (category)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 3: `prep_lists`

A prep list belongs to an event and organizes all production tasks by course order with priority indicators. Separates early prep (make-ahead) from day-of execution.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE SET NULL
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id
- `status` — prep_list_status enum, NOT NULL, default 'draft'
  - States: draft, active, completed, archived
  - draft: tasks can be added/removed/reordered
  - active: chef is executing tasks
  - completed: all tasks done
  - archived: historical record

#### Execution Metadata

- `prep_started_at` — TIMESTAMPTZ, nullable
- `prep_completed_at` — TIMESTAMPTZ, nullable
- `total_tasks` — INTEGER, NOT NULL, default 0
- `completed_tasks` — INTEGER, NOT NULL, default 0
- `notes` — TEXT, nullable

#### Status Timestamps

- `archived_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_prep_lists_tenant_id` on (tenant_id)
- `idx_prep_lists_event_id` on (event_id)
- `idx_prep_lists_menu_id` on (menu_id)
- `idx_prep_lists_status` on (status)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `update_prep_list_task_counts` — recompute total_tasks and completed_tasks when prep_list_items change

---

## TABLE 4: `prep_list_items`

Individual prep tasks on a prep list. Generated from menu components + recipes but can be manually adjusted.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `prep_list_id` — UUID, NOT NULL, FK to prep_lists.id ON DELETE CASCADE
- `component_id` — UUID, nullable, FK to components.id (links to menu component)
- `recipe_id` — UUID, nullable, FK to recipes.id (links to recipe)
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Task Details

- `course_number` — INTEGER, NOT NULL (which course this belongs to)
- `task_description` — TEXT, NOT NULL (e.g., "Make Diane Sauce", "Boil potatoes for smashed potatoes")
- `priority` — INTEGER, NOT NULL, default 0 (higher = do first within course)
- `estimated_time_minutes` — INTEGER, nullable

#### Make-Ahead Classification

- `can_make_ahead` — BOOLEAN, NOT NULL, default false
- `make_ahead_window_hours` — INTEGER, nullable (safe window before event)
- `texture_sensitive` — BOOLEAN, NOT NULL, default false (can't be made too early)

#### Execution Tracking

- `is_completed` — BOOLEAN, NOT NULL, default false
- `completed_at` — TIMESTAMPTZ, nullable
- `notes` — TEXT, nullable
- `sort_order` — INTEGER, NOT NULL, default 0

### Indexes

- `idx_prep_list_items_prep_list_id` on (prep_list_id)
- `idx_prep_list_items_component_id` on (component_id)
- `idx_prep_list_items_recipe_id` on (recipe_id)
- `idx_prep_list_items_course` on (course_number, priority DESC)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 5: `equipment_lists`

Equipment list tracks items the chef must bring vs items assumed to exist at the site. Prevents forgotten tools.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id
- `status` — equipment_list_status enum, NOT NULL, default 'draft'
  - States: draft, finalized, archived

#### Status Timestamps

- `finalized_at` — TIMESTAMPTZ, nullable
- `archived_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_equipment_lists_tenant_id` on (tenant_id)
- `idx_equipment_lists_event_id` on (event_id)
- `idx_equipment_lists_status` on (status)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 6: `equipment_list_items`

Individual equipment items with classification (must-bring, assume-exists, confirm-required).

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `equipment_list_id` — UUID, NOT NULL, FK to equipment_lists.id ON DELETE CASCADE
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Item Details

- `item_name` — TEXT, NOT NULL (e.g., "Chef knife", "Cutting board", "Cooler")
- `category` — equipment_category enum, NOT NULL
  - Values: knife, tool, cookware, serveware, storage, safety, cleaning, other
- `classification` — equipment_classification enum, NOT NULL
  - Values: must_bring, assume_exists, confirm_required
  - must_bring: chef brings every time
  - assume_exists: client has this (e.g., oven, plates)
  - confirm_required: ask client if they have (e.g., stand mixer, immersion blender)

#### Packing Metadata

- `is_packed` — BOOLEAN, NOT NULL, default false
- `packed_at` — TIMESTAMPTZ, nullable
- `quantity` — INTEGER, NOT NULL, default 1
- `notes` — TEXT, nullable
- `sort_order` — INTEGER, NOT NULL, default 0

### Indexes

- `idx_equipment_list_items_equipment_list_id` on (equipment_list_id)
- `idx_equipment_list_items_category` on (category)
- `idx_equipment_list_items_classification` on (classification)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 7: `packing_lists`

Packing list verifies component counts match menu structure. Organized by storage type (cold → dry → tools → fragile).

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE SET NULL
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id
- `status` — packing_list_status enum, NOT NULL, default 'draft'
  - States: draft, in_progress, verified, archived

#### Packing Metadata

- `total_components` — INTEGER, NOT NULL, default 0 (from menu)
- `packed_components` — INTEGER, NOT NULL, default 0
- `packing_started_at` — TIMESTAMPTZ, nullable
- `packing_completed_at` — TIMESTAMPTZ, nullable
- `verification_notes` — TEXT, nullable

#### Status Timestamps

- `archived_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_packing_lists_tenant_id` on (tenant_id)
- `idx_packing_lists_event_id` on (event_id)
- `idx_packing_lists_menu_id` on (menu_id)
- `idx_packing_lists_status` on (status)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 8: `packing_list_items`

Individual packing items organized by storage type and course. Links to menu components for verification.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `packing_list_id` — UUID, NOT NULL, FK to packing_lists.id ON DELETE CASCADE
- `component_id` — UUID, nullable, FK to components.id (links to menu component)
- `equipment_list_item_id` — UUID, nullable, FK to equipment_list_items.id
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Item Details

- `course_number` — INTEGER, nullable (which course, null for equipment/tools)
- `item_name` — TEXT, NOT NULL (e.g., "Diane Sauce in container", "Chef knife")
- `storage_type` — packing_storage_type enum, NOT NULL
  - Values: cold, dry, tools, fragile, non_negotiables
- `container_type` — TEXT, nullable (e.g., "cooler", "tote bag", "knife roll")

#### Packing Metadata

- `is_packed` — BOOLEAN, NOT NULL, default false
- `packed_at` — TIMESTAMPTZ, nullable
- `quantity` — INTEGER, NOT NULL, default 1
- `notes` — TEXT, nullable
- `sort_order` — INTEGER, NOT NULL, default 0

### Indexes

- `idx_packing_list_items_packing_list_id` on (packing_list_id)
- `idx_packing_list_items_component_id` on (component_id)
- `idx_packing_list_items_storage_type` on (storage_type)
- `idx_packing_list_items_course` on (course_number)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 9: `timelines`

Day-of schedule working backwards from arrival time. Includes all stops (grocery, liquor, client).

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id

#### Timeline Metadata

- `event_start_time` — TIMESTAMPTZ, NOT NULL (arrival at client)
- `wake_up_time` — TIMESTAMPTZ, nullable (absolute latest)
- `total_prep_time_minutes` — INTEGER, nullable
- `total_travel_time_minutes` — INTEGER, nullable
- `notes` — TEXT, nullable

### Indexes

- `idx_timelines_tenant_id` on (tenant_id)
- `idx_timelines_event_id` on (event_id)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 10: `timeline_items`

Individual time blocks in the day-of schedule (wake up, shop, prep, pack, travel, arrive).

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `timeline_id` — UUID, NOT NULL, FK to timelines.id ON DELETE CASCADE
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Time Block Details

- `item_type` — timeline_item_type enum, NOT NULL
  - Values: wake_up, shop, prep, pack, travel, arrive, buffer
- `description` — TEXT, NOT NULL (e.g., "Leave for Market Basket + One Stop")
- `scheduled_time` — TIMESTAMPTZ, NOT NULL
- `duration_minutes` — INTEGER, nullable
- `location` — TEXT, nullable (address for stops)
- `notes` — TEXT, nullable
- `sort_order` — INTEGER, NOT NULL, default 0

#### Tracking

- `is_completed` — BOOLEAN, NOT NULL, default false
- `completed_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_timeline_items_timeline_id` on (timeline_id)
- `idx_timeline_items_scheduled_time` on (scheduled_time)
- `idx_timeline_items_item_type` on (item_type)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 11: `execution_sheets`

Service execution sheet for on-site use. Clean, only shows what happens at client's house. Gets taped to counter.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE SET NULL
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Document Metadata

- `version` — INTEGER, NOT NULL, default 1
- `generated_at` — TIMESTAMPTZ, NOT NULL, default now()
- `generated_by` — UUID, nullable, FK to auth.users.id

#### Execution Metadata

- `service_started_at` — TIMESTAMPTZ, nullable
- `service_completed_at` — TIMESTAMPTZ, nullable
- `notes` — TEXT, nullable

### Indexes

- `idx_execution_sheets_tenant_id` on (tenant_id)
- `idx_execution_sheets_event_id` on (event_id)
- `idx_execution_sheets_menu_id` on (menu_id)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## TABLE 12: `execution_sheet_items`

On-site actions organized by course. Includes component counts, plating notes, timing reminders.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `execution_sheet_id` — UUID, NOT NULL, FK to execution_sheets.id ON DELETE CASCADE
- `component_id` — UUID, nullable, FK to components.id
- `created_at` — TIMESTAMPTZ, NOT NULL, default now()
- `updated_at` — TIMESTAMPTZ, NOT NULL, default now()

#### Item Details

- `course_number` — INTEGER, NOT NULL
- `course_name` — TEXT, NOT NULL (e.g., "Steak Diane with Sides")
- `action_type` — execution_action_type enum, NOT NULL
  - Values: verification, cooking, plating, timing_reminder, client_note
- `description` — TEXT, NOT NULL
- `component_count` — INTEGER, nullable (for verification actions)
- `timing_note` — TEXT, nullable (e.g., "Start 30 min before serving")
- `sort_order` — INTEGER, NOT NULL, default 0

#### Tracking

- `is_completed` — BOOLEAN, NOT NULL, default false
- `completed_at` — TIMESTAMPTZ, nullable

### Indexes

- `idx_execution_sheet_items_execution_sheet_id` on (execution_sheet_id)
- `idx_execution_sheet_items_component_id` on (component_id)
- `idx_execution_sheet_items_course` on (course_number, sort_order)
- `idx_execution_sheet_items_action_type` on (action_type)

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## ENUMS

### `grocery_list_status`

```
draft
finalized
archived
```

### `grocery_item_source`

```
recipe
manual
staple
```

### `prep_list_status`

```
draft
active
completed
archived
```

### `equipment_list_status`

```
draft
finalized
archived
```

### `equipment_category`

```
knife
tool
cookware
serveware
storage
safety
cleaning
other
```

### `equipment_classification`

```
must_bring
assume_exists
confirm_required
```

### `packing_list_status`

```
draft
in_progress
verified
archived
```

### `packing_storage_type`

```
cold
dry
tools
fragile
non_negotiables
```

### `timeline_item_type`

```
wake_up
shop
prep
pack
travel
arrive
buffer
```

### `execution_action_type`

```
verification
cooking
plating
timing_reminder
client_note
```

---

## TRIGGERS

### 1. `update_updated_at_timestamp`

**Tables:** All 12 tables in Layer 5
**Action:** BEFORE UPDATE, set NEW.updated_at = now()

### 2. `update_prep_list_task_counts`

**Table:** prep_lists
**Action:** AFTER INSERT/UPDATE/DELETE on prep_list_items
**Logic:**

- Recompute total_tasks = COUNT of prep_list_items
- Recompute completed_tasks = COUNT where is_completed = true
- Update prep_lists.total_tasks and completed_tasks

### 3. `update_packing_list_component_counts`

**Table:** packing_lists
**Action:** AFTER INSERT/UPDATE/DELETE on packing_list_items
**Logic:**

- Recompute packed_components = COUNT where is_packed = true
- Update packing_lists.packed_components

---

## RLS POLICIES

All tables follow the same tenant isolation pattern established in Layers 1-4 using `get_current_tenant_id()` and `get_current_user_role()` helper functions.

### General Pattern (applied to all Layer 5 tables)

**Policy Name:** `tenant_isolation_select`
**Action:** SELECT
**Using:** `tenant_id = get_current_tenant_id()`

**Policy Name:** `tenant_isolation_insert`
**Action:** INSERT
**With Check:** `tenant_id = get_current_tenant_id()`

**Policy Name:** `tenant_isolation_update`
**Action:** UPDATE
**Using:** `tenant_id = get_current_tenant_id()`
**With Check:** `tenant_id = get_current_tenant_id()`

### Specific Tables with RLS

1. **grocery_lists** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, cascade from event)
2. **grocery_list_items** — inherit from grocery_list, SELECT/INSERT/UPDATE only
3. **prep_lists** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only
4. **prep_list_items** — inherit from prep_list, SELECT/INSERT/UPDATE only
5. **equipment_lists** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only
6. **equipment_list_items** — inherit from equipment_list, SELECT/INSERT/UPDATE only
7. **packing_lists** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only
8. **packing_list_items** — inherit from packing_list, SELECT/INSERT/UPDATE only
9. **timelines** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only
10. **timeline_items** — inherit from timeline, SELECT/INSERT/UPDATE only
11. **execution_sheets** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only
12. **execution_sheet_items** — inherit from execution_sheet, SELECT/INSERT/UPDATE only

**IMPORTANT:** No DELETE policies exist for any Layer 5 tables. These records are never hard-deleted. Documents are versioned and archived, not deleted.

### Client Portal Policies

**No client portal access to Layer 5 documents.** These are chef-only execution tools. Clients see menus (Layer 4) but not internal planning documents.

---

## VIEWS (for derived metrics)

### 1. `event_planning_status`

Shows which planning documents exist for each event and their status.

**Columns:**

- event_id
- tenant_id
- has_grocery_list (boolean)
- grocery_list_status (enum or null)
- has_prep_list (boolean)
- prep_list_status (enum or null)
- has_equipment_list (boolean)
- has_packing_list (boolean)
- packing_list_verified (boolean)
- has_timeline (boolean)
- has_execution_sheet (boolean)
- planning_complete (boolean — all documents generated)

### 2. `prep_progress_summary`

Per-event prep completion tracking.

**Columns:**

- event_id
- prep_list_id
- total_tasks
- completed_tasks
- completion_percentage
- make_ahead_tasks_count
- day_of_tasks_count
- estimated_total_time_minutes

### 3. `packing_verification_summary`

Per-event packing verification status.

**Columns:**

- event_id
- packing_list_id
- expected_components (from menu)
- packed_components
- missing_components
- cold_items_count
- dry_items_count
- tools_count
- packing_complete (boolean)

---

## HELPER FUNCTIONS

### 1. `generate_grocery_list_from_menu(p_event_id UUID, p_menu_id UUID)`

Returns grocery list ID. Auto-generates grocery list items from menu → dishes → components → recipes → ingredients.

**Logic:**

1. Create grocery_list record
2. For each recipe in menu, aggregate recipe_ingredients
3. Group by ingredient_id, SUM quantities
4. Create grocery_list_items
5. Filter out staples (ingredients.is_staple = true)
6. Return grocery_list.id

### 2. `generate_prep_list_from_menu(p_event_id UUID, p_menu_id UUID)`

Returns prep list ID. Auto-generates prep list items from menu → dishes → components → recipes.

**Logic:**

1. Create prep_list record
2. For each component in menu, create prep_list_item
3. Set course_number from dish.course_number
4. Set priority based on recipe.total_time_minutes (longest cook time = highest priority)
5. Flag make-ahead items from component.is_make_ahead
6. Order by course_number ASC, priority DESC
7. Return prep_list.id

### 3. `generate_packing_list_from_menu(p_event_id UUID, p_menu_id UUID)`

Returns packing list ID. Auto-generates packing list items from menu components + equipment list.

**Logic:**

1. Create packing_list record
2. Set total_components = get_menu_total_component_count(p_menu_id)
3. For each component in menu, create packing_list_item with storage_type = 'cold' (default)
4. Add equipment_list_items with classification = 'must_bring'
5. Add non-negotiables checklist items
6. Return packing_list.id

### 4. `generate_timeline_from_event(p_event_id UUID)`

Returns timeline ID. Auto-generates day-of schedule working backwards from arrival time.

**Logic:**

1. Create timeline record
2. Get event.arrival_time
3. Create timeline_items working backwards:
   - Arrive at client (event.arrival_time)
   - Leave house (arrival - travel_time)
   - Car packed (leave - 30min)
   - Finish prep (packed - estimated_prep_time)
   - Start prep (finish_prep - prep_duration)
   - Home from shopping (start_prep - buffer)
   - Leave for store (home - shopping_duration)
   - Wake up (leave - morning_buffer)
4. Return timeline.id

### 5. `generate_execution_sheet_from_menu(p_event_id UUID, p_menu_id UUID)`

Returns execution sheet ID. Auto-generates on-site action list from menu structure.

**Logic:**

1. Create execution_sheet record
2. For each dish in menu, create execution_sheet_items:
   - verification: "Course X has Y components" (from get_dish_component_count)
   - cooking: on-site cooking actions from component.execution_notes
   - plating: plating instructions
   - timing_reminder: timing notes from component.execution_notes
   - client_note: dietary restrictions, allergies from dish.allergen_flags
3. Order by course_number ASC
4. Return execution_sheet.id

---

## DATA INTEGRITY RULES

### Document Versioning

1. **All document tables** — version field increments on regeneration (never overwrite)
2. **Documents link to snapshots** — documents reference event_id + menu_id at generation time

### Cascade Deletion Rules

1. **events → all planning documents** — CASCADE (documents deleted when event deleted)
2. **menus → document items** — SET NULL (items remain if menu deleted)
3. **Parent documents → child items** — CASCADE (items deleted when parent document deleted)

### Computed Fields (trigger-maintained)

1. **prep_lists.total_tasks** — COUNT of prep_list_items
2. **prep_lists.completed_tasks** — COUNT where is_completed = true
3. **packing_lists.packed_components** — COUNT where is_packed = true
4. **packing_lists.total_components** — from get_menu_total_component_count

---

## MIGRATION DEPENDENCIES

Layer 5 depends on:

- Layer 1: chefs, user_roles, auth schema
- Layer 3: events
- Layer 4: menus, dishes, components, recipes, ingredients

---

## WHAT THIS ENABLES

With Layer 5 complete, ChefFlow can now:

### Progressive Document Unlocking

- Menu confirmed → grocery list auto-generates
- Guest count confirmed → grocery list quantities finalized
- Grocery list finalized → prep list unlocks
- Prep list active → packing list unlocks
- All documents ready → timeline and execution sheet generated

### Grocery List Management

- Auto-generate from recipes + ingredients
- Filter out staples (chef always has)
- Group by store/category
- Track estimated vs actual cost
- Mark items as purchased while shopping

### Prep List Execution

- Organize tasks by course order
- Priority within each course (longest cook time first)
- Separate make-ahead from day-of tasks
- Track completion progress
- Prevent forgotten components

### Equipment Tracking

- Must-bring items (chef owns)
- Assume-exists items (client has)
- Confirm-required items (ask client)
- Prevent forgotten tools

### Packing Verification

- Component count verification (Course 3 has 5 components → 5 containers)
- Organize by storage type (cold → dry → tools)
- Track packing progress
- Non-negotiables checklist (gloves, gum, uniform, towels)

### Day-Of Scheduling

- Timeline working backwards from arrival
- All stops mapped (grocery, liquor, client)
- Wake-up time calculated
- Buffer time included
- Anti-procrastination structure

### On-Site Execution

- Clean execution sheet (no prep notes)
- Component counts per course
- Dietary restrictions flagged
- Plating reminders
- Timing notes
- Gets taped to counter

---

## WHAT'S NOT in Layer 5

**Deferred to Layer 6 (Loyalty & Referrals):**

- loyalty_points_ledger table (append-only)
- loyalty_rewards table
- loyalty_tiers table
- referrals table
- referral_rewards table

**Future Refinements (Post-V1):**

- AI-generated grocery lists from natural language menus
- Route optimization for shopping stops
- Calendar integration for timeline
- Print-optimized PDF generation
- Mobile packing list checklist
- Real-time prep progress tracking during execution

---

## THREE PRINTED SHEETS CONTRACT

Layer 5 must support generation of exactly three printed documents per event:

### 1. Prep Sheet

**Source:** prep_list + prep_list_items
**Format:** Organized by course order, priority DESC within each course
**Usage:** Used at home during cooking, gets messy, dies after prep
**Requirements:**

- Longest cook time tasks at top of each course
- Pack-only tasks at bottom
- Make-ahead tasks flagged
- Estimated time per task

### 2. Service Execution Sheet

**Source:** execution_sheet + execution_sheet_items
**Format:** Clean, organized by course, on-site actions only
**Usage:** Goes to client's house, taped to counter
**Requirements:**

- Component counts for packing verification
- Dietary restrictions and allergens flagged prominently
- Plating notes
- Timing reminders
- Clean menu for reference

### 3. Non-Negotiables Checklist

**Source:** packing_list_items with storage_type = 'non_negotiables'
**Format:** Simple checklist
**Usage:** Checked before walking out the door
**Requirements:**

- Gloves, gum/mints, clean uniform, clean shoes
- Towels, trash bags, parchment paper
- Salt, oil, pepper
- Any frequently-forgotten items

---

## END OF PROPOSAL

This is the complete schema for Layer 5. Ready for review and SQL implementation once approved.

**Proposed Tables:** 12
**Proposed Enums:** 10
**Proposed Triggers:** ~15
**Proposed RLS Policies:** ~24 (chef isolation, no client access)
**Proposed Views:** 3
**Proposed Helper Functions:** 5

**Total Tables (Layers 1-5):** 35
**Total Enums (Layers 1-5):** 33
**Status:** PENDING APPROVAL
