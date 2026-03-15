# Menu Management System Upgrade: Comprehensive Design

> Research-informed design for elevating ChefFlow's menu system from manual-with-tools to intelligent automation.

## Current State Assessment

ChefFlow already has a strong foundation:

- **5-layer hierarchy:** Menu > Dish > Component > Recipe > Ingredient
- **State machine:** draft > shared > locked > archived (with immutable audit trail)
- **Costing engine:** ingredient-level pricing > recipe cost > menu cost > cost/guest > food cost %
- **Approval workflow:** multi-round chef-client revision cycles with frozen snapshots
- **AI assistance:** menu parsing, recipe scaling, menu suggestions (all local Ollama)
- **Document generation:** front-of-house PDF, menu sheets, prep sheets
- **Remy integration:** NL menu creation, editing, approval via agent actions
- **Menu engineering:** popularity vs. profitability matrix (Stars/Plow Horses/Puzzles/Dogs)
- **Price tracking:** ingredient price history, vendor comparison, 30% spike alerts

The gaps are in **automation between these systems** and **intelligent initiation of workflows** that currently require manual triggers.

---

## Industry Best Practices Research

### What Leading Platforms Do

**1. Toast / Square for Restaurants (POS-integrated menu management)**

- Menu items auto-link to inventory; selling a dish decrements ingredient stock in real time
- Price changes propagate instantly across all menus containing that item
- Modifier groups (add bacon +$3, substitute GF pasta +$2) are reusable across items
- Menu scheduling: brunch menu auto-activates Saturday 9am, switches to dinner at 5pm

**2. MarketMan / BlueCart (Inventory + Recipe Costing)**

- Recipe costing updates automatically when ingredient prices change (no manual recalc)
- "Theoretical vs. actual" food cost comparison per service period
- Par level alerts: "You need 4 lbs salmon for tomorrow's 3 events, you have 1.5 lbs on hand"
- Vendor price comparison across suppliers with auto-reorder suggestions

**3. Meez (Recipe Management for Professional Chefs)**

- Recipe scaling is automatic and culinary-aware (salt at 60-75%, leavening at 75%)
- Recipes have "prep recipes" (sub-recipes) that cascade scaling
- Every recipe has a cost card that updates live as ingredient prices change
- Photo-per-step instructions with video integration
- Nutrition calculated automatically from USDA database
- Shareable recipe links for staff training

**4. Galley Solutions (Multi-Unit Food Service)**

- Menu planning calendar with drag-drop recipe assignment
- Automatic purchase order generation from planned menus
- Cross-menu ingredient consolidation (3 events on Saturday all need onions = one order)
- Waste tracking tied back to menu items (which dishes generate the most waste?)
- Cycle menu templates that rotate weekly/monthly

**5. ChefTec (Legacy but Feature-Rich)**

- Batch recipe scaling with equipment capacity awareness
- Menu pre-costing vs. post-costing comparison
- Nutritional analysis per dish and per menu
- Banquet event order (BEO) generation from menu selections

**6. Caterease / Total Party Planner (Catering-Specific)**

- Event-driven menu assembly: select event type > auto-suggest appropriate menu style
- Per-head pricing with automatic tier adjustments (50 guests vs. 200 guests)
- Equipment needs auto-generated from menu (chafing dishes for buffet, plate count for plated)
- Staffing ratios suggested based on service style and guest count
- Timeline auto-generation: prep start, cooking start, plating, service windows

### Key Patterns Worth Adopting

| Pattern                       | Industry Source    | ChefFlow Gap                                                              |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------- |
| **Live cost cards**           | Meez, MarketMan    | Cost updates require page refresh; no push notifications on price changes |
| **Auto-purchase lists**       | Galley, MarketMan  | Grocery list exists but isn't auto-generated from confirmed menus         |
| **Equipment inference**       | Caterease, ChefTec | Components have transport_category but no equipment requirements          |
| **Staffing suggestions**      | Caterease          | No staffing calc from menu complexity                                     |
| **Cross-event consolidation** | Galley             | Grocery consolidation exists (UX5 research) but not auto-triggered        |
| **Menu calendar**             | Galley, Toast      | No calendar view of upcoming menus                                        |
| **Cycle templates**           | Galley             | Templates exist but no rotation/cycle scheduling                          |
| **Waste tracking feedback**   | Galley             | Modification tracking exists but doesn't feed back into menu optimization |

