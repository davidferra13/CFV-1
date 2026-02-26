# LAYER 4 SCHEMA PROPOSAL

## Menus, Dishes, Components, Recipes, Ingredients, Costing

Version 1.0 — February 15, 2026

---

## OVERVIEW

Layer 4 implements the complete menu hierarchy (Menu → Dishes → Components → Recipes → Ingredients), the Recipe Bible (Part 7), and the Costing Engine (Part 8). This layer enables menu drafting, recipe standardization, component tracking, and automatic food cost calculation.

**Design Principles:**

- Recipe Bible builds over time from real events
- Recipes exist independently, linked to many components across many events
- Component count drives packing verification
- Recipe costing flows from ingredients → recipes → components → dishes → menus
- Allergen flags propagate (computed, not stored redundantly)
- Ingredient price tracking (simple V1 approach: last_price_cents, last_price_date)
- Recipes and ingredients never deleted, only archived
- Menu state machine: draft → shared → locked → archived
- Tenant isolation (tenant_id scoped everywhere)

---

## TABLE 1: `menus`

A menu belongs to an event. Contains courses (dishes). Can exist as reusable template or one-off event menu.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, nullable, FK to events.id (nullable when template, set when attached to event)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Menu Details

- `name` — text, NOT NULL (e.g., "Valentine's Day Dinner for Michel", "Summer BBQ Template")
- `description` — text, nullable
- `is_template` — boolean, NOT NULL, default false (reusable template vs one-off)

#### State Machine

- `status` — menu_status enum, NOT NULL, default 'draft'
  - States: draft, shared, locked, archived
  - draft: being built
  - shared: sent to client for review
  - locked: approved and finalized (no more changes)
  - archived: historical record

#### Menu Metadata

- `cuisine_type` — text, nullable (e.g., "French", "Italian", "Contemporary American")
- `service_style` — event_service_style enum, nullable (references Layer 3 enum)
- `target_guest_count` — integer, nullable (for template scaling)
- `notes` — text, nullable (chef-only notes)

#### Status Timestamps

- `shared_at` — timestamptz, nullable
- `locked_at` — timestamptz, nullable
- `archived_at` — timestamptz, nullable

#### Audit

- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes

- `idx_menus_tenant_id` on (tenant_id)
- `idx_menus_event_id` on (event_id)
- `idx_menus_status` on (status)
- `idx_menus_is_template` on (is_template)

### Constraints

- CHECK: target_guest_count > 0 OR target_guest_count IS NULL

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `validate_menu_state_transition` — before UPDATE, enforce valid state transitions
- `log_menu_state_transition` — after UPDATE, insert into menu_state_transitions

---

## TABLE 2: `menu_state_transitions`

Immutable audit trail of menu state changes. Identical pattern to inquiry/event/quote transitions.

### Columns

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE CASCADE
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (denormalized for tenant scoping)
- `from_status` — menu_status enum, nullable (null for initial state)
- `to_status` — menu_status enum, NOT NULL
- `transitioned_at` — timestamptz, NOT NULL, default now()
- `transitioned_by` — UUID, nullable, FK to auth.users.id
- `reason` — text, nullable
- `metadata` — jsonb, nullable

### Indexes

- `idx_menu_transitions_menu_id` on (menu_id)
- `idx_menu_transitions_tenant_id` on (tenant_id)

### Constraints

- IMMUTABLE via trigger (no UPDATE/DELETE allowed)

### Triggers

- `prevent_menu_transition_mutation` — raise exception on UPDATE or DELETE

---

## TABLE 3: `dishes`

A dish belongs to a menu and represents one course. Each dish contains multiple components.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `menu_id` — UUID, NOT NULL, FK to menus.id ON DELETE CASCADE
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Dish Details

- `course_number` — integer, NOT NULL (1, 2, 3, 4, etc.)
- `course_name` — text, NOT NULL (e.g., "Charcuterie Board", "Steak Diane with Sides")
- `description` — text, nullable (full description for client)
- `sort_order` — integer, NOT NULL, default 0 (for custom ordering within course)

#### Dietary & Allergen Flags

- `dietary_tags` — text[], NOT NULL, default '{}' (vegetarian, vegan, gluten-free, etc.)
- `allergen_flags` — text[], NOT NULL, default '{}' (nuts, dairy, shellfish, etc. — computed from components)

