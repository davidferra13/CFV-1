# Equipment Intelligence System - Complete Specification

> **Status:** Phase 1-3 BUILT (Foundation + Intelligence + Procurement). Phase 4 (contextual integrations) pending.
> **Date:** 2026-04-27
> **Scope:** Full equipment lifecycle for ChefFlow - data model through contextual UI

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Model](#2-data-model)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Inference Engine](#4-inference-engine)
5. [Loadout Generator](#5-loadout-generator)
6. [Gap Detection](#6-gap-detection)
7. [Procurement Layer](#7-procurement-layer)
8. [Lifecycle Tracking](#8-lifecycle-tracking)
9. [Contextual Intelligence](#9-contextual-intelligence)
10. [UI / Interface Layer](#10-ui--interface-layer)
11. [File Map](#11-file-map)
12. [Build Order](#12-build-order)

---

## 1. System Overview

Nine interconnected subsystems forming a complete equipment intelligence layer:

```
Recipe/Menu/Event Data
        |
   [Inference Engine] ---> [Equipment Inventory] <--- [Onboarding Flow]
        |                         |
   [Loadout Generator] <----------+
        |                         |
   [Gap Detection] <--------------+
        |                         |
   [Procurement] <--- gaps        [Lifecycle Tracking]
        |                         |
   [Contextual Intelligence] ---- surfaces insights across entire app
        |
   [UI Layer] ---- equipment hub, event prep, recipe editor, dashboard
```

**Design principles:**

- Formula > AI everywhere. Zero LLM calls in the equipment system.
- Zero Hallucination: inferred items always visually distinct, quantities shown as "at least N"
- Low friction: two taps to change state, one tap to confirm inferences
- Passive data collection: event usage keeps inventory fresh without active management
- No forced onboarding gates

---

## 2. Data Model

### 2.1 Tables

#### `equipment_categories` (system-managed, no tenant scope)

| Column       | Type                                          | Notes                              |
| ------------ | --------------------------------------------- | ---------------------------------- |
| `id`         | `serial PK`                                   |                                    |
| `slug`       | `text UNIQUE NOT NULL`                        | URL-safe: `cookware`, `saute-pans` |
| `name`       | `text NOT NULL`                               | Display: "Saute Pans"              |
| `parent_id`  | `integer REFERENCES equipment_categories(id)` | NULL = top-level                   |
| `sort_order` | `integer NOT NULL DEFAULT 0`                  | Within parent                      |
| `icon`       | `text`                                        | Optional icon identifier           |

Two levels max. Top-level categories:

```
Cookware > Saute Pans, Saucepans, Stockpots, Skillets, Woks, Roasting Pans, Dutch Ovens
Bakeware > Sheet Trays, Cake Pans, Muffin Tins, Pie Dishes, Loaf Pans, Cooling Racks
Knives & Cutting > Chef's Knives, Paring Knives, Bread Knives, Cleavers, Cutting Boards, Sharpening
Small Appliances > Immersion Circulators, Stand Mixers, Food Processors, Blenders, Torches, Scales
Prep Tools > Mixing Bowls, Whisks, Tongs, Spatulas, Ladles, Mandolines, Thermometers
Storage & Transport > Hotel Pans, Cambros, Lexans, Vacuum Sealer Bags, Sheet Tray Racks
Serving > Platters, Chafing Dishes, Tasting Spoons, Garnish Tools
Linens & Consumables > Towels, Aprons, Gloves, Parchment/Wrap
```

#### `equipment_aliases` (system-managed, no tenant scope)

| Column           | Type                                                   | Notes                                   |
| ---------------- | ------------------------------------------------------ | --------------------------------------- |
| `id`             | `serial PK`                                            |                                         |
| `alias`          | `text UNIQUE NOT NULL`                                 | Lowercased: "sheet pan", "cookie sheet" |
| `category_id`    | `integer NOT NULL REFERENCES equipment_categories(id)` |                                         |
| `canonical_name` | `text`                                                 | Preferred display: "Sheet Tray"         |

Seeded with common synonyms. Grows over time. Key mappings:

- "sheet pan" / "baking sheet" / "cookie sheet" -> "Sheet Tray"
- "sous vide" / "circulator" / "anova" -> "Immersion Circulator"
- "fry pan" / "skillet" -> "Skillet"
- "cambro" / "hot box" -> "Insulated Carrier"
- "chinois" / "china cap" -> "Fine Mesh Strainer"

#### `equipment_items` (per tenant)

| Column                     | Type                                          | Notes                                          |
| -------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `id`                       | `text PK`                                     | nanoid                                         |
| `chef_id`                  | `text NOT NULL REFERENCES chefs(id)`          | Tenant scope                                   |
| `category_id`              | `integer REFERENCES equipment_categories(id)` | NULL if uncategorized                          |
| `name`                     | `text NOT NULL`                               | Chef's name for this item                      |
| `canonical_name`           | `text`                                        | System-normalized from aliases                 |
| `brand`                    | `text`                                        | "All-Clad", "Lodge"                            |
| `model`                    | `text`                                        | Specific model                                 |
| `material`                 | `text`                                        | "stainless steel", "cast iron"                 |
| `size_label`               | `text`                                        | Human-readable: "10 inch", "half"              |
| `size_value`               | `numeric`                                     | Numeric for sorting/filtering                  |
| `size_unit`                | `text`                                        | "in", "qt", "cup", "L"                         |
| `quantity`                 | `integer NOT NULL DEFAULT 1`                  | How many owned                                 |
| `status`                   | `text NOT NULL DEFAULT 'active'`              | See lifecycle states                           |
| `source`                   | `text NOT NULL DEFAULT 'manual'`              | `manual`, `inferred`, `receipt_scan`, `import` |
| `confidence`               | `numeric`                                     | 0.0-1.0, only for non-manual                   |
| `inferred_from`            | `text`                                        | "recipe:abc123" breadcrumb                     |
| `confirmed_at`             | `timestamp`                                   | When chef confirmed inferred item              |
| `purchase_price_cents`     | `integer`                                     | Per-unit cost                                  |
| `purchase_date`            | `date`                                        |                                                |
| `replacement_cost_cents`   | `integer`                                     | Estimated current                              |
| `expected_lifespan_months` | `integer`                                     | For depreciation                               |
| `last_used_at`             | `timestamp`                                   | Updated by event usage                         |
| `last_status_change_at`    | `timestamp DEFAULT now()`                     |                                                |
| `borrowed_from`            | `text`                                        | When status=borrowed                           |
| `lent_to`                  | `text`                                        | When status=lent_out                           |
| `notes`                    | `text`                                        | Free-form                                      |
| `image_path`               | `text`                                        | Storage path                                   |
| `tags`                     | `text[]`                                      | "event-kit", "home-kitchen"                    |
| `created_at`               | `timestamp NOT NULL DEFAULT now()`            |                                                |
| `updated_at`               | `timestamp NOT NULL DEFAULT now()`            |                                                |

**Status CHECK:** `active`, `stored`, `broken`, `needs_replacement`, `borrowed`, `lent_out`, `retired`, `missing`

**Indexes:**

- `(chef_id)`, `(chef_id, category_id)`, `(chef_id, status)`
- Partial: `(chef_id, source) WHERE source = 'inferred' AND confirmed_at IS NULL`

**One row per (chef, canonical identity, size, material).** "3 half sheet trays" = one row, qty=3.

#### `recipe_equipment` (links recipes to required equipment)

| Column            | Type                                                     | Notes                    |
| ----------------- | -------------------------------------------------------- | ------------------------ |
| `id`              | `text PK`                                                | nanoid                   |
| `recipe_id`       | `text NOT NULL REFERENCES recipes(id) ON DELETE CASCADE` |                          |
| `category_id`     | `integer REFERENCES equipment_categories(id)`            |                          |
| `name`            | `text NOT NULL`                                          | What the recipe calls it |
| `size_constraint` | `text`                                                   | "10+ inch", "6+ qt"      |
| `quantity_needed` | `integer NOT NULL DEFAULT 1`                             |                          |
| `is_essential`    | `boolean NOT NULL DEFAULT true`                          | false = nice to have     |
| `notes`           | `text`                                                   | "oven-safe required"     |
| `sort_order`      | `integer NOT NULL DEFAULT 0`                             |                          |

#### `equipment_status_log` (append-only audit trail)

| Column         | Type                                           | Notes                                                       |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `id`           | `uuid PK`                                      |                                                             |
| `equipment_id` | `text NOT NULL REFERENCES equipment_items(id)` |                                                             |
| `chef_id`      | `text NOT NULL REFERENCES chefs(id)`           |                                                             |
| `old_status`   | `text NOT NULL`                                |                                                             |
| `new_status`   | `text NOT NULL`                                |                                                             |
| `trigger`      | `text NOT NULL`                                | `manual`, `event_usage`, `staleness_check`, `age_threshold` |
| `note`         | `text`                                         |                                                             |
| `created_at`   | `timestamp NOT NULL DEFAULT now()`             |                                                             |

#### `equipment_inferences` (CIL inference queue)

| Column                            | Type                                 | Notes                                   |
| --------------------------------- | ------------------------------------ | --------------------------------------- |
| `id`                              | `uuid PK`                            |                                         |
| `chef_id`                         | `text NOT NULL REFERENCES chefs(id)` |                                         |
| `equipment_name`                  | `text NOT NULL`                      |                                         |
| `category`                        | `text NOT NULL`                      |                                         |
| `status`                          | `text NOT NULL DEFAULT 'inferred'`   | `inferred`, `confirmed`, `dismissed`    |
| `confidence_score`                | `numeric(3,2) NOT NULL`              |                                         |
| `primary_rule_id`                 | `text NOT NULL`                      | Which catalog rule triggered            |
| `supporting_signals`              | `jsonb NOT NULL`                     | Array of {rule_id, signal, match, date} |
| `first_inferred_at`               | `timestamp NOT NULL DEFAULT now()`   |                                         |
| `last_boosted_at`                 | `timestamp`                          |                                         |
| `confirmed_at`                    | `timestamp`                          |                                         |
| `dismissed_at`                    | `timestamp`                          |                                         |
| `dismiss_suppress_until`          | `timestamp`                          |                                         |
| `UNIQUE(chef_id, equipment_name)` |                                      |                                         |

#### `event_equipment_gaps` (persisted gap records)

| Column               | Type                                                    | Notes                                                                                          |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                 | `uuid PK`                                               |                                                                                                |
| `event_id`           | `text NOT NULL REFERENCES events(id) ON DELETE CASCADE` |                                                                                                |
| `chef_id`            | `text NOT NULL REFERENCES chefs(id)`                    |                                                                                                |
| `equipment_name`     | `text NOT NULL`                                         |                                                                                                |
| `equipment_category` | `text`                                                  |                                                                                                |
| `gap_type`           | `text NOT NULL`                                         | `missing`, `insufficient_qty`, `wrong_size`, `broken`, `borrowed_unavailable`, `double_booked` |
| `severity`           | `text NOT NULL`                                         | `critical`, `important`, `nice_to_have`                                                        |
| `quantity_needed`    | `integer NOT NULL`                                      |                                                                                                |
| `quantity_available` | `integer NOT NULL DEFAULT 0`                            |                                                                                                |
| `used_for`           | `text`                                                  | Which recipes/components need it                                                               |
| `status`             | `text NOT NULL DEFAULT 'open'`                          | `open`, `pending_procurement`, `pending_repair`, `resolved_*`, `dismissed`                     |
| `resolution_note`    | `text`                                                  | Chef's explanation                                                                             |
| `detected_at`        | `timestamp NOT NULL DEFAULT now()`                      |                                                                                                |
| `resolved_at`        | `timestamp`                                             |                                                                                                |

**Total: 7 new tables, 0 altered existing tables.**

---

## 3. Onboarding Flow

### Entry Point

Dashboard banner (dismissible, non-blocking). Never a forced gate.

### Three Paths

**Path A: Starter Kit (fastest, ~30 seconds)**

- 4-6 preset cards: "Private Chef Basics (47 items)", "Pastry Chef Kit (38)", "Catering Setup (62)", "Farm-to-Table (41)", "Full Professional (89)"
- One tap selects. Entire kit bulk-inserted instantly.
- "Edit this list" or "Looks good" to finish.
- Presets are static JSON fixtures curated by the developer, not AI-generated.

**Path B: Category Browser (~1-3 minutes)**

- Bulk checkbox list organized by category, collapsed by default.
- "Select All" toggle per category header.
- Running count in header: "34 items selected"
- Search bar filters across all categories in real-time.
- Auto-saves on every toggle. No save button.
- Quick-add buttons: [Italian essentials] [Asian wok setup] [BBQ/Grill] [Baking basics]

**Path C: Start Blank**

- Closes immediately. Inventory builds passively via inference engine.

### Immediate Value on Completion

- Capacity estimate: "Your kit supports events up to ~X guests" (deterministic formula)
- Gap analysis: "For events over X guests, you'd need: [3 items]"
- Next event check: cross-reference upcoming events

### Progressive Completion (post-onboarding)

- Post-event AAR: "Did you have everything?" Yes/No
- Recipe creation: "Add immersion blender to your kit?" one-tap
- Quarterly review: dashboard card for items untouched 90+ days
- No completion percentage bars. No email reminders. No gamification.

---

## 4. Inference Engine

### Architecture: Deterministic Rules Catalog, No AI

~80 inference rules stored in TypeScript (`lib/equipment/inference-catalog.ts`), not in the database.

### Signal Types

| Signal                        | Example                                | Confidence |
| ----------------------------- | -------------------------------------- | ---------- |
| technique: "sous vide"        | -> immersion circulator, vacuum sealer | 0.85 base  |
| technique: "torch"/"brulee"   | -> kitchen torch                       | 0.90 base  |
| component: "ice cream base"   | -> ice cream machine                   | 0.85 base  |
| service: "buffet"             | -> chafing dishes, sterno              | 0.75 base  |
| guests > 50                   | -> cambros, hotel pans                 | 0.70 base  |
| ingredient: "liquid nitrogen" | -> dewar, cryo gloves                  | 0.90 base  |

### Confidence Scoring

```
score = base_confidence + sum(applicable_boosters) - penalties - decay
capped at 0.95 (only manual = 1.0)
```

Boosters: used in 3+ recipes (+0.10), across 2+ events (+0.15), co-occurs with related signal (+0.05).

### Decision Tree

| Score       | Action                                             |
| ----------- | -------------------------------------------------- |
| >= 0.80     | Auto-add as "inferred" with visual distinction     |
| 0.50 - 0.79 | Queue for batched confirmation (max 3 prompts/day) |
| < 0.50      | Store silently, no user-facing action              |

### Execution Triggers

1. Recipe save: scan techniques/methods/ingredients
2. Event completion: "executed successfully" booster applies

### Feedback Loop

- Confirmed: score locked to 1.0
- Dismissed: -0.30 penalty for this chef, suppress 6 months
- Global: rules with >50% dismiss rate flagged for base confidence reduction

---

## 5. Loadout Generator

### Architecture: Pure Function

`buildEquipmentLoadout()` takes event data + inventory, returns a complete checklist. No side effects, no DB calls. Server action fetches data, passes to engine.

### Four Mapping Layers

**Layer A: Recipe Equipment (explicit)** - `recipes.equipment` text array, highest signal.

**Layer B: Technique Inference** - Parse `recipe.method` via regex -> equipment. ~22 technique patterns (sous vide, sear, saute, braise, roast, grill, deep fry, blanch, smoke, torch, blend, etc.)

**Layer C: Component Category** - protein -> cutting board + meat thermometer; sauce -> saucepan + whisk; bread -> sheet pan + bench scraper; etc.

**Layer D: Service Style** - plated -> plates/flatware/glasses per guest; buffet -> chafing dishes per hot dish + sterno; cocktail -> napkins x3 per guest + picks x4; tasting_menu -> plates per guest per course.

### Quantity Scaling

```
Fixed:     quantity = defined or 1
Per-guest: ceil(guestCount * factor * (1 + buffer))
Scalable:  ceil(guestCount / capacityPortions)
```

Capacity model: half sheet tray = 8 portions, 12" saute pan = 6 portions, stockpot 8qt = 12 portions.

### Substitution Graph

When chef doesn't own required item, suggest alternatives:

- Stand mixer -> hand mixer (equivalent) or whisk (degraded)
- Deep fryer -> heavy pot + thermometer (equivalent)
- Kitchen torch -> broiler (equivalent)
- Immersion blender -> blender in batches (equivalent)

Quality ratings: `equivalent`, `partial`, `degraded`.

### Venue Type Modifiers

`client_home`: assume oven/stovetop/fridge, always bring cutting board + knife roll + towels.
`commercial_kitchen`: assume most equipment, bring specialty items only.
`outdoor`: assume nothing, bring portable burners, coolers, hand washing, fire extinguisher.
`event_venue`: confirm in advance, varies wildly.
`office`: usually no real kitchen, plan for minimal infrastructure.

**Schema addition needed:** `venue_type` enum on events table.

### Output Structure

Grouped by category: Cooking Equipment, Prep Equipment, Service Equipment, Transport/Storage, Consumables, Safety/Cleaning. Each item shows: name, quantity, source (owned/venue/substitute/need), reason (which recipes need it), batch plan if applicable.

---

## 6. Gap Detection

### Comparison Algorithm

For each required item from the loadout:

1. Find matching inventory items (by ID, then fuzzy name match)
2. Check substitutes before declaring missing
3. Filter out unusable (broken, expired borrowed)
4. Account for double-booking (same-day event conflicts)
5. Check quantity sufficiency
6. Check size adequacy

### Gap Types

`missing`, `insufficient_qty`, `wrong_size`, `broken`, `borrowed_unavailable`, `double_booked`

### Severity Classification (deterministic)

| Severity         | Rule                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **CRITICAL**     | Essential item, zero available. Or irreplaceable category (oven, stovetop) missing. Or double-booked critical. |
| **IMPORTANT**    | Essential item, some but not enough. Or wrong size on critical.                                                |
| **NICE-TO-HAVE** | Non-essential items.                                                                                           |

### Three Alert Phases

| Phase           | When                             | Behavior                                                                       |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Early Warning   | Menu assigned (>7 days out)      | Yellow banner on event page. No push notification.                             |
| Action Required | Event confirmed or 7 days before | CRITICAL gaps soft-block confirmation. Todo created per gap.                   |
| Final Check     | Day before event                 | Push notification if enabled. Direct "Mark resolved" or "Modify menu" options. |

### Resolution Paths

Buy (-> procurement), Repair (-> todo), Borrow (-> log lender), Substitute (-> accept alt), Venue Provides (-> acknowledge), Work Around (-> log plan), Modify Menu (-> navigate to editor), Dismiss (nice-to-have only).

Resolution status tracked: `pending_procurement`, `pending_repair` re-checked at later phases.

### Completion Contract Integration

New `equipment_ready` signal in event evaluator. Non-blocking by default, blocking when event is `confirmed` or later. Feeds dashboard completion summary.

---

## 7. Procurement Layer

### Two-Layer Resolution

**Layer 1: Static Catalog (instant, free)** - `lib/equipment/procurement-catalog.ts` maps canonical equipment names to:

- Search terms per supplier
- Price estimates per tier (budget/mid/premium) in cents
- Brand hints per tier
- Restaurant Depot availability flag

**Layer 2: DDG Fallback (1-2s, free)** - `searchEquipmentOnline()` server action mirroring existing `searchIngredientOnline()` pattern. Trusted equipment domains: webstaurantstore.com, jbprince.com, amazon.com, restaurantdepot.com, matferbourgeatusa.com, vollrath.com, etc.

### Tiered Options

| Tier    | Label         | Example (Half Sheet Tray) |
| ------- | ------------- | ------------------------- |
| Budget  | "Get It Done" | $8-15, Nordic Ware        |
| Mid     | "Workhorse"   | $15-30, Vollrath          |
| Premium | "Investment"  | $30-60, Matfer Bourgeat   |

### Source Priority

1. Professional (WebstaurantStore, Vollrath)
2. Premium (JB Prince, Matfer, de Buyer)
3. Convenience (Amazon)
4. Local pickup (Restaurant Depot, location-aware)
5. Niche (Ateco for pastry, only when category matches)

### "Mark as Purchased" Flow

Click -> pre-fill `createEquipmentItem()` with name, category, price -> item in inventory -> gap resolved -> packing list updated. Under 60 seconds total.

### Future: OpenClaw Equipment Pricing Cartridge

Weekly scrape of WebstaurantStore/Amazon. ~5K-10K products. Not a blocker; static catalog + DDG works today.

---

## 8. Lifecycle Tracking

### State Machine

```
active -> stored, broken, needs_replacement, lent_out, retired, missing
stored -> active, broken, retired, missing, lent_out
broken -> active (repaired), retired, needs_replacement
needs_replacement -> active (replaced), broken, retired
borrowed -> active (bought own), retired (returned)
lent_out -> active (returned), missing (never came back)
retired -> (terminal)
missing -> active (found), retired (written off), broken (found damaged)
```

### Update Triggers

**Manual:** Tap status chip -> select new state. Two taps total. Optional note, never required.

**Event-driven:** When event reaches `confirmed`/`in_progress`, loadout items get `last_used_at` updated. `stored` items auto-transition to `active`. `missing` items in loadout auto-transition to `active`.

**Automatic (CIL scanner):**

- 6 months unused -> "still have this?" nudge
- 12 months unused -> auto-transition to `stored`
- `expected_lifespan_months` exceeded -> auto-transition to `needs_replacement`
- `borrowed`/`lent_out` > 30 days -> single dashboard note

### Staleness Prevention

- Event loadouts are the primary freshness mechanism (passive)
- Quarterly batch review card: "7 items unused since January. Quick check?" (dismissible, 30-second scan)
- Auto-demotion to `stored` at 12 months, easy recovery by adding to loadout
- No individual item notifications. No email reminders.

### Financial

Straight-line depreciation computed (never stored): `current_value = max(0, cost - (months * cost/lifespan))`. Existing `equipment-depreciation-explainer.ts` generates plain-English summaries.

---

## 9. Contextual Intelligence

### Trigger Points Across App

#### Recipe Creation/Edit

- Technique tag added -> auto-populate equipment array
- Equipment field edited -> fuzzy-match against inventory, show "You own this" or "Not in inventory"

#### Menu Creation/Edit

- Recipe added -> aggregate equipment, show summary card in sidebar
- Aggregated exceeds inventory -> warning badge: "Needs 8 sheet pans; you own 4"

#### Event Planning

- Menu attached -> auto-generate checklist
- Guest count changed -> re-scale, surface capacity gaps
- Venue changed -> inject venue-specific equipment
- Event confirmed -> final checklist on Ops tab
- T-72h -> staging reminder in briefing
- T-24h -> final verification prompt
- Event completed -> reconciliation: mark returns, report damage

#### Prep Execution (Mise en Place)

- Station card viewed -> show station-specific equipment inline
- Pack checklist -> progress bar + rental confirmation nudges
- Timeline slot -> equipment needed for that time block only

#### Dashboard

- Upcoming event has gaps -> single line in readiness widget
- Rental pickup due -> briefing line
- Maintenance overdue -> low-priority CIL insight (opt-in only)

#### Shopping/Grocery List

- Consumable equipment (parchment, vacuum bags, sterno) -> "Supplies to buy" section

### Show vs. Silent Rules

**Show when:** actionable now, prevents future problem, high confidence, chef is in relevant context.

**Silent when:** draft event with no date, already addressed, within 1-item margin, event >14 days out (no rentals), empty equipment fields, same insight dismissed in 7 days.

### Suggestion Types

| Type            | Color      | Persistence                  |
| --------------- | ---------- | ---------------------------- |
| Informational   | muted gray | Dismissible                  |
| Warning         | amber      | Persistent until resolved    |
| Action Required | red        | Cannot dismiss, only resolve |

### Alert Fatigue Prevention

- Aggregate: "3 equipment gaps" badge, not 3 alerts
- Time-gate: insights activate 14 days before confirmed events, 3 days for drafts
- Deduplicate across surfaces
- Respect dismissal (7-day cooldown)
- No empty states that look like problems

---

## 10. UI / Interface Layer

### Navigation

Equipment lives under **Culinary** (sibling to Recipes, Menus, Price Catalog).

### Equipment Hub (`/culinary/equipment`)

- Card grid (not table). Touch-friendly, scannable.
- Top bar: search, category filter chips, sort dropdown (Recent/A-Z/Category), Add button
- List mode toggle (persists in localStorage)
- Card anatomy: photo/icon, name, category, quantity, status badge

### Equipment Detail (slide-over panel desktop, full page mobile)

- Header: photo, name, category, status
- Quick facts: quantity, condition, size, brand (all inline-editable)
- Event history: auto-populated timeline
- Notes: freeform text
- Depreciation line: single sentence

### Equipment in Context

- Event prep tab: compact checklist with pack checkboxes
- Recipe editor: tag-style equipment input with inventory typeahead
- Menu detail: auto-aggregated rollup from all recipes

### Interaction Patterns

- **State changes:** tap status chip -> select new state (2 taps)
- **Quantity:** tap quantity on card -> inline stepper, auto-saves
- **Bulk ops:** select mode with sticky bottom bar (Change Category, Change Status, Delete)
- **Mobile:** long-press for context menu (no swipe gestures)

### Visual Design

- Status via Badge component: Active (success), Needs Repair (warning), Retired (default), New (info)
- Inferred items: "(inferred)" label until confirmed, one-tap confirm
- Dashboard widget: silent when healthy, speaks only when action needed

### Mobile Specifics

- FAB for add button (56px, bottom-right)
- Camera button in add modal (for reference photos, not AI identification)
- Event prep packing checklist (local checkboxes, disposable after event)

---

## 11. File Map

### New Files

```
lib/equipment/
  types.ts                         -- Core types (LoadoutItem, EquipmentGap, etc.)
  inference-catalog.ts             -- ~80 deterministic inference rules
  inference-engine.ts              -- Signal extraction + confidence scoring
  procurement-catalog.ts           -- Static catalog: names, prices, brands, suppliers
  procurement-sources.ts           -- Source definitions: URLs, tiers, domains
  procurement-match.ts             -- Token-based matching: input -> catalog entry
  equipment-sourcing-actions.ts    -- Server action: DDG search for equipment
  gap-detection.ts                 -- Comparison algorithm + severity classification
  intelligence.ts                  -- Pure function: event data + inventory -> loadout with gaps

lib/equipment-loadout/
  engine.ts                        -- buildEquipmentLoadout() pure function
  types.ts                         -- Loadout-specific types
  capacity-model.ts                -- Portions-per-unit for scalable equipment
  substitutions.ts                 -- Substitution graph
  maps/
    technique-equipment-map.ts     -- Technique regex -> equipment
    category-prep-map.ts           -- Component category -> prep equipment
    service-style-map.ts           -- Service style -> service equipment
    venue-modifiers.ts             -- Venue type -> modifier layer

components/equipment/
  equipment-sourcing-panel.tsx     -- Inline sourcing results
  procurement-card.tsx             -- Tiered view (budget/mid/premium)

app/(chef)/culinary/equipment/
  page.tsx                         -- Equipment hub
  [id]/page.tsx                    -- Equipment detail
```

### Modified Files

```
lib/completion/evaluators/event.ts         -- Add equipment_ready requirement
lib/cil/types.ts                           -- Add equipment entity + uses_equipment relation
lib/documents/generate-packing-list.ts     -- Replace hardcoded kit with loadout engine
components/events/packing-list.tsx         -- Add "Find it" on missing items
app/(chef)/events/[id]/ components         -- Equipment section in prep tab
```

### Database Migrations (all additive)

- `equipment_categories` table + seed data
- `equipment_aliases` table + seed data
- `equipment_items` table (replaces/extends existing `equipment_inventory` if present)
- `recipe_equipment` table
- `equipment_status_log` table
- `equipment_inferences` table
- `event_equipment_gaps` table
- `venue_type` enum + column on events

---

## 12. Build Order

Phase 1 (Foundation):

1. Database migration: all 7 new tables + venue_type
2. `equipment_categories` + `equipment_aliases` seed data
3. `equipment_items` CRUD actions
4. Equipment hub page (basic list/search/filter)

Phase 2 (Onboarding + Inventory): 5. Starter kit presets (JSON fixtures) 6. Onboarding flow (dashboard banner, category browser, starter kits) 7. Equipment detail view 8. Lifecycle state machine + status log

Phase 3 (Intelligence): 9. Inference catalog (~80 rules) 10. Inference engine (recipe save trigger) 11. Loadout generator (pure function + all 4 mapping layers) 12. Gap detection (comparison + severity + alert phases)

Phase 4 (Procurement + Polish): 13. Procurement catalog (static) 14. Equipment sourcing action (DDG-based) 15. "Find it" buttons in gap detection UI 16. Contextual intelligence (trigger points across app) 17. Completion contract integration 18. CIL entity type additions

---

## Design Credits

This specification was produced by 9 parallel design agents, each focusing on one subsystem, then synthesized into a unified document. No code has been written. All designs are additive to the existing codebase (no destructive changes).
