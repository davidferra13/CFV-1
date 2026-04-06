# Spec: Food Costing Knowledge System

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `auto-costing-engine.md` (verified), `chef-pricing-override-infrastructure.md` (built)
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event         | Date             | Agent/Session   | Commit |
| ------------- | ---------------- | --------------- | ------ |
| Created       | 2026-04-05 21:00 | planner session |        |
| Status: ready | 2026-04-05 21:00 | planner session |        |

---

## Developer Notes

### Raw Signal

The developer ran a live research exercise: "What is the most common way to price out anything that comes to food cost?" The conversation produced a complete, validated taxonomy of food costing methodology covering both primary methods (food cost percentage, cost-plus buildup), all supporting concepts (AP/EP, Q-factor, yield factors, prime cost, contribution margin, menu engineering, theoretical vs. actual variance, value-based pricing), and the real-world contexts where each applies. The developer then said: "Convert the research into a canonical source of truth immediately." Two artifacts in parallel: a developer spec formalizing enforceable rules, and a user-facing operating guide. Plus a delivery surface for how this knowledge reaches users, developers, and agents.

The developer then pushed further: "What does a chef need to know to cost anything out?" This produced a comprehensive prerequisite knowledge map: recipe hierarchy, ingredient attributes, unit conversions (weight, volume, density, count-to-weight), yield factors (trim and cooking for 150+ ingredients), portion standards (by course, service style, demographic), menu architecture, procurement, scaling behavior, labor and timing, equipment constraints, food safety cost impact, seasonal pricing, dietary restriction cost multipliers, and cross-utilization. The developer then asked: "Does this work for any type of food operator?" This surfaced gaps for food trucks (commissary, generator, permits), bakeries (oven scheduling, decoration labor, packaging, waste rate), ghost kitchens (platform commissions, packaging), restaurants (beverage program, table turns, comps), meal prep (containers, cold chain, labels), institutional (contract pricing, nutritional compliance, commodity programs), pop-ups (one-time cost absorption), and wholesale/CPG (co-packing, slotting fees, broker commissions). Plus universal cost lines: payment processing, taxes, insurance, marketing.

### Developer Intent

- **Core goal:** Formalize food costing methodology as an enforceable, referenceable knowledge layer inside ChefFlow. Not just for private chefs: for any food operator type.
- **Key constraints:** Must not duplicate existing auto-costing engine or pricing override specs. This is the KNOWLEDGE, not the engine. The engine already exists. Must work universally across all operator types (private chef, caterer, food truck, bakery, ghost kitchen, restaurant, meal prep, institutional, pop-up, wholesale/CPG).
- **Motivation:** ChefFlow has the calculation infrastructure but no canonical definition of what the calculations mean, when to use which method, or how to interpret results. That knowledge lives in the developer's head and in one conversation thread. It needs to be permanent. Additionally, no competitor has a comprehensive, operator-type-aware knowledge layer. This is a differentiation opportunity.
- **Success from the developer's perspective:** Any agent building costing features, any user reading their numbers, and any in-app help surface can point to one authoritative source. No ambiguity about methodology. Works for a food truck operator just as well as a private chef.

---

## What This Does (Plain English)

Establishes a canonical knowledge layer that defines exactly how food costing works in ChefFlow: what methods exist, when each applies, what every number means, and how operators should interpret and act on their data. This layer is referenced by the auto-costing engine (for calculation rules), by the UI (for contextual help and tooltips), by Remy (for answering costing questions), and by the user guide (for operator education). It is the single source of truth for food costing methodology in the product.

---

## Why It Matters

ChefFlow's auto-costing engine can compute numbers, but numbers without methodology are noise. A chef seeing "32% food cost" needs to know: is that good? Compared to what? What levers do I pull? A builder agent implementing a new costing feature needs to know: which formula? What edge cases? What assumptions? This spec answers both by defining the standard before evaluating performance against it.

---

## Part 1: Canonical Food Costing Methodology

### Two Primary Methods

ChefFlow recognizes two costing methods. Both are valid. They serve different contexts.

#### Method 1: Food Cost Percentage (Top-Down)

The industry-standard method for menu pricing, recipe costing, and per-person event pricing.

**Core formula:**

```
Food Cost % = (Total Ingredient Cost / Selling Price) x 100
Selling Price = Total Ingredient Cost / Target Food Cost %
```

**Multiplier shortcut:**