#### Notes

- `chef_notes` — text, nullable (chef-only execution notes)
- `client_notes` — text, nullable (visible to client, e.g., "Can be modified to exclude mushrooms")

#### Audit

- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes

- `idx_dishes_tenant_id` on (tenant_id)
- `idx_dishes_menu_id` on (menu_id)
- `idx_dishes_menu_course` on (menu_id, course_number)

### Constraints

- CHECK: course_number > 0
- UNIQUE: (menu_id, course_number) — no duplicate course numbers per menu

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `update_menu_course_count_on_dish_change` — after INSERT/UPDATE/DELETE, recompute menu.course_count

---

## TABLE 4: `components`

A component belongs to a dish. This is the building block (e.g., 'Diane Sauce', 'Roasted Smashed Potatoes'). Links to recipes in the Recipe Bible.

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `dish_id` — UUID, NOT NULL, FK to dishes.id ON DELETE CASCADE
- `recipe_id` — UUID, nullable, FK to recipes.id (links to Recipe Bible)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Component Details

- `name` — text, NOT NULL (e.g., "Diane Sauce", "Vanilla Ice Cream")
- `category` — component_category enum, NOT NULL
- `description` — text, nullable
- `sort_order` — integer, NOT NULL, default 0

#### Prep & Execution

- `is_make_ahead` — boolean, NOT NULL, default false (can be prepped early)
- `make_ahead_window_hours` — integer, nullable (how many hours ahead is safe)
- `storage_notes` — text, nullable (e.g., "Keep refrigerated", "Store in airtight container")
- `execution_notes` — text, nullable (e.g., "Reheat on low", "Finish on site")

#### Scaling

- `scale_factor` — decimal(5,2), default 1.0 (for template scaling by guest count)

#### Audit

- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes

- `idx_components_tenant_id` on (tenant_id)
- `idx_components_dish_id` on (dish_id)
- `idx_components_recipe_id` on (recipe_id)
- `idx_components_category` on (category)
- `idx_components_is_make_ahead` on (is_make_ahead)

### Constraints

- CHECK: scale_factor > 0

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `update_dish_component_count_on_component_change` — after INSERT/UPDATE/DELETE, recompute dish.component_count

---

## TABLE 5: `recipes`

The Recipe Bible. A recipe exists independently of any event. Can be linked to many components across many events. Builds over time from real dinners.

### Columns

#### Identity

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Recipe Details

- `name` — text, NOT NULL, UNIQUE per tenant (e.g., "Diane Sauce", "Roasted Smashed Potatoes")
- `category` — recipe_category enum, NOT NULL
- `description` — text, nullable (short description)

#### Method

- `method` — text, NOT NULL (concise — outcomes not instructions, chef knows how to cook)
- `method_detailed` — text, nullable (optional detailed instructions for complex recipes)

#### Yield

- `yield_description` — text, nullable (e.g., "Serves 4", "Sauce for 4 steaks", "2 cups")
- `yield_quantity` — decimal(8,2), nullable (numeric yield)
- `yield_unit` — text, nullable (e.g., "servings", "cups", "liters", "batch")

#### Time

- `prep_time_minutes` — integer, nullable
- `cook_time_minutes` — integer, nullable
- `total_time_minutes` — integer, nullable (computed or manually set)

#### Dietary

- `dietary_tags` — text[], NOT NULL, default '{}' (vegetarian, vegan, gluten-free, etc.)

#### Notes & Adaptations

- `notes` — text, nullable (chef notes, tips, tricks)
- `adaptations` — text, nullable (variations, substitutions, scaling notes)

#### Usage Tracking

- `times_cooked` — integer, NOT NULL, default 0 (incremented each time used in an event)
- `last_cooked_at` — timestamptz, nullable

#### Media

- `photo_url` — text, nullable (photo of finished dish)

#### Archival

- `archived` — boolean, NOT NULL, default false
- `archived_at` — timestamptz, nullable

#### Audit

- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes

- `idx_recipes_tenant_id` on (tenant_id)
- `idx_recipes_category` on (category)
- `idx_recipes_archived` on (archived)
- `idx_recipes_times_cooked` on (times_cooked DESC)
- `idx_recipes_tenant_name` on (tenant_id, name) UNIQUE

### Constraints

