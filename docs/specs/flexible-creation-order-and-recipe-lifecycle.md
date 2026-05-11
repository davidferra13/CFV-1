# Spec: Flexible Creation Order & Recipe Lifecycle

> **Status:** draft
> **Priority:** P0 (philosophy-level)
> **Depends on:** completion-contract (verified), notes-dishes-menus pipeline (built)
> **Estimated complexity:** large (multi-phase)

---

## Developer Notes

### Raw Signal (Verbatim from Developer)

The developer (a 10+ year private chef) described a fundamental workflow reality: **chefs do not work bottom-up.** The traditional software hierarchy of ingredient -> recipe -> menu -> event does not match how chefs actually operate. Some chefs start with recipes first, some start with menus first. The system must support any creation order without bottlenecks.

Key quotes and intent:

1. **"Someone like me might be making 20 selections so a client can pick four courses. None of them might have recipes."** Menus are often creative proposals; the recipes get figured out later (or during cooking).

2. **"A chef should be able to make up a menu on the spot and send it to a client, regardless if any of those recipes exist yet."** Client communication cannot be blocked by recipe completeness.

3. **"A menu shouldn't get finalized or completed if there's no recipes attached to it."** Eventual completeness is mandatory. The system tracks gaps and enforces completion before finalization, but does not block creation or sharing.

4. **"There should be no world where Remy or ChefFlow makes a recipe."** Recipes are chef IP. The system nudges, organizes, and tracks; it never generates recipe content. The only manual input a chef MUST do is sit down and write the recipe.

5. **"A lot of chefs are going to be making things for the first time."** Many recipes are aspirational; the dish has never been cooked before. The recipe is a plan, not a historical record. It gets refined after execution.

6. **"There needs to be subtle ways to where we are refining the recipe digitally."** Post-service, the system helps capture what actually happened vs. what was planned. Progressive, not intrusive.

7. **"Every recipe gets archived. Every recipe can become forked and new versions of itself."** Recipes are living documents with lineage. When a chef evolves a dish, the original is preserved and a new version branches off.

### Developer Intent

- **Core goal:** Any-order creation (menu-first, recipe-first, event-first) with eventual completeness enforcement and zero bottlenecks for client communication.
- **Key constraints:** ChefFlow/Remy NEVER creates recipe content. Recipes are the one thing only the chef can produce. System nudges but never blocks operational workflows.
- **Motivation:** Real private chef workflow. You get a call, you need to respond with a menu in 20 minutes, you're inventing half the dishes on the spot. The system must match that speed.
- **Success from the developer's perspective:** A chef creates a 5-course menu in 3 minutes with zero recipes, sends it to a client, and the system quietly starts tracking "5 recipes needed" with gentle nudges over the following days. After the dinner, the system helps the chef refine each dish into a proper recipe. Those recipes get archived and can be forked for future variations.

---

## What This Does (Plain English)

This spec defines three interconnected systems:

1. **Flexible Creation Order** -- Removes all hierarchy enforcement from entity creation. A chef can create a menu without recipes, create recipes without menus, assign menus to events without recipes being complete, and send menus to clients at any stage. The completion contract tracks gaps without blocking operations.

2. **Recipe Gap Tracking & Nudging** -- When menu items exist without linked recipes, the system tracks these gaps and nudges the chef to fill them. Nudges are contextual (before an event, after a service, during downtime) and never intrusive. The chef is the only one who can create recipe content.

3. **Recipe Versioning & Lifecycle** -- Every recipe has a lifecycle: draft -> active -> archived. Recipes can be forked into new versions, preserving the original. Version lineage is tracked. After a dinner, the system facilitates progressive refinement of recipes based on what actually happened.

---

## Why It Matters

Private chefs are creative professionals working under time pressure. The current bottom-up assumption (recipe must exist before menu can function) creates a bottleneck that doesn't match reality. Chefs invent dishes on the fly, propose menus before recipes are written, and refine recipes over multiple iterations. If ChefFlow forces them to write recipes before they can send a menu, they'll use a Google Doc instead.

The recipe lifecycle (versioning, forking, archiving) matters because chef recipes evolve. A "Pan-Seared Salmon" dish today is different from the one made 6 months ago. Without versioning, chefs either overwrite history (losing the old version) or create confusing duplicates. Forking gives clean lineage.

---

## System 1: Flexible Creation Order

### Current State (Already Supported)

The schema already supports this. `menu_items.recipeId` is nullable. `dish_index.linkedRecipeId` is nullable. The completion contract marks "All components have recipes" as **non-blocking** (weight 15/100). Menus CAN exist without recipes today.