---

## Upgrade Design: Intelligent Menu Automation

### Principle: Formula > AI (per project rules)

Every automation below uses deterministic logic unless the task inherently requires language understanding. AI is the fallback, never the default.

---

### 1. Intelligent Menu Initiation

**Current:** Chef manually creates a menu, manually links it to an event, manually adds dishes one by one.

**Upgraded:** When an event is created (or moves to a stage requiring a menu), the system proactively initiates menu creation with context already populated.

#### Trigger Points

| Event State                               | System Action                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Event created with occasion + guest count | Auto-create draft menu skeleton linked to event, pre-populated with service_style inferred from occasion type |
| Client dietary restrictions on file       | Auto-surface allergen/dietary warnings on the menu editor sidebar                                             |
| Chef has past menus for same client       | Surface "Previously served" panel with collision detection                                                    |
| Chef has showcase menus matching occasion | Surface "Your templates for [occasion]" picker                                                                |

#### Auto-Tagging on Creation

When a menu is initiated (manually or auto):

1. **Event context tags** (deterministic):
   - `occasion_type` from event
   - `season` derived from event date (spring/summer/fall/winter based on month)
   - `service_style` from event or inferred from occasion (wedding reception = buffet/cocktail, intimate dinner = plated)
   - `guest_tier` computed from guest count (intimate: 2-8, small: 9-20, medium: 21-50, large: 51-100, banquet: 101+)

2. **Client context tags** (from client record):
   - All `dietary_restrictions` from client profile
   - All `allergies` from client profile
   - `cuisine_preferences` if recorded
   - `budget_tier` derived from quote history (economy/standard/premium/luxury)

3. **Chef context tags** (from chef profile + history):
   - `cuisine_specialties` from chef profile
   - `signature_dishes` (recipes with highest `times_cooked`)
   - `seasonal_ingredients` currently in season (deterministic month-based lookup)

These tags appear as a **context sidebar** in the menu editor, not as hard constraints. The chef always has final say.

#### Implementation

```
New server action: initializeMenuForEvent(eventId)
  1. Read event (occasion, date, guest_count, service_style, client)
  2. Read client (dietary_restrictions, allergies, preferences)
  3. Create draft menu with:
     - name: "[Occasion] Menu - [Client Last Name]"
     - target_guest_count: event.guest_count
     - service_style: event.service_style or inferred
     - metadata JSONB: { season, guest_tier, client_dietary, client_allergies }
  4. Link menu to event
  5. Return menu with context sidebar data

New component: MenuContextSidebar
  - Shows: client dietary/allergies, past menus for client, matching templates
  - Persistent during editing (sticky right column)
  - Collapsible sections
```

---

### 2. Seamless Menu Assembly from Existing Dishes

**Current:** Chef can duplicate a template menu or manually add dishes. No mix-and-match from multiple sources.

**Upgraded:** Chef can assemble a menu by pulling dishes from any source (templates, past menus, recipe bible) with drag-and-drop or search.

#### Assembly Sources

1. **Template library** (is_template = true menus)
2. **Past event menus** (searchable by client, occasion, season, cuisine)
3. **Recipe Bible** (individual recipes, auto-wrapped as components)
4. **Dish Index** (from menu upload pipeline, if populated)
5. **Remy** (NL: "Add the scallop appetizer from the Johnson dinner last month")

#### Assembly Workflow

```
Step 1: Chef opens menu editor for new/draft menu
Step 2: Left panel = current menu (courses, dishes, components)
Step 3: Right panel = assembly source browser
  - Tab 1: "My Templates" - browse template menus, click dish to add
  - Tab 2: "Past Menus" - search by client/occasion/date, click dish to add
  - Tab 3: "Recipe Bible" - search recipes, click to add as new component
  - Tab 4: "Quick Add" - type dish name + course, creates empty dish

Adding a dish from another menu:
  1. Deep copies: dish + all components + recipe links (not recipes themselves)
  2. Preserves: course_name, description, dietary_tags, chef_notes
  3. Resets: sort_order (appends to end of target course)
  4. Auto-adjusts: scale_factor if target guest count differs from source
     scale_factor = target_guest_count / source_guest_count * original_scale_factor
```

#### Implementation