- CHECK: yield_quantity > 0 OR yield_quantity IS NULL
- CHECK: prep_time_minutes >= 0 OR prep_time_minutes IS NULL
- CHECK: cook_time_minutes >= 0 OR cook_time_minutes IS NULL
- CHECK: total_time_minutes >= 0 OR total_time_minutes IS NULL
- CHECK: times_cooked >= 0

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `compute_recipe_allergen_flags` — after INSERT/UPDATE, recompute allergen_flags from recipe_ingredients
- `increment_recipe_times_cooked` — trigger from events or after_action_reviews

---

## TABLE 6: `recipe_ingredients`

Junction table linking recipes to ingredients with quantities. Defines "what goes into this recipe."

### Columns

#### Identity & Relationships

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `recipe_id` — UUID, NOT NULL, FK to recipes.id ON DELETE CASCADE
- `ingredient_id` — UUID, NOT NULL, FK to ingredients.id ON DELETE RESTRICT
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Quantity

- `quantity` — decimal(10,3), NOT NULL (amount needed)
- `unit` — text, NOT NULL (e.g., "cup", "tbsp", "oz", "lb", "gram", "to taste")

#### Preparation

- `preparation_notes` — text, nullable (e.g., "diced", "minced", "room temperature", "thinly sliced")

#### Optional Ingredient

- `is_optional` — boolean, NOT NULL, default false (can be omitted)
- `substitution_notes` — text, nullable (e.g., "can use milk instead of cream")

#### Sort Order

- `sort_order` — integer, NOT NULL, default 0 (for ingredient list ordering)

### Indexes

- `idx_recipe_ingredients_recipe_id` on (recipe_id)
- `idx_recipe_ingredients_ingredient_id` on (ingredient_id)

### Constraints

- CHECK: quantity > 0
- UNIQUE: (recipe_id, ingredient_id) — no duplicate ingredients per recipe

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `recompute_recipe_allergen_flags_on_ingredient_change` — after INSERT/UPDATE/DELETE, trigger recipe allergen recompute

---

## TABLE 7: `ingredients`

Master ingredient list. Tracks price history (V1 simple approach: last_price_cents, last_price_date).

### Columns

#### Identity

- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Ingredient Details

- `name` — text, NOT NULL (e.g., "Heavy Cream", "Shallots", "Cognac")
- `category` — ingredient_category enum, NOT NULL
- `description` — text, nullable

#### Units

- `default_unit` — text, NOT NULL (default unit for purchasing, e.g., "lb", "bunch", "bottle")

#### Staples