### What Needs to Change

The current system is passively permissive (recipe links are optional) but not actively supportive (no tracking, no nudging, no workflow for filling gaps). The changes are:

#### 1.1 Recipe Gap Awareness in Menu UI

When viewing a menu, each dish/component should show its recipe linkage status:

| State        | Visual                              | Meaning                                              |
| ------------ | ----------------------------------- | ---------------------------------------------------- |
| **Linked**   | Recipe name (clickable)             | Component has a recipe attached                      |
| **Unlinked** | "No recipe yet" + quick-link button | Component exists but has no recipe                   |
| **New**      | "New dish" badge                    | Dish was just created, recipe doesn't exist anywhere |

The menu detail page should show a summary bar: "12 components, 8 with recipes, 4 need recipes"

#### 1.2 Quick Recipe Creation from Menu Context

From a menu's dish/component view, the chef can:

- **Link existing recipe** -- search and attach an existing recipe
- **Create new recipe (stub)** -- creates a recipe with just a name (from the dish name), links it immediately, and marks it as a stub that needs to be filled in later
- **Mark as "will create later"** -- explicitly acknowledges the gap without creating a stub

#### 1.3 No Blocking Gates on Menu Sharing

The menu state machine (`draft -> shared -> locked -> archived`) must NEVER require recipe completeness for any transition EXCEPT:

- `shared -> locked`: Should WARN if recipes are missing ("4 dishes have no recipes. Lock anyway?") but not block
- Finalization/completion score: Recipes affect the completion score but never prevent menu operations

#### 1.4 Event Assignment Without Recipe Completeness

Events can have menus assigned regardless of recipe status. The event completion contract already handles this (recipe completeness flows into menu completeness, which flows into event completeness, all non-blocking). No changes needed to event-menu assignment logic.

---

## System 2: Recipe Gap Tracking & Nudging

### 2.1 Recipe Gap Registry

A lightweight system that identifies all menu items across all active events that lack recipes. Not a new table; a query/view.

```sql
-- Recipe gaps: menu items in active events without recipes
CREATE OR REPLACE VIEW recipe_gaps AS
SELECT
  d.id AS dish_id,
  d.name AS dish_name,
  d.menu_id,
  m.name AS menu_name,
  e.id AS event_id,
  e.title AS event_title,
  e.event_date,
  c.id AS component_id,
  c.name AS component_name,
  m.tenant_id
FROM dishes d
JOIN menus m ON m.id = d.menu_id
JOIN components c ON c.dish_id = d.id
LEFT JOIN events e ON e.menu_id = d.menu_id
WHERE c.recipe_id IS NULL
  AND m.status != 'archived'
ORDER BY e.event_date ASC NULLS LAST;
```

### 2.2 Nudge Triggers (Contextual, Never Intrusive)

Nudges surface in existing UI surfaces. No pop-ups, no modals, no emails about recipe gaps. Placement:

| Surface            | Nudge Type                                                      | When                                             |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------ |
| **Dashboard**      | "X recipes needed for upcoming events" card                     | When active event menus have unlinked components |
| **Event Detail**   | Completion card shows recipe gaps                               | Always (already exists via completion contract)  |
| **Menu Detail**    | Component-level "No recipe yet" indicators                      | Always (System 1.1 above)                        |
| **Post-Event**     | "You served 4 new dishes. Want to document the recipes?" prompt | After event status transitions to completed      |
| **Culinary Board** | Unlinked dishes appear in "Needs Recipe" column                 | When viewing the kanban                          |
| **Remy**           | Can mention "You have X dishes without recipes for [event]"     | During natural conversation, not as a nag        |

### 2.3 The Chef-Only Rule (Absolute)

ChefFlow and Remy NEVER generate recipe content. This means:

- No AI-generated instructions, ingredients, or methods
- No "suggested recipes" based on dish names
- No auto-fill of recipe fields
- Remy CAN say "You have 3 dishes without recipes for Saturday's dinner" but CANNOT say "Here's a suggested recipe for Pan-Seared Salmon"
- The only input path for recipe content is the chef typing/dictating it manually

What IS allowed:

- Auto-populating a recipe NAME from a dish name when creating a stub
- Linking to an EXISTING recipe the chef already created
- Suggesting the chef's OWN past recipes as potential links ("You've made 'Salmon' before, want to link that recipe?")
- Organizing, categorizing, and formatting what the chef provides
- Nutritional calculations from ingredients the chef entered

---

## System 3: Recipe Versioning & Lifecycle