```
Selling Price = Ingredient Cost x Multiplier

| Target % | Multiplier |
|-----------|------------|
| 25%       | 4.00       |
| 28%       | 3.57       |
| 30%       | 3.33       |
| 32%       | 3.13       |
| 35%       | 2.86       |
```

**Target ranges (enforceable defaults):**

| Operation Type          | Floor | Default | Ceiling |
| ----------------------- | ----- | ------- | ------- |
| Fine dining             | 28%   | 30%     | 35%     |
| Casual dining           | 28%   | 32%     | 38%     |
| Private chef (per head) | 22%   | 30%     | 38%     |
| Catering / events       | 25%   | 30%     | 38%     |
| High volume             | 26%   | 30%     | 35%     |

**System behavior:**

- Default target is **30%** unless the chef sets a custom target.
- If computed food cost exceeds the ceiling for the operation type, surface a warning (amber). Not a block.
- If computed food cost exceeds 45%, surface a critical alert (red). Still not a block. Chefs control their pricing.
- These thresholds are configurable per chef via the pricing override infrastructure.

#### Method 2: Cost-Plus Buildup (Bottom-Up)

The standard method for custom event proposals, private chef engagements, and any job where variables change per booking.

**Core formula:**

```
Price = (Food + Labor + Overhead + Incidentals) x (1 + Profit Margin)
```

**Line items (all required for a complete cost-plus calculation):**

| Line Item       | Source                                                     | Unit       |
| --------------- | ---------------------------------------------------------- | ---------- |
| Food cost       | Sum of all recipe costs (AP/EP adjusted, Q-factor added)   | cents      |
| Labor           | Hours x rate (prep + cook + service + cleanup)             | cents      |
| Overhead        | Allocated per job (kitchen, insurance, equipment, vehicle) | cents      |
| Incidentals     | Per-job (travel, parking, rentals, disposables, fuel, ice) | cents      |
| **Subtotal**    | Sum of above                                               | cents      |
| Profit margin   | Chef-configured percentage (default 20%)                   | percentage |
| **Final price** | Subtotal x (1 + margin)                                    | cents      |

**System behavior:**

- Default profit margin is **20%** unless the chef sets a custom margin.
- All line items are stored in cents (integers). No floating point currency.
- A cost-plus calculation is only "complete" when food + at least one of (labor, overhead) are populated. Food-only is just Method 1.
- Incidentals default to $0 (not all jobs have them). This is real zero, not missing data.

### Supporting Concepts (Enforceable Definitions)

These are not optional add-ons. They are load-bearing components of accurate food costing.

#### AP vs. EP (As Purchased vs. Edible Portion)

```
EP Cost = AP Cost / Yield Factor
Yield Factor = EP Weight / AP Weight (decimal, 0 < yield <= 1.0)
```

- **AP** = what you buy (includes bones, trim, skin, stems, waste)
- **EP** = what you serve (usable portion after loss)
- Every ingredient in the system has a `yield_factor` field. Default is `1.0` (no waste). A yield factor of `0.65` means 35% waste.
- Recipe costing MUST use EP cost, not AP cost. Costing against AP weight is a systematic undercount of true cost.
- Yield factors vary by preparation method. Raw broccoli yield differs from blanched broccoli yield. The system stores one default yield per ingredient; chefs can override per recipe.

**Enforcement rule:** If a recipe's ingredient has `yield_factor = 1.0` AND the ingredient category is one where waste is expected (proteins, produce, seafood), surface a "yield factor may need adjustment" hint. Do not auto-correct. Do not block.

#### Q-Factor (Incidental Ingredient Surcharge)

```
Adjusted Recipe Cost = Direct Ingredient Cost x (1 + Q-Factor)
```

- Q-Factor covers: cooking oil, salt, pepper, butter for pans, garnish herbs, squeeze of citrus, vinegar dashes, flour for dusting, etc.
- **Default Q-Factor: 7%** (0.07)
- Acceptable range: 3% to 15%
- Chef-configurable in pricing settings
- Applied automatically to every recipe cost calculation unless the chef explicitly disables it

**Enforcement rule:** Q-Factor is always applied unless `q_factor_enabled = false` in chef pricing settings. It is never zero by default. Zero Q-factor means the chef made a deliberate choice.

#### Prime Cost

```
Prime Cost % = (Food Cost + Labor Cost) / Revenue x 100
```