- `is_staple` — boolean, NOT NULL, default false (chef always has this — don't put on grocery list)

#### Allergen & Dietary

- `allergen_flags` — text[], NOT NULL, default '{}' (nuts, dairy, shellfish, etc.)
- `dietary_tags` — text[], NOT NULL, default '{}' (vegan-friendly, gluten-free, etc.)

#### Pricing (V1 Simple Approach)

- `average_price_cents` — integer, nullable (rough average for budgeting)
- `price_unit` — text, nullable (unit for price, e.g., "per pound", "per gallon", "per bunch")
- `last_price_cents` — integer, nullable (most recent actual price paid)
- `last_price_date` — date, nullable (when last_price_cents was recorded)
- `last_purchased_at` — timestamptz, nullable

#### Vendor Preference

- `preferred_vendor` — text, nullable (e.g., "Market Basket", "One Stop Liquor")
- `vendor_notes` — text, nullable (e.g., "Usually in stock", "Check frozen section")

#### Archival

- `archived` — boolean, NOT NULL, default false
- `archived_at` — timestamptz, nullable

#### Audit

- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes

- `idx_ingredients_tenant_id` on (tenant_id)
- `idx_ingredients_category` on (category)
- `idx_ingredients_is_staple` on (is_staple)
- `idx_ingredients_archived` on (archived)
- `idx_ingredients_tenant_name` on (tenant_id, name)

### Constraints

- CHECK: average_price_cents >= 0 OR average_price_cents IS NULL
- CHECK: last_price_cents >= 0 OR last_price_cents IS NULL

### Triggers

- `update_updated_at_timestamp` — set updated_at = now() on UPDATE

---

## ENUMS

### `menu_status`

```
draft
shared
locked
archived
```

**Valid Transitions:**

- draft → shared (sent to client for review)
- draft → archived (discarded template)
- shared → locked (client approved)
- shared → draft (pulled back for edits)
- locked → archived (event completed, menu archived)
- archived → (terminal, no transitions)

### `component_category`

```
sauce
protein
starch
vegetable
fruit
dessert
garnish
bread
cheese
condiment
beverage
other
```

### `recipe_category`

```
sauce
protein
starch
vegetable
fruit
dessert
bread
pasta
soup
salad
appetizer
condiment
beverage
other
```

### `ingredient_category`

```
protein
produce
dairy
pantry
spice
oil
alcohol
baking
frozen
canned
fresh_herb
dry_herb
condiment
beverage
specialty
other
```

---

## FOREIGN KEY ADDITIONS TO LAYER 3

### `events` table

Add column (deferred from Layer 3):

- `menu_id` — UUID, nullable, FK to menus.id
  - Links event to its menu
  - Set when menu is attached to event

---

## TRIGGERS

### 1. `update_updated_at_timestamp`

**Tables:** menus, dishes, components, recipes, recipe_ingredients, ingredients
**Action:** BEFORE UPDATE, set NEW.updated_at = now()

### 2. `validate_menu_state_transition`

**Table:** menus
**Action:** BEFORE UPDATE on status column
**Logic:**

- Check if OLD.status → NEW.status is a valid transition (see menu_status enum transitions)
- Raise exception if invalid transition attempted
- Allow same-state (no-op)

### 3. `log_menu_state_transition`

**Table:** menus
**Action:** AFTER UPDATE on status column
**Logic:**

- Insert into menu_state_transitions (menu_id, tenant_id, from_status, to_status, transitioned_at, transitioned_by)

### 4. `prevent_menu_transition_mutation`

**Table:** menu_state_transitions
**Action:** BEFORE UPDATE or DELETE
**Logic:**

- Raise exception: "State transitions are immutable audit records."

### 5. `increment_recipe_times_cooked_on_event_completion`

**Table:** events (Layer 3)
**Action:** AFTER UPDATE on status column when status changes to 'completed'
**Logic:**

- Find all recipes used in the event via menu → dishes → components → recipes
- Increment recipe.times_cooked for each
- Update recipe.last_cooked_at = event.event_date
- Recipe was cooked whether or not the AAR gets filed

---

## RLS POLICIES

All tables follow the same tenant isolation pattern established in Layers 1-3 using `get_current_tenant_id()` and `get_current_user_role()` helper functions.

### General Pattern (applied to all Layer 4 tables)

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

1. **menus** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, records are never hard-deleted)
2. **menu_state_transitions** — tenant isolation via tenant_id, SELECT/INSERT only (no UPDATE/DELETE)
3. **dishes** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, cascade from menu)
4. **components** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, cascade from dish)
5. **recipes** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, soft-delete via archived flag)
6. **recipe_ingredients** — inherit from recipe, SELECT/INSERT/UPDATE only (no DELETE, cascade from recipe)
7. **ingredients** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, soft-delete via archived flag)

**IMPORTANT:** No DELETE policies exist for menus, dishes, components, recipes, recipe_ingredients, or ingredients. These records are never hard-deleted. Use soft-delete patterns (archived flags, cascade deletions only when parent is deleted).

### Client Portal Policies

**Policy Name:** `client_can_view_own_event_menu`
**Action:** SELECT on menus
**Using:**

```sql
get_current_user_role() = 'client'
AND event_id IN (
  SELECT id FROM events WHERE client_id IN (
    SELECT client_id FROM user_roles WHERE user_id = auth.uid()
  )
)
```

**Policy Name:** `client_can_view_menu_dishes`
**Action:** SELECT on dishes
**Using:**

```sql
get_current_user_role() = 'client'
AND menu_id IN (
  SELECT id FROM menus WHERE event_id IN (
    SELECT id FROM events WHERE client_id IN (
      SELECT client_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
)
```

**Policy Name:** `client_can_view_dish_components`
**Action:** SELECT on components
**Using:**

```sql
get_current_user_role() = 'client'
AND dish_id IN (
  SELECT id FROM dishes WHERE menu_id IN (
    SELECT id FROM menus WHERE event_id IN (
      SELECT id FROM events WHERE client_id IN (
        SELECT client_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  )
)
```

---

## VIEWS (for derived metrics)

### 1. `recipe_cost_summary`

Per-recipe cost calculation based on ingredient prices.