```
New server action: addDishFromSource(targetMenuId, sourceDishId, targetCourseNumber)
  1. Deep copy dish + components
  2. Recalculate scale_factor for guest count difference
  3. Insert into target menu at specified course position
  4. Return updated menu

New server action: addRecipeAsComponent(targetMenuId, targetDishId, recipeId)
  1. Create component linked to recipe
  2. Set default scale_factor based on recipe yield vs menu guest count
  3. Return updated dish

New component: MenuAssemblyBrowser
  - Tabbed source browser (templates, past menus, recipes)
  - Search + filter (occasion, cuisine, season, dietary compatibility)
  - Click-to-add with course position selector
  - Drag-and-drop between courses (reorder)
```

---

### 3. Automated Dynamic Pricing

**Current:** Recipe costs computed from ingredient prices. Menu cost summed from recipe costs. Food cost % shown as a view. But pricing doesn't auto-update or alert.

**Upgraded:** Prices flow automatically. Changes propagate instantly. Alerts fire when margins shift.

#### Price Propagation Chain

```
Ingredient price updated (manual entry or future vendor API)
  ↓ triggers
Recipe cost recalculated (deterministic: SUM of ingredient quantities * prices)
  ↓ triggers
Component cost updated (recipe cost * scale_factor)
  ↓ triggers
Dish cost updated (SUM of component costs)
  ↓ triggers
Menu cost updated (SUM of dish costs)
  ↓ triggers
Cost per guest recalculated (menu cost / guest count)
  ↓ triggers
Food cost % recalculated (menu cost / quoted price * 100)
  ↓ triggers (if threshold crossed)
Alert: "Food cost for [Menu] is now [X]%, above your [Y]% target"
```

#### What Makes This Non-Negotiable

Today a chef enters an ingredient price, but every downstream number requires navigating to the costing page and refreshing. With 50+ ingredients across 5 upcoming events, price changes are invisible until the chef actively checks. This is exactly the "duct-taped stack" problem: the data exists but isn't connected.

#### Margin Alerts (Deterministic)

| Condition                        | Alert                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| Food cost % > 35%                | Warning: "High food cost on [Menu] - [X]% (target: 25-30%)"         |
| Food cost % > 45%                | Critical: "Food cost on [Menu] is [X]% - you may be losing money"   |
| Ingredient price increased > 30% | "Price alert: [Ingredient] up [X]% since last purchase"             |
| Missing prices on confirmed menu | "Cannot calculate cost for [Menu] - [N] ingredients missing prices" |

#### Implementation

```
Database: Create materialized view or use existing views with revalidation
  - recipe_cost_summary already exists (view)
  - menu_cost_summary already exists (view)
  - These are live views (not materialized), so they auto-update
  - No database changes needed for propagation

New server action: checkMenuMargins(menuId)
  1. Query menu_cost_summary
  2. Compare food_cost_percentage against thresholds
  3. Return { alerts: MarginAlert[], costBreakdown: CostBreakdown }

New server action: getIngredientPriceAlerts(tenantId)
  1. Query ingredients where last_price_cents > average_price_cents * 1.3
  2. Return price spike alerts

UI integration:
  - Menu editor sidebar: live cost/guest and food cost % display
  - Event detail: food cost % badge (green/yellow/red)
  - Dashboard widget: "Margin alerts" for upcoming events
  - Ingredient list: price spike indicators
```

---

### 4. Guest Count Scaling Automation

**Current:** Chef manually sets `scale_factor` on each component. AI recipe scaling available but requires manual trigger per recipe.

**Upgraded:** Changing the guest count on a menu (or event) auto-recalculates all scale factors and surfaces technique/equipment changes.

#### Auto-Scale Flow

```
Chef changes guest count (menu.target_guest_count or event.guest_count)
  ↓
System recalculates every component's scale_factor:
  new_scale = (new_guest_count / recipe.yield_quantity) * component.portion_quantity
  (or simple ratio if yield not set: new_guest_count / old_guest_count * old_scale)
  ↓
For each scaled recipe, deterministic checks:
  - If new_scale > 3x original: flag "Consider batch splitting"
  - If new_scale < 0.5x original: flag "Small batch - adjust seasoning"
  - Salt/spice ingredients: scale at 70% of linear (culinary rule)
  - Leavening agents: scale at 75% of linear
  ↓
Updated costs auto-propagate (see Section 3)
  ↓
System generates scaling summary:
  - "Scaled 12 components across 4 courses"
  - "3 technique adjustments suggested" (only if AI scaling was previously run)
  - "New estimated food cost: $X.XX/guest (was $Y.YY/guest)"
```