- Target range: **55-65%** of revenue
- This is a monitoring metric, not a pricing input. The system computes it; the chef watches it.
- Displayed on financial dashboards and event profitability views
- If prime cost exceeds 65%, surface an advisory. If it exceeds 75%, surface a warning.

#### Contribution Margin

```
Contribution Margin = Selling Price - Food Cost (in dollars)
Contribution Margin % = Contribution Margin / Selling Price x 100
```

- This is the complementary view to food cost percentage. Same data, different lens.
- High food cost % can coexist with high contribution margin on premium items.
- Surfaced alongside food cost % in recipe and menu views. Never hidden.

#### Menu Engineering / Blended Food Cost

```
Blended Food Cost % = Sum(item_food_cost x item_quantity) / Sum(item_price x item_quantity) x 100
```

- Individual items can exceed target food cost % if the weighted blend hits target.
- This applies to multi-course menus, tasting menus, and event menus where courses subsidize each other.
- The auto-costing engine already computes per-menu blended cost. This definition ensures it's labeled and explained correctly in the UI.

#### Theoretical vs. Actual Variance

```
Variance = Actual Food Cost % - Theoretical Food Cost %
Theoretical = what cost SHOULD be (recipe cards x covers sold)
Actual = what cost IS (purchases - ending inventory + beginning inventory) / revenue
```

- Positive variance = spending more than recipes predict (waste, over-portioning, theft, spoilage)
- Target variance: **< 2 percentage points**
- This requires inventory tracking, which is a future feature. Define the concept now; implement when inventory exists.
- **Do not display variance metrics until inventory tracking is live.** Showing theoretical-only and calling it "variance" is a hallucination.

#### Value-Based Pricing (Ceiling)

- Not a formula. A principle.
- Cost-based methods set the **floor** (minimum viable price). Value-based pricing sets the **ceiling** (maximum the market will pay).
- The system never auto-calculates value-based pricing. It is always a chef decision.
- The system CAN surface the cost floor clearly so the chef knows their minimum before setting a value-based price.
- Chef pricing overrides (already built) are the mechanism for value-based pricing. No new infrastructure needed.

#### Seasonal Adjustment

- Ingredient prices fluctuate 40-60% across seasons (produce, seafood especially).
- The OpenClaw price database tracks historical prices with timestamps.
- The auto-costing engine uses the most recent price by default.
- Future enhancement: surface seasonal price trend indicators (up/down/stable) next to ingredient costs.
- **Do not auto-adjust menu prices for seasonality.** Surface the data; let the chef decide.

#### Cross-Utilization

- Using trim, byproducts, or surplus from one recipe in another (brisket trim into staff meal, shrimp shells into bisque, vegetable scraps into stock).
- Effectively lowers real food cost below theoretical.
- The system does not currently track cross-utilization. Define the concept; implement when inventory/waste tracking exists.
- **Do not fabricate cross-utilization savings.** If the system can't measure it, it doesn't display it.

---

## Part 2: Data Model Extensions

### New Fields (on existing tables/settings)

No new tables. These are configuration fields on the chef's pricing settings.

```
chef_pricing_settings (existing or new JSON column on chefs table):
  - target_food_cost_pct: integer (default 30, range 15-60)
  - q_factor_pct: integer (default 7, range 0-15)
  - q_factor_enabled: boolean (default true)
  - default_profit_margin_pct: integer (default 20, range 5-80)
  - operation_type: enum ('fine_dining', 'casual', 'private_chef', 'catering', 'high_volume', 'food_truck', 'ghost_kitchen', 'bakery', 'meal_prep', 'restaurant', 'institutional', 'popup', 'wholesale_cpg', 'custom')
  - prime_cost_warning_threshold_pct: integer (default 65)
  - food_cost_warning_threshold_pct: integer (default 45)
```

### Static Reference Data

All exhaustive lookup tables (unit conversions, ingredient densities, yield factors, portion standards, operator-specific cost lines, seasonal availability, dietary cost multipliers, scaling factors, cross-utilization map, common pack sizes) are defined in `docs/food-costing-reference-data.md`. That file is the canonical source for `lib/costing/knowledge.ts`.

The reference data file contains:

- **9 sections** of structured lookup tables
- **150+ ingredient yield factors** (trim and cooking, with combined yield examples)
- **60+ ingredient density values** (volume-to-weight)
- **70+ count-to-weight conversions** (produce, proteins, herbs)
- **Portion standards** by course (plated, tasting, buffet), by service style (7 styles), by demographic (12 adjustments), by protein type
- **Operator-specific cost lines** for 10 operator types plus universal cost lines
- **Seasonal availability** for 50+ produce items and 15+ proteins, with holiday demand spikes
- **Dietary restriction cost multipliers** for 11 restriction types
- **Non-linear scaling factors** for 11 component types
- **Cross-utilization map** for 20+ primary products and their reuse pathways
- **Common pack sizes** for 30+ staple ingredients

### Operator-Specific Cost Line Schema

Each operator type has cost lines beyond Food + Labor + Overhead. The system must support capturing these in cost-plus calculations:

```typescript
interface OperatorCostLine {
  id: string
  label: string // user-visible name
  category:
    | 'food'
    | 'labor'
    | 'overhead'
    | 'incidental'
    | 'platform'
    | 'packaging'
    | 'logistics'
    | 'regulatory'
  amountCents: number
  frequency: 'per_event' | 'per_order' | 'per_unit' | 'monthly' | 'annual' | 'one_time'
  operatorTypes: OperatorType[] // which operator types this line applies to
  isDefault: boolean // pre-populated for this operator type
  notes?: string
}

type OperatorType =
  | 'fine_dining'
  | 'casual'
  | 'private_chef'
  | 'catering'
  | 'high_volume'
  | 'food_truck'
  | 'ghost_kitchen'
  | 'bakery'
  | 'meal_prep'
  | 'restaurant'
  | 'institutional'
  | 'popup'
  | 'wholesale_cpg'
  | 'custom'
```

When a chef selects their operation type, the system pre-populates relevant cost line templates (e.g., food truck gets commissary rental, generator fuel, vending permits; ghost kitchen gets platform commission, packaging per order). The chef fills in their actual numbers. Full cost line definitions per operator type are in `docs/food-costing-reference-data.md`, Section 4.

### Calculation Output Schema

Every costing calculation in the system must return this shape (or a subset of it):

```typescript
interface CostingResult {
  // Method 1 outputs
  totalIngredientCostCents: number // sum of all EP-adjusted ingredient costs + Q-factor
  foodCostPct: number // (ingredient cost / selling price) x 100
  suggestedPriceCents: number // ingredient cost / target food cost %
  contributionMarginCents: number // selling price - ingredient cost
  contributionMarginPct: number // margin / selling price x 100

  // Method 2 outputs (when applicable)
  laborCostCents: number | null // null if not a cost-plus calculation
  overheadCostCents: number | null
  incidentalsCostCents: number | null
  subtotalCostCents: number | null // food + labor + overhead + incidentals
  profitMarginPct: number | null
  costPlusPriceCents: number | null // subtotal x (1 + margin)

  // Prime cost (when labor is known)
  primeCostCents: number | null
  primeCostPct: number | null

  // Blended (menu-level only)
  blendedFoodCostPct: number | null // weighted average across items

  // Metadata
  method: 'food_cost_pct' | 'cost_plus' | 'blended'
  qFactorApplied: boolean
  qFactorPct: number
  ingredientCount: number
  ingredientsWithPrice: number
  ingredientsMissingPrice: number
  coverageRatio: number // ingredientsWithPrice / ingredientCount
  warnings: CostingWarning[]
}

interface CostingWarning {
  type:
    | 'high_food_cost'
    | 'critical_food_cost'
    | 'high_prime_cost'
    | 'low_coverage'
    | 'default_yield'
    | 'stale_price'
    | 'missing_price'
  message: string
  severity: 'info' | 'amber' | 'red'
  ingredientId?: string // for ingredient-specific warnings
}
```

---

## Part 3: Delivery Surface - Knowledge Layer Architecture

### Design Principle

The knowledge layer is a **read-only reference system**. It does not compute. It does not store user data. It explains what the system does and why. It is accessible to three audiences: users (in-app), developers (in specs), and AI agents (Remy, builder agents).

### Content Source

All knowledge content lives in one canonical file: `docs/food-costing-guide.md` (the user-facing operating guide, produced alongside this spec). This file is:

- The source of truth for all in-app help text, tooltips, and contextual guidance
- Written for food operators, not developers
- Maintained as a living document (same rules as USER_MANUAL.md)

### UI Entry Points