### 3.1 Recipe Status Lifecycle

Add a `status` field to recipes (if not already present):

| Status       | Meaning                                            | Transitions            |
| ------------ | -------------------------------------------------- | ---------------------- |
| **stub**     | Name only. Created from menu context. Placeholder. | -> draft               |
| **draft**    | Work in progress. Chef is building it.             | -> active, -> archived |
| **active**   | Complete, proven recipe. Ready for use.            | -> archived            |
| **archived** | Preserved but not actively used.                   | -> active (restore)    |

A recipe's status is independent of its completion score. A recipe can be "active" with a 60% completion score (missing timing, dietary tags, etc.) because the chef considers it usable even if metadata is incomplete.

### 3.2 Recipe Forking

Any recipe can be forked. Forking creates a new recipe with:

- All fields copied from the original
- A `forked_from_id` reference to the parent
- A `version_note` field explaining what changed
- An auto-incremented version label (e.g., "Pan-Seared Salmon v2")
- Status set to `draft`

The original recipe is unchanged. Fork lineage is visible on both the parent ("2 versions exist") and the child ("Forked from Pan-Seared Salmon").

**Use cases:**

- Chef evolves a dish over time ("I changed the sauce")
- Seasonal variation ("Summer version with peaches")
- Client-specific adaptation ("Dairy-free version for the Johnsons")
- Experimentation ("Let me try this with miso glaze")

### 3.3 Schema Changes

```sql
-- Add to recipes table
ALTER TABLE recipes ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('stub', 'draft', 'active', 'archived'));
ALTER TABLE recipes ADD COLUMN forked_from_id UUID REFERENCES recipes(id);
ALTER TABLE recipes ADD COLUMN version_note TEXT;
ALTER TABLE recipes ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE recipes ADD COLUMN archived_at TIMESTAMPTZ;

-- Index for lineage queries
CREATE INDEX idx_recipes_forked_from ON recipes(forked_from_id)
  WHERE forked_from_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX idx_recipes_status ON recipes(tenant_id, status);
```

### 3.4 Progressive Refinement (Post-Service)

After an event is completed, the system facilitates recipe capture/refinement:

1. **Post-Event Recipe Prompt** -- When an event transitions to `completed`, if the menu had dishes without recipes (or with stub recipes), the system surfaces a "Document your recipes" prompt. Not a blocker; a contextual nudge.

2. **Refinement Mode** -- When a chef opens a recipe that was just served, the system shows the original recipe side-by-side with a "What actually happened?" input. The chef can note adjustments ("Used less salt," "Subbed honey for maple syrup," "Cooked 5 minutes longer"). These notes either update the recipe in place or auto-fork a new version.

3. **Service History on Recipe** -- Each recipe shows when it was served, for which event, and what notes were captured. This builds the recipe's provenance over time. (The `served_dish_history` table already exists for this.)

4. **Cooking Mode Capture** -- During active cooking (if using ChefFlow in the kitchen), a lightweight "quick note" feature lets the chef capture adjustments in real-time. These notes attach to the recipe's next refinement cycle.

---

## Completion Contract Integration

### How This Affects Existing Completion Scores

The completion contract already handles recipe gaps correctly:

- **Menu completion:** "All components have recipes" is non-blocking, weight 15. No change needed.
- **Recipe completion:** Evaluates method, yield, ingredients, pricing, timing. No change needed.
- **Event completion:** Flows through menu completion recursively. No change needed.

### New Completion Dimension: Recipe Status

Add to recipe evaluator:

```typescript
{
  key: 'not_stub',
  label: 'Recipe is not a stub',
  met: recipe.status !== 'stub',
  blocking: false,
  weight: 5, // Light weight -- stubs are expected temporarily
  category: 'culinary',
  actionUrl: editUrl,
  actionLabel: 'Fill in recipe details',
}
```

### Menu Finalization Guard

When a menu transitions to `locked`, if any components lack recipes:

- Show a warning: "4 components have no recipes. This won't affect the menu lock, but these gaps will show on the completion score."
- Log the gap acknowledgment in menu_state_transitions metadata
- Do NOT block the transition

---

## What This Does NOT Do

1. **Does not generate recipes** -- ChefFlow/Remy never creates recipe content. Period.
2. **Does not block menu sharing** -- A menu with zero recipes can be shared with a client.
3. **Does not block event execution** -- An event can proceed with incomplete menus/recipes.
4. **Does not require recipes before anything** -- Creation order is fully flexible.
5. **Does not delete old recipe versions** -- Forking preserves originals. Archiving is soft-delete.
6. **Does not auto-fork** -- Forking is always an explicit chef action.
7. **Does not nag** -- Nudges are contextual and passive, never modal or email-based.