#### Granular Breakdown Generation

When a menu is scaled (or created), auto-generate a structured breakdown:

```
Menu: Spring Tasting Menu (8 guests)
├── Course 1: Amuse-Bouche
│   └── Dish: Compressed Watermelon
│       ├── Component: Watermelon (Recipe: Compressed Watermelon, scale: 1.0x)
│       │   ├── Ingredient: Watermelon, seedless - 2 lbs ($3.98)
│       │   ├── Ingredient: Lime juice - 2 tbsp ($0.40)
│       │   └── Ingredient: Mint - 8 leaves ($0.25)
│       └── Component: Feta Mousse (Recipe: Whipped Feta, scale: 0.5x)
│           ├── Ingredient: Feta cheese - 4 oz ($2.50)
│           └── Ingredient: Heavy cream - 2 oz ($0.30)
├── Course 2: Appetizer
│   └── Dish: Pan-Seared Scallops
│       └── ...
└── TOTAL: $45.43 food cost | $5.68/guest | 22.7% food cost (quoted $25/head)
```

This breakdown is:

- **Auto-generated** from existing data (menu > dishes > components > recipes > ingredients)
- **Always current** (reads live from database views)
- **Exportable** as PDF (prep sheet format) or structured data (JSON for Remy)

#### Implementation

```
New server action: scaleMenuToGuestCount(menuId, newGuestCount)
  1. Read all components with their recipes and current scale_factors
  2. For each component:
     a. If recipe has yield_quantity: new_scale = newGuestCount / yield_quantity
     b. If no yield: new_scale = newGuestCount / menu.target_guest_count * current_scale
     c. Apply culinary scaling rules (salt at 70%, leavening at 75%)
  3. Batch update all component scale_factors
  4. Update menu.target_guest_count
  5. Return scaling summary with cost impact

New server action: getMenuBreakdown(menuId)
  1. Query full hierarchy: menu > dishes > components > recipes > ingredients
  2. Apply scale_factors to ingredient quantities
  3. Compute costs at every level
  4. Return structured breakdown tree

New component: MenuBreakdownView
  - Collapsible tree: Course > Dish > Component > Recipe > Ingredient
  - Each level shows: name, quantity (scaled), cost
  - Summary row: total cost, cost/guest, food cost %
  - Export buttons: PDF, Copy to clipboard
```

---

### 5. Comprehensive Automated Tracking

**Current:** Tracking is fragmented. Recipe usage counts exist. Ingredient price history exists. Menu state transitions are logged. But no unified view.

**Upgraded:** Every element in the hierarchy is tracked with full lifecycle visibility.

#### What Gets Tracked (Automatically)

| Element        | Tracked Metrics                                                                            | Source                                                                 |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Ingredient** | Price history, usage frequency, vendor distribution, seasonal availability                 | ingredient_price_history, recipe_ingredients, ingredient_usage_summary |
| **Recipe**     | Times cooked, last cooked, cost trend, scaling history, which menus use it                 | recipes.times_cooked, recipe_cost_summary                              |
| **Component**  | Scale factor history, make-ahead frequency, prep station distribution                      | components (new: track changes)                                        |
| **Dish**       | Appearance count, popularity score, client feedback correlation, course position frequency | dish_appearances (from upload pipeline), menu_modifications            |
| **Menu**       | Revision count, approval time, food cost trend, reuse count                                | menu_state_transitions, menu_approval_requests, menus.times_used       |

#### New: Menu Lifecycle Dashboard

A single page showing the full lifecycle of a menu from creation to post-service:

```
/culinary/menus/[id]/lifecycle

Timeline:
  Created (draft)     → Mar 1, 2:30pm
  First dish added    → Mar 1, 2:45pm
  Shared with client  → Mar 3, 10:00am
  Revision requested  → Mar 3, 6:15pm (note: "Can we swap the fish course?")
  Revision sent       → Mar 4, 9:00am
  Approved            → Mar 4, 11:30am
  Locked              → Mar 5, 8:00am
  Event served        → Mar 8
  Modifications logged → 1 substitution (halibut → cod, market price)
  Archived            → Mar 9

Metrics:
  Total prep time: 14 hrs (across 3 prep days)
  Food cost: $342.50 (28.5% of $1,200 quote)
  Guest satisfaction: (from post-event feedback if collected)
  Reused: 0 times (or "Template created from this menu")
```