| Surface               | Trigger                                       | What Shows                                                                 | Component                             |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| Recipe costing view   | "?" icon next to food cost %                  | Popover: what food cost % means, target ranges, how to improve it          | `CostingHelpPopover`                  |
| Menu costing view     | "?" icon next to blended food cost            | Popover: what blended cost means, how courses subsidize each other         | `CostingHelpPopover`                  |
| Event pricing view    | "?" icon next to per-person price             | Popover: how per-person price is derived, Method 1 vs Method 2             | `CostingHelpPopover`                  |
| Quote builder         | "?" icon next to total                        | Popover: cost-plus breakdown explanation                                   | `CostingHelpPopover`                  |
| Pricing settings      | Inline guidance below each field              | What the setting controls, recommended ranges, consequences of changing it | Inline `<p>` elements                 |
| Chef pricing override | Tooltip on the override indicator             | "You set this price. System-calculated price was $X."                      | Existing override UI                  |
| Warning badges        | Click on any amber/red costing warning        | Drawer or popover explaining the warning and suggested actions             | `CostingWarningDetail`                |
| Knowledge base page   | `/settings/knowledge` or `/help/food-costing` | Full operating guide rendered as browsable sections                        | `FoodCostingGuidePage`                |
| Remy                  | User asks about food cost, pricing, margins   | Remy references the guide content to answer accurately                     | Remy action: `knowledge.food_costing` |

### Component Spec: `CostingHelpPopover`

A single reusable component that renders contextual help for any costing concept.

```typescript
interface CostingHelpPopoverProps {
  topic:
    | 'food_cost_pct'
    | 'blended_cost'
    | 'per_person'
    | 'cost_plus'
    | 'q_factor'
    | 'yield_factor'
    | 'prime_cost'
    | 'contribution_margin'
    | 'ap_ep'
  currentValue?: number // the actual number being displayed, for contextual guidance
  targetValue?: number // the chef's target, for comparison
  operationType?: string // chef's operation type, for relevant ranges
}
```

**Behavior:**

- Renders as a small "?" icon (muted, does not compete with primary data)
- On click: opens a popover with 2-4 sentences explaining the concept, the chef's current value in context, and one actionable suggestion if the value is outside target range
- Content is pulled from a static map keyed by `topic`, not fetched from a server
- No loading state needed (static content)

### Component Spec: `CostingWarningDetail`

Renders when a user clicks on a costing warning badge.

```typescript
interface CostingWarningDetailProps {
  warning: CostingWarning
  chefSettings: ChefPricingSettings
}
```

**Behavior:**

- Opens a small drawer or expanded section below the warning
- Shows: what the warning means, why it fired, what the chef can do about it
- Each warning type has a static content block (no AI generation needed)
- Includes a link to the relevant section of the full knowledge base page

### Remy Integration

Remy gains a new knowledge action: `knowledge.food_costing`

**Trigger:** User asks Remy anything about food cost, pricing methodology, margins, Q-factor, yield, AP/EP, or "how is this price calculated?"

**Behavior:**

- Remy does NOT generate an answer from its training data
- Remy reads from the canonical guide content (static lookup, same as CostingHelpPopover)
- Remy can contextualize with the chef's actual numbers: "Your current food cost on this menu is 34%. The target for private chef operations is 25-35%, so you're within range."
- Remy NEVER suggests changing prices. It explains methodology. Pricing decisions are the chef's.

### Permissions