**Columns:**

- recipe_id
- tenant_id
- recipe_name
- total_ingredient_cost_cents (SUM of ingredient prices × quantities)
- cost_per_portion_cents (total_cost / yield_quantity)
- ingredient_count
- has_all_prices (boolean — do all ingredients have prices?)
- last_price_updated_at (most recent ingredient price date)

### 2. `menu_cost_summary`

Per-menu cost calculation based on components and recipes.

**Columns:**

- menu_id
- tenant_id
- event_id
- total_component_count (SUM of component_count across all dishes)
- total_recipe_cost_cents (SUM of recipe costs for all linked components)
- cost_per_guest_cents (total_recipe_cost / event.guest_count)
- food_cost_percentage (if event has quoted_price: cost / quoted_price)
- has_all_recipe_costs (boolean — do all components have costed recipes?)

### 3. `dish_component_summary`

Per-dish component count and details.

**Columns:**

- dish_id
- tenant_id
- menu_id
- course_number
- course_name
- component_count
- make_ahead_count (COUNT where is_make_ahead = true)
- components_with_recipes (COUNT where recipe_id IS NOT NULL)
- components_without_recipes (COUNT where recipe_id IS NULL)

### 4. `ingredient_usage_summary`

Per-ingredient usage tracking across all recipes.

**Columns:**

- ingredient_id
- tenant_id
- ingredient_name
- times_used (COUNT of recipe_ingredients)
- recipes_using (ARRAY of recipe names)
- last_used_in_recipe_at (most recent recipe.last_cooked_at)

---

## HELPER FUNCTIONS

### 1. `compute_recipe_cost_cents(recipe_id UUID)`

Returns total cost in cents for one batch of the recipe based on ingredient prices.

**Logic:**

```
SELECT COALESCE(SUM(
  (ri.quantity * (i.last_price_cents / price_unit_conversion_factor))
), 0)
FROM recipe_ingredients ri
JOIN ingredients i ON i.id = ri.ingredient_id
WHERE ri.recipe_id = $1
```

### 2. `compute_menu_cost_cents(menu_id UUID)`

Returns total cost in cents for the entire menu based on component recipes.

**Logic:**

```
SELECT COALESCE(SUM(
  compute_recipe_cost_cents(c.recipe_id)
), 0)
FROM components c
JOIN dishes d ON d.id = c.dish_id
WHERE d.menu_id = $1 AND c.recipe_id IS NOT NULL
```

### 3. `compute_projected_food_cost_cents(event_id UUID)`

Returns projected food cost for an event (menu_cost × guest_count).

**Logic:**

```
SELECT compute_menu_cost_cents(m.id) * e.guest_count
FROM events e
JOIN menus m ON m.event_id = e.id
WHERE e.id = $1
```

### 4. `get_recipe_allergen_flags(recipe_id UUID)`

Returns aggregated allergen flags from all ingredients in a recipe. Computed at query time, not stored.

**Logic:**

```
SELECT ARRAY_AGG(DISTINCT allergen)
FROM (
  SELECT UNNEST(i.allergen_flags) AS allergen
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = $1
) subquery
```

### 5. `get_dish_allergen_flags(dish_id UUID)`

Returns aggregated allergen flags from all components in a dish. Walks the hierarchy at query time.

**Logic:**

```
SELECT ARRAY_AGG(DISTINCT allergen)
FROM (
  SELECT UNNEST(get_recipe_allergen_flags(c.recipe_id)) AS allergen
  FROM components c
  WHERE c.dish_id = $1 AND c.recipe_id IS NOT NULL
) subquery
```

### 6. `get_menu_course_count(menu_id UUID)`

Returns course count for a menu (COUNT of dishes). Computed at query time, not stored.

**Logic:**

```
SELECT COUNT(*)
FROM dishes
WHERE menu_id = $1
```

### 7. `get_dish_component_count(dish_id UUID)`

Returns component count for a dish. Computed at query time, not stored.

**Logic:**

```
SELECT COUNT(*)
FROM components
WHERE dish_id = $1
```

### 8. `get_menu_total_component_count(menu_id UUID)`

Returns total component count across all dishes in a menu (for packing verification).

**Logic:**

```
SELECT COUNT(c.*)
FROM components c
JOIN dishes d ON d.id = c.dish_id
WHERE d.menu_id = $1
```