---

## Phased Build Plan

### Phase 1: Recipe Status & Stubs (Foundation)

**Goal:** Recipes have a lifecycle status. Stubs can be created from menu context.

- Migration: add `status`, `forked_from_id`, `version_note`, `version_number`, `archived_at` to recipes
- Update recipe CRUD actions to support status transitions
- Add "Create stub recipe" action from menu/dish context
- Update recipe list UI to show status badges
- Update completion evaluator with `not_stub` requirement

### Phase 2: Recipe Gap Tracking (Awareness)

**Goal:** The system knows where recipe gaps exist and surfaces them.

- Create `recipe_gaps` view
- Add recipe gap summary to dashboard
- Add per-component recipe status indicators in menu detail UI
- Add "Link existing recipe" quick action from menu context
- Add post-event recipe prompt (event completion trigger)

### Phase 3: Recipe Forking & Versioning (Evolution)

**Goal:** Recipes can be forked, versioned, and their lineage tracked.

- Implement fork action (deep copy + lineage link)
- Add version lineage UI on recipe detail (parent/children)
- Add "Fork this recipe" button on recipe detail
- Add version history timeline
- Add fork-on-refinement flow (post-service "What changed?" -> auto-fork option)

### Phase 4: Progressive Refinement (Polish)

**Goal:** Post-service recipe capture and refinement are smooth and contextual.

- Refinement mode UI (original vs. actual side-by-side)
- Quick-note capture during cooking
- Service history integration on recipe detail
- Culinary Board "Needs Recipe" column integration

---

## Files to Create

| File                                            | Purpose                                               |
| ----------------------------------------------- | ----------------------------------------------------- |
| `database/migrations/XXXX_recipe_lifecycle.sql` | Add status, forked_from_id, version fields to recipes |
| `database/migrations/XXXX_recipe_gaps_view.sql` | Create recipe_gaps view                               |
| `lib/recipes/lifecycle-actions.ts`              | Status transitions, forking, archiving                |
| `lib/recipes/gap-tracking.ts`                   | Query recipe gaps per tenant, per event               |
| `components/recipes/recipe-status-badge.tsx`    | Visual status indicator                               |
| `components/recipes/recipe-lineage.tsx`         | Fork tree / version history                           |
| `components/menus/recipe-gap-indicator.tsx`     | Per-component recipe status in menu view              |

## Files to Modify

| File                                               | What to Change                               |
| -------------------------------------------------- | -------------------------------------------- |
| `lib/completion/evaluators/recipe.ts`              | Add `not_stub` requirement                   |
| `lib/completion/evaluators/menu.ts`                | No changes needed (already non-blocking)     |
| `lib/menus/actions.ts`                             | Add "create stub recipe and link" action     |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Add fork button, lineage display, status     |
| `app/(chef)/menus/[id]/*`                          | Add recipe gap indicators per dish/component |
| `app/(chef)/dashboard/page.tsx`                    | Add recipe gap summary card                  |

---

## Open Questions

1. **Should stub recipes appear in the main recipe list?** Or should they be filtered by default (visible via toggle)?
2. **Fork depth limit?** Can you fork a fork of a fork? Recommend: unlimited depth, but UI only shows direct parent/children (expandable).
3. **Recipe sharing across forked versions:** If Recipe A is linked to a menu and you fork it to Recipe B, should the menu automatically update to point to B? Recommend: no, explicit re-linking.
4. **Archived recipe linked to active menu:** If a recipe is archived but still linked to an active menu, what happens? Recommend: show warning but don't auto-unlink.
5. **Post-event refinement timing:** How long after an event should the "document recipes" prompt persist? Recommend: 7 days, then it moves to a passive "undocumented dishes" list.

---

## Glossary (CONTEXT.md Additions)

- **Stub Recipe:** A recipe with only a name, created as a placeholder from menu context. Must be filled in by the chef before the recipe is considered complete.
- **Recipe Fork:** A new recipe created by copying all fields from an existing recipe, with a lineage link to the original. Used when evolving or adapting a dish.
- **Recipe Gap:** A menu component (dish element) that has no linked recipe. Tracked by the system and surfaced as a nudge.
- **Progressive Refinement:** The post-service workflow where a chef updates a recipe based on what actually happened during cooking, vs. what was originally planned.
- **Flexible Creation Order:** The principle that menus, recipes, events, and dishes can be created in any order. No entity requires another entity to exist first.