- All knowledge layer content is visible to all authenticated users (chefs and clients)
- Clients see a simplified subset: "How is my quote calculated?" (does not expose chef's margins or cost structure)
- The full methodology (including margin targets, Q-factor, cost-plus breakdown) is chef-only
- No admin gating. This is not a premium feature.

---

## Edge Cases and Error Handling

| Scenario                                      | Correct Behavior                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef has no recipes costed yet                | Knowledge base page still accessible. Help popovers still work. Guide is useful even before first recipe.                                                      |
| Chef's food cost is 0% (no prices found)      | Do not show "0% food cost" as if it's real. Show "Costing incomplete: X of Y ingredients missing prices."                                                      |
| Chef sets Q-factor to 0%                      | Allow it. Show a one-time confirmation: "Setting Q-factor to 0% means incidental ingredients (oil, salt, seasonings) are not accounted for in your food cost." |
| Chef sets target food cost above 45%          | Allow it. Show advisory: "Most operations target 25-35%. A 48% food cost means $0.48 of every dollar goes to ingredients."                                     |
| Cost-plus calculation with $0 labor           | Allow it. Some chefs are solo and don't count their own labor. Flag as info, not error.                                                                        |
| Ingredient has no price in OpenClaw           | Already handled by auto-costing engine. Knowledge layer explains what "missing price" means and what the chef can do (manual override, wait for price update). |
| Remy asked about costing but chef has no data | Remy explains the methodology generically. Does not fabricate example numbers or "typical" costs.                                                              |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to a recipe with costed ingredients
3. Verify "?" help icon appears next to food cost percentage
4. Click it. Verify popover shows relevant explanation with the chef's actual number in context
5. Navigate to a menu with multiple courses
6. Verify blended food cost help is available
7. Navigate to pricing settings
8. Verify inline guidance appears below Q-factor, target food cost %, and profit margin fields
9. Navigate to the knowledge base page
10. Verify all sections render, no broken links, no placeholder text
11. Ask Remy "what is my food cost on this menu?"
12. Verify Remy answers from canonical content, not hallucinated methodology
13. Screenshot all surfaces

---

## Out of Scope

- **Inventory tracking and actual vs. theoretical variance** - defined conceptually here, built when inventory feature ships
- **Cross-utilization tracking** - defined conceptually, no implementation
- **Seasonal price trend indicators** - future enhancement on auto-costing engine
- **Client-facing cost breakdown** - clients see totals, not methodology. Separate spec if needed.
- **Competitive pricing intelligence** - "what do other chefs charge?" is a different system entirely

---

## Files to Create

| File                                            | Purpose                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `docs/food-costing-guide.md`                    | Canonical user-facing operating guide (produced)                                                       |
| `docs/food-costing-reference-data.md`           | Exhaustive lookup tables: conversions, yields, portions, operator cost lines, seasonal data (produced) |
| `lib/costing/knowledge.ts`                      | Static content map for all help popovers, warning explanations, and reference data                     |
| `lib/costing/operator-cost-lines.ts`            | Default cost line templates per operator type                                                          |
| `components/costing/costing-help-popover.tsx`   | Reusable contextual help popover                                                                       |
| `components/costing/costing-warning-detail.tsx` | Warning explanation drawer/section                                                                     |
| `app/(chef)/help/food-costing/page.tsx`         | Full knowledge base page (renders guide content)                                                       |

## Files to Modify

| File                                | What to Change                                        |
| ----------------------------------- | ----------------------------------------------------- |
| Recipe costing view (existing)      | Add `CostingHelpPopover` next to food cost % display  |
| Menu costing view (existing)        | Add `CostingHelpPopover` next to blended cost display |
| Event/quote pricing view (existing) | Add `CostingHelpPopover` next to per-person price     |
| Chef pricing settings page          | Add inline guidance text below configurable fields    |
| `lib/ai/remy-actions.ts`            | Add `knowledge.food_costing` action                   |
| `components/nav/nav-config.tsx`     | Add "Food Costing Guide" link under Help or Settings  |

## Database Changes

None. All configuration fields described above either already exist in the chef pricing override infrastructure or can be added as a JSON column extension. No new tables, no migrations.

---

## Notes for Builder Agent

- The auto-costing engine (`docs/specs/auto-costing-engine.md`) and chef pricing override infrastructure (`docs/specs/chef-pricing-override-infrastructure.md`) are both already built. Read both before starting. This spec builds ON TOP of them, not beside them.
- The `CostingResult` interface defined here should be reconciled with whatever the auto-costing engine currently returns. Extend, don't replace.
- All help content is STATIC. No server actions, no database queries, no AI generation for the knowledge layer itself. It's a content map in a TypeScript file.
- The user-facing guide (`docs/food-costing-guide.md`) is the canonical content source. The reference data file (`docs/food-costing-reference-data.md`) is the canonical data source. The TypeScript content map extracts from both. If they diverge, the docs win.
- The reference data file contains 150+ yield factors, 60+ density values, 70+ count-to-weight conversions, portion standards, operator cost lines, and seasonal data. This is a LOT of static data. Structure `lib/costing/knowledge.ts` as typed lookup maps, not inline strings.
- Operator-specific cost lines (`lib/costing/operator-cost-lines.ts`) should export a map keyed by `OperatorType`. When a chef selects their operation type in settings, the UI pre-populates relevant cost line templates they can fill in with their actual numbers.
- Follow the Universal Interface Philosophy: one primary action per screen, five mandatory states, cognitive load limits. The knowledge layer is supplementary; it must not compete with primary costing data for attention.
- No em dashes anywhere. No "OpenClaw" in any user-visible string.