---

### 6. Autonomous Document Generation

**Current:** Front-of-house menu PDF exists. Prep sheets exist. But generation is manual.

**Upgraded:** Documents auto-generate at the right moment in the workflow.

#### Auto-Generation Triggers

| Trigger                            | Document Generated                                                              | Delivery                                       |
| ---------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Menu status → shared               | Client-facing menu PDF                                                          | Attached to approval email                     |
| Menu status → locked               | Final menu PDF + prep sheet draft                                               | Saved to event documents                       |
| Event → confirmed                  | Complete document pack: FOH menu, prep sheet, grocery list, equipment checklist | Dashboard notification + document panel        |
| Event → in_progress                | Service execution sheet (BOH)                                                   | Available on mobile                            |
| Event → completed                  | Post-service summary (what was served vs. planned, modifications)               | Auto-generated for records                     |
| Guest count changed on locked menu | Updated prep sheet + grocery list                                               | Alert: "Documents updated for new guest count" |

#### Document Pack Contents

When an event is confirmed, auto-generate the complete operational pack:

1. **Front-of-House Menu** (existing) - client-facing, elegant layout
2. **Prep Sheet** - day-by-day prep schedule derived from component prep_day_offset, prep_time_of_day, prep_station
3. **Grocery List** - consolidated ingredients across all components, quantities scaled, grouped by store section (produce/protein/dairy/pantry)
4. **Equipment Checklist** - inferred from service_style + component count + guest count:
   - Plated service: plate count = guest count \* courses
   - Buffet: chafing dish count = hot components, platters = cold components
   - Cocktail: small plate count = guest count \* 1.5
5. **Cost Summary** - food cost breakdown for chef's records (not client-facing)

#### Implementation

```
New server action: generateEventDocumentPack(eventId)
  1. Verify event has locked menu
  2. Generate each document (reuse existing generators where possible)
  3. Store in event documents (Supabase storage)
  4. Create in-app notification: "Document pack ready for [Event]"
  5. Return document URLs

Trigger integration:
  - In event transition handler (lib/events/transitions.ts):
    After successful transition to 'confirmed':
      try { await generateEventDocumentPack(eventId) }
      catch (err) { console.error('[non-blocking] Doc generation failed', err) }
  - Non-blocking: event confirmation succeeds even if doc gen fails
```

---

### 7. Supplementary Attachment Identification

**Current:** No system for identifying what additional documents/attachments a menu needs.

**Upgraded:** System proactively identifies required supplements based on menu content and event context.

#### Auto-Identified Attachments

| Menu Content                                    | Required Supplement                | Why                                         |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| Any allergen flags present                      | Allergen disclosure document       | Liability protection                        |
| Alcohol/beverage pairings                       | Beverage service agreement         | Licensing, liability                        |
| Raw/undercooked items (tartare, rare proteins)  | Consumer advisory notice           | Health code requirement                     |
| Dietary accommodations (GF, vegan alternatives) | Dietary accommodation confirmation | Ensures client acknowledges what's modified |
| Guest count > 50                                | Staffing plan                      | Operational necessity                       |
| Service style = buffet                          | Buffet layout diagram template     | Setup planning                              |
| Make-ahead components > 5                       | Prep timeline document             | Complex prep coordination                   |
| Event at client's home                          | Kitchen assessment checklist       | Equipment/facility verification             |

#### Implementation

```
New server action: identifyRequiredAttachments(menuId, eventId)
  1. Read menu with full hierarchy (dishes, components, allergens)
  2. Read event context (guest_count, service_style, venue)
  3. Run deterministic rules (table above)
  4. Return: { required: Attachment[], recommended: Attachment[] }

  Each Attachment: { type, reason, template_url?, completed: boolean }

UI: Checklist panel on event detail page
  - Required items shown with red indicator until completed
  - Recommended items shown with yellow indicator
  - Click to generate from template or upload custom
```

---

### 8. End-to-End Workflow (The Full Picture)

This is the complete automated workflow from inquiry to post-service, focusing on menu-related automation:

```
PHASE 1: INQUIRY & CONTEXT GATHERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inquiry received (email, embed form, Remy)
  ↓ GOLDMINE extracts: occasion, guest count, dietary needs, budget signals
  ↓ Client record created/updated with dietary restrictions, allergies
  ↓ Lead scored (deterministic)

PHASE 2: EVENT CREATION & MENU INITIATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event created from inquiry
  ↓ AUTO: initializeMenuForEvent() creates draft menu
  ↓ AUTO: Context sidebar populated (client dietary, past menus, matching templates)
  ↓ AUTO: Season, guest tier, occasion type tagged on menu
  ↓ ALERT: If client has allergies, prominent warning banner on menu editor

PHASE 3: MENU COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━
Chef opens menu editor
  ↓ Assembly browser available (templates, past menus, recipe bible)
  ↓ Chef adds dishes from any source (click, drag, Remy NL)
  ↓ AUTO: Each dish's components auto-scaled to target guest count
  ↓ AUTO: Allergen flags propagate up (ingredient > recipe > component > dish > menu)
  ↓ AUTO: Cost/guest and food cost % update live in sidebar
  ↓ AUTO: Missing ingredient prices flagged ("3 ingredients need pricing")
  ↓ AUTO: Required attachments identified and shown as checklist

PHASE 4: PRICING & COSTING VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chef reviews cost summary
  ↓ AUTO: Food cost % calculated and color-coded (green < 30%, yellow 30-40%, red > 40%)
  ↓ AUTO: Price/guest compared to quote (if quote exists)
  ↓ AUTO: Margin alerts if food cost exceeds target
  ↓ Chef adjusts: portions, substitutions, pricing
  ↓ AUTO: All changes cascade through cost chain instantly

PHASE 5: CLIENT APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━
Chef sends menu for approval
  ↓ AUTO: Menu snapshot frozen (JSONB)
  ↓ AUTO: Client-facing PDF generated and attached to email
  ↓ AUTO: Menu status → shared
  ↓ Client reviews, approves or requests revision
  ↓ AUTO: Chef notified with revision notes (if any)
  ↓ Revision cycle repeats if needed
  ↓ AUTO: On approval, menu status → locked

PHASE 6: PRE-SERVICE AUTOMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event confirmed
  ↓ AUTO: Full document pack generated:
     - Front-of-house menu (client-facing)
     - Prep sheet (day-by-day, station-by-station)
     - Grocery list (consolidated, scaled, grouped by section)
     - Equipment checklist (inferred from service style + menu)
     - Cost summary (chef-only)
  ↓ AUTO: Supplementary attachments checklist surfaced
  ↓ AUTO: Cross-event grocery consolidation (if multiple events in same week)
  ↓ ALERT: "3 events this week share 8 common ingredients - consolidated list ready"

PHASE 7: SERVICE EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━
Event in progress
  ↓ Service execution sheet available on mobile
  ↓ Chef logs modifications (substitutions, additions, removals)
  ↓ AUTO: Modification reasons tracked for future menu optimization

PHASE 8: POST-SERVICE & LEARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event completed
  ↓ AUTO: Post-service summary generated (planned vs. actual)
  ↓ AUTO: Recipe times_cooked incremented for all served recipes
  ↓ AUTO: Modification data feeds menu engineering matrix
  ↓ AUTO: Menu archived, available for future reference/reuse
  ↓ PROMPT: "Save as template?" if menu was for a common occasion type
  ↓ AUTO: Client menu history updated (collision detection for repeat bookings)
```

---

## Potential Roadblocks & Mitigations