---

## DATA INTEGRITY RULES

### Immutability Enforcement

1. **menu_state_transitions** — NO UPDATE, NO DELETE (trigger enforced)
2. **recipes.allergen_flags** — auto-computed from ingredients (trigger maintained)

### State Machine Enforcement

1. **menus.status** — only valid transitions allowed (trigger enforced)

### Cascade Deletion Rules

1. **menus → dishes** — CASCADE (dishes deleted when menu deleted)
2. **dishes → components** — CASCADE (components deleted when dish deleted)
3. **recipes → recipe_ingredients** — CASCADE (ingredients removed when recipe deleted)
4. **ingredients** — RESTRICT from recipe_ingredients (cannot delete ingredient if used in recipes)

### Soft Delete Patterns

1. **recipes.archived** — soft-delete, never hard-delete
2. **ingredients.archived** — soft-delete, never hard-delete
3. **menus.status = 'archived'** — soft-delete for templates

### Computed Fields (maintained by triggers)

1. **menus.course_count** — COUNT of dishes
2. **dishes.component_count** — COUNT of components
3. **recipes.allergen_flags** — ARRAY_AGG from recipe_ingredients → ingredients
4. **recipes.times_cooked** — incremented from after_action_reviews

---

## MIGRATION DEPENDENCIES

Layer 4 depends on:

- Layer 1: chefs, user_roles, auth schema
- Layer 2: clients (for client portal policies via events)
- Layer 3: events, after_action_reviews

Layer 4 adds FK constraint back to Layer 3:

- events.menu_id → menus.id (ON DELETE SET NULL)

---

## VALIDATION AGAINST STATISTICS INVENTORY

This schema captures ALL raw data points from the statistics inventory for:

- ✅ Menu entity — all fields captured
- ✅ Dish entity — all fields captured
- ✅ Component entity — all fields captured
- ✅ Recipe entity (Recipe Bible) — all fields from Part 7 captured
- ✅ Ingredient entity — all fields captured
- ✅ Recipe costing — auto-computed from ingredients
- ✅ Menu costing — auto-computed from recipes
- ✅ Projected food cost — computed from menu × guest count

All derived calculations, costing metrics, and allergen propagation listed in Parts 7 and 8 can be computed from these raw data points.

---

## WHAT THIS ENABLES

With Layer 4 complete, ChefFlow can now:

### Menu Management

- Draft menus with multiple courses (dishes)
- Build dishes from components
- Link components to standardized recipes
- Track menu state (draft → shared → locked → archived)
- Create reusable menu templates

### Recipe Bible

- Record recipes from real events
- Standardize ingredient lists and quantities
- Track how many times each recipe has been cooked
- Capture method, yield, prep/cook time
- Tag allergens and dietary flags
- Photograph finished dishes

### Costing Engine

- Calculate recipe cost from ingredient prices
- Calculate menu cost from recipe costs
- Project food cost for events (menu × guest count)
- Track ingredient price history (simple V1 approach)
- Budget guardrail: "This dinner supports $X in groceries"
- Separate business vs personal ingredients (is_staple flag)

### Component Tracking

- Track make-ahead components
- Count components per dish and per menu
- Packing verification: "Course 3 has 5 components"
- Link components to recipes for costing

### Allergen Management

- Propagate allergen flags from ingredients → recipes → components → dishes
- Automatic allergen flagging (computed, not stored redundantly)
- Client safety: allergen flags visible at all levels

---

## NEXT STEPS (NOT in Layer 4)

**Layer 5: Planning & Production Documents**

- grocery_lists table
- grocery_list_items table
- prep_lists table
- prep_list_items table
- equipment_lists table
- packing_lists table
- timelines table
- execution_sheets table

**Layer 6: Loyalty & Referrals**

- loyalty_points_ledger table (append-only)
- loyalty_rewards table
- referrals table

---

## END OF PROPOSAL

This is the complete schema for Layer 4. Ready for review and SQL implementation once approved.

**Proposed Tables:** 7
**Proposed Enums:** 4
**Proposed Triggers:** ~8
**Proposed RLS Policies:** ~21 (chef isolation + client portal)
**Proposed Views:** 4
**Proposed Helper Functions:** 5

**Total Tables (Layers 1-4):** 23
**Total Enums (Layers 1-4):** 23
**Status:** PENDING APPROVAL