| Roadblock                           | Risk                                                                                                       | Mitigation                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingredient unit inconsistency**   | Recipes use free-text units (cups, oz, lbs). Scaling math breaks when units don't match.                   | Phase 1: Add unit normalization layer. Map common units to base units (grams, ml). Don't block on edge cases; flag them for chef review. |
| **Missing ingredient prices**       | Cost chain breaks if any ingredient lacks pricing. Showing $0 violates zero-hallucination rules.           | Show "incomplete" badge instead of $0. Count and surface missing prices. Never display a partial cost as if it's complete.               |
| **Recipe yield not set**            | Many recipes won't have yield_quantity, breaking auto-scale math.                                          | Fallback to ratio scaling (new/old guest count). Prompt chef to add yield on first scale attempt.                                        |
| **Sub-recipe scaling**              | A sauce recipe used as a component in 3 dishes scales independently in each. Chef may want unified batch.  | Track shared recipes across dishes. Surface: "Beurre Blanc appears in 3 dishes - make one batch of [total] or 3 separate?"               |
| **Stale prices on old ingredients** | last_price_cents may be months old. Auto-costing looks accurate but isn't.                                 | Show "price age" indicator. Flag ingredients not updated in 30+ days. Never present stale-priced costs without a staleness warning.      |
| **Document generation failures**    | PDF generation could fail (missing data, template errors). Non-blocking means chef might not notice.       | Dashboard "document readiness" indicator per event. Red = missing docs for confirmed events.                                             |
| **Guest count changes after lock**  | Menu is locked but guest count changes. Scale factors are frozen.                                          | Allow scale-factor updates on locked menus (quantity changes, not menu content changes). Log the change in state transitions.            |
| **Multi-menu events**               | Some events need multiple menus (cocktail hour + dinner). Current schema: one menu per event.              | Phase 2: Change event.menu_id to event_menus junction table. Not blocking for V1 upgrade.                                                |
| **Performance at scale**            | Deep hierarchy queries (menu > dishes > components > recipes > ingredients) could be slow with many menus. | Use database views (already exist). Add indexes on common join paths. Paginate menu lists.                                               |

---

## Implementation Priority

### Phase 1: Core Automation (Highest Impact, Lowest Risk)

1. **Live cost sidebar in menu editor** - show cost/guest and food cost % in real time
2. **Margin alerts** - deterministic threshold checks on menu save/view
3. **Guest count auto-scaling** - recalculate all scale_factors when guest count changes
4. **Menu breakdown view** - collapsible tree showing full hierarchy with costs
5. **Missing price warnings** - flag incomplete cost calculations honestly

### Phase 2: Assembly & Initiation

6. **Menu context sidebar** - client dietary, past menus, templates on editor
7. **Assembly browser** - pull dishes from templates/past menus/recipe bible
8. **Auto-initiation** - create draft menu skeleton when event is created
9. **Cross-source dish copying** - deep copy with scale adjustment

### Phase 3: Document Automation

10. **Auto-generate document pack on event confirmation**
11. **Supplementary attachment identification and checklist**
12. **Cross-event grocery consolidation trigger**

### Phase 4: Intelligence & Optimization

13. **Menu lifecycle dashboard**
14. **Modification feedback loop** (mods feed menu engineering)
15. **Equipment inference from menu content**
16. **Prep timeline auto-generation from component metadata**

---

## What This Eliminates

| Current Manual Step                                    | Automated By                                                |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Create menu, link to event, set guest count            | Auto-initiation (Phase 2)                                   |
| Add dishes one by one from memory                      | Assembly browser (Phase 2)                                  |
| Manually calculate food cost                           | Live cost sidebar (Phase 1)                                 |
| Manually adjust portions for guest count               | Auto-scaling (Phase 1)                                      |
| Check if allergies conflict with menu                  | Allergen propagation + warnings (existing + Phase 1 alerts) |
| Generate prep sheet manually                           | Auto document pack (Phase 3)                                |
| Create grocery list manually                           | Auto document pack (Phase 3)                                |
| Check what equipment is needed                         | Equipment inference (Phase 4)                               |
| Remember what was served to repeat clients             | Past menu surfacing + collision detection (Phase 2)         |
| Track menu revisions manually                          | Lifecycle dashboard (Phase 4)                               |
| Notice when ingredient prices make a menu unprofitable | Margin alerts (Phase 1)                                     |

---

## Summary

ChefFlow's menu system already has the **data model and hierarchy** to support full automation. The gap is in the **connective tissue** between these systems: costs don't propagate automatically, documents don't generate at the right moment, guest count changes don't cascade, and the chef has to manually orchestrate what the system already knows how to do.

This upgrade turns ChefFlow from "a place where menus live" into "a system that actively manages menus." The chef's role shifts from data entry and manual orchestration to creative decisions and final approval, which is exactly where a chef's time should go.

Every automation follows Formula > AI. Every alert follows zero-hallucination rules (never show $0 when data is missing; always show "incomplete"). Every side effect is non-blocking. Every document is auto-generated but never auto-sent without chef confirmation (except the FOH menu on event confirmation, which is already an established workflow).
