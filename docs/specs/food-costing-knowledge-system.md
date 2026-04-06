# Spec: Food Costing Knowledge System

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** `auto-costing-engine.md` (verified), `chef-pricing-override-infrastructure.md` (built)
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event         | Date             | Agent/Session   | Commit |
| ------------- | ---------------- | --------------- | ------ |
| Created       | 2026-04-05 21:00 | planner session |        |
| Status: ready | 2026-04-05 21:00 | planner session |        |
| Status: built | 2026-04-05       | builder session |        |

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
Trim Yield Factor = EP Weight / AP Weight (decimal, 0 < yield <= 1.0)
Cooking Yield Factor = Cooked Weight / Raw Weight (decimal, > 0; CAN exceed 1.0 for items that absorb water)
Combined Yield = Trim Yield x Cooking Yield
```

- **AP** = what you buy (includes bones, trim, skin, stems, waste)
- **EP** = what you serve (usable portion after loss)
- Every ingredient in the system has a `yield_factor` field. Default is `1.0` (no waste). A yield factor of `0.65` means 35% waste.
- **Trim yield** is always <= 1.0 (you cannot gain edible matter by trimming).
- **Cooking yield** CAN exceed 1.0 for starches and grains that absorb water during cooking: rice (2.0-3.0x), pasta (1.8-2.2x), dried beans (2.0-2.5x), oatmeal (3.0-4.0x). This is critical for accurate portioning and cost-per-serving calculations.
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

#### Waste and Spoilage (Pre-Service Loss)

- Distinct from yield factors (prep/cooking loss). Spoilage = product that expires, rots, or gets damaged before use.
- Typical rates: 1-3% (private chef) to 5-15% (bakery). See reference data Section 11 for full table.
- Spoilage cost is spread across sold units: `Effective Cost = Total Production Cost / Units Sold`
- A dish with 30% recipe food cost and 8% spoilage rate has a 33% effective food cost.
- **System behavior:** Spoilage tracking is a future feature (requires inventory). Define the concept now. Do not display spoilage-adjusted numbers until tracking is live.

#### Non-Revenue Food (Comp, Staff Meal, Tasting, R&D)

- Food prepared but not sold: staff meals (1-3% of food cost), comps (1-3%), client tastings (0.5-2%), R&D (1-3%).
- Total non-revenue food budget: 2-6% of food cost. Default assumption: 3%.
- This is a cost-plus line item or an overhead percentage, not a recipe-level adjustment.
- **System behavior:** Surface as an optional cost-plus line called "Non-Revenue Food" with a default of 3% of food cost. Chef-configurable.

#### Beverage Costing

- Beverages have separate cost targets from food: liquor 15-22%, wine 25-40%, beer 20-30%, non-alcoholic 10-20%.
- Beverage-specific yield: ice displacement (25-33% of glass), pour count (17 standard pours per 750 mL), spillage (1-2%).
- The blended food + beverage cost is what matters for overall profitability.
- **System behavior:** Beverage costing is a future module. Define methodology now. When built, beverage cost is tracked separately from food cost and displayed alongside it, never blended silently.
- See reference data Section 10 for full beverage cost tables, yield data, and event planning guides.

#### Batch Allocation

- Shared recipes (stocks, sauces, spice blends) must be costed per usable portion: `Batch Cost Per Unit = Total Cost / Total Yield Units`
- Shared pantry staples (olive oil, butter) under $10 are covered by Q-Factor.
- Shared recipes over $10 should be explicitly allocated per recipe that uses them.
- **System behavior:** Sub-recipes already cost per portion in the auto-costing engine. This definition formalizes the methodology for the knowledge layer.

#### Minimum Order Waste (Case-Break Problem)

- When minimum purchase exceeds what a job needs, the surplus may spoil.
- If surplus will be used within shelf life, cost only what is used per recipe.
- If surplus will spoil, charge the full purchase to the triggering job.
- **System behavior:** Informational concept for the knowledge layer. No automated tracking.

#### Purchasing Strategy Impact on Food Cost

- Same ingredient can vary 30-50% across purchasing channels (broadline vs. cash-and-carry vs. retail).
- Delivery fees ($25-75 per drop) add 5-25% to small orders.
- Volume discounts (30-60% savings) only make sense if you'll use the product before quality degrades.
- **System behavior:** Informational. The price engine uses whatever price is in the database. The knowledge layer educates operators on why their numbers might differ from expectations.
- See reference data Section 13 for vendor comparison tables and delivery fee impact.

#### Taxes on Ingredient Purchases

- Raw ingredients for resale are typically tax-exempt (with resale certificate) in most US states.
- Without a resale cert, 5-10% sales tax directly inflates food cost.
- **System behavior:** Informational only. Tax calculations are outside the costing engine scope. The knowledge layer educates operators.
- See reference data Section 17 for exemption tables and cost impact.

#### Re-Costing Frequency

- Recipe costs drift as ingredient prices change. Re-costing frequency depends on operation type.
- Private chef/caterer: per event. Restaurant/bakery: monthly. Institutional: quarterly.
- Triggers for immediate re-cost: supplier price increase, vendor change, seasonal shift, yield correction.
- **System behavior:** Future enhancement: flag recipes that haven't been re-costed in X days based on operation type. Define now, build when price history has enough data.
- See reference data Section 14 for frequency table by operation type.

#### Breakeven Analysis

```
Breakeven Units = Fixed Costs / (Revenue Per Unit - Variable Cost Per Unit)
```

- Every operator needs to know their minimum viable volume before food cost targets matter.
- **System behavior:** Informational concept for the knowledge layer and cost-plus calculator. Not a computed metric (requires fixed cost input that isn't in the system yet).
- See reference data Section 16 for breakeven templates by operation type.

#### Inflation and Price Escalation

- Year-over-year food commodity inflation (3-8% annually in recent years) erodes margins on fixed-price menus and contracts.
- Escalation clauses in contracts protect against inflation risk on locked pricing.
- **System behavior:** The price engine uses current prices. The knowledge layer educates operators about re-costing discipline and contract escalation clauses.

#### Contract vs. One-Off Pricing

- Recurring clients have different economics: lower per-visit overhead, less waste from ingredient overlap, consolidated shopping.
- One-off events must absorb full setup, teardown, and sourcing costs.
- **System behavior:** Informational. The cost-plus calculator already supports different line items per event. The knowledge layer explains when and why to adjust.

#### Menu Pricing Psychology

- Not a formula. A set of behavioral principles affecting achievable price.
- Charm pricing, anchoring, decoy pricing, removing dollar signs.
- **System behavior:** Informational only. Included in the knowledge base page and Remy's repertoire. Never auto-applied.

#### Deposit and Payment Timing

- Cash flow affects purchasing power, which affects achievable quality at a food cost target.
- 50% deposit on booking enables premium ingredient purchasing. Net-30 invoicing requires personal float.
- **System behavior:** Informational only. Deposit policy is already configurable in event/quote settings.

#### Inventory Costing Method

- The system uses **most recent price** for recipe costing (not FIFO, LIFO, or weighted average). This is a recipe-level theoretical cost, not a period-level accounting cost.
- When inventory tracking ships, the system will support FIFO for actual food cost calculations: oldest inventory is assumed consumed first.
- **COGS (Cost of Goods Sold)** is a period-level accounting figure: `Beginning Inventory + Purchases - Ending Inventory = COGS`. ChefFlow's recipe-level food cost is a projection; COGS is the accounting reality. These are related but not identical. The knowledge layer explains both.

#### Job Costing vs. Period Costing

- **Job costing** allocates costs to specific events/orders. Used by: private chefs, caterers, pop-ups. ChefFlow's cost-plus calculator is a job costing tool.
- **Period costing** allocates costs to time periods (weekly, monthly). Used by: restaurants, bakeries, institutional. Monthly food cost % is a period costing metric.
- Some operations use both: a caterer tracks per-event profitability (job) AND monthly P&L (period).
- The knowledge layer explains both methods so operators understand how ChefFlow's per-event numbers connect to their monthly financials.

#### Shrink (Inventory Loss)

- Shrink is the difference between theoretical inventory (what should be on hand) and actual inventory (what is). Industry average: 2-5% of food cost.
- Four sources: internal theft (75% of total in foodservice), external theft, administrative errors (most common once measured), and unrecorded waste.
- Shrink differs from waste: waste is measured and documented; shrink is the unexplained gap after waste is accounted for.
- **System behavior:** Informational concept. Requires inventory tracking to measure. Define now. The knowledge layer educates operators on benchmarks (Section 21 of reference data), investigation methodology, and cost impact. Do not display shrink metrics until inventory tracking is live.

#### Menu Engineering Matrix (Stars/Plowhorses/Puzzles/Dogs)

- Every menu item is classified by two axes: popularity (sales mix %) and profitability (contribution margin per item).
- Four quadrants: **Stars** (high both, protect), **Plowhorses** (popular but low margin, re-engineer), **Puzzles** (profitable but unpopular, promote), **Dogs** (low both, remove).
- Popularity threshold: 70% of fair share (100% / number of items x 70%). Profitability threshold: weighted average contribution margin.
- **System behavior:** Future enhancement. When POS/sales mix data is available, the system can classify items automatically. Define the methodology now. The knowledge layer teaches the framework. See reference data Section 22 for classification rules, worked examples, and analysis frequency.

#### Prep Production Planning (Par Levels, Prep Sheets, Batch Sizing)

- Par levels define minimum on-hand quantities: `Par = Average Daily Usage x Days Between Deliveries x Safety Factor (1.2-1.5)`.
- Prep sheets translate par levels into daily production tasks: item, par, on-hand, to-prep, shelf life, priority.
- Batch sizing matches equipment capacity and shelf life constraints. Over-prepping is unplanned food cost.
- **System behavior:** Informational concept for the knowledge layer. Requires sales forecasting + inventory to automate. The knowledge layer provides par level formulas, shelf life tables, and the cost connection (every prep item links to a costed recipe card).

#### Vendor Price Tracking

- Focus on top 20 ingredients by spend (typically 60-80% of total food cost). Track weekly: vendor, item, pack size, unit price, vs. last week, vs. 90-day average.
- Price alert triggers: +3-5% single item (monitor), +5-10% (get quotes), +10%+ (switch or substitute), +3%+ across 5+ items (review all recipes).
- Switching vendors requires evaluating minimums, delivery schedule, quality, payment terms, and reliability, not just price.
- **System behavior:** The OpenClaw price database already tracks historical prices with timestamps. Future enhancement: surface price trend indicators and alert operators when key ingredient prices exceed thresholds. Define methodology now.

#### Equipment Impact on Yield

- Cooking equipment significantly affects yield: sous vide (90-95% protein yield) vs. convection oven (70-80%) vs. smoking (60-70%). Same product, same temp, 30-40% cost difference from equipment alone.
- When a kitchen changes cooking equipment, all affected recipe cards must have their yield factors updated.
- **System behavior:** Informational. The knowledge layer educates operators on equipment-yield relationships. See reference data Section 23 for yield tables by equipment type and protein, vegetable yield tables, effective cost calculators, and equipment upgrade ROI formulas.
- **Builder note:** Yield factors in recipe cards are entered by operators (or defaulted from reference data). The system does not infer equipment type. But the knowledge layer and help text should surface equipment-yield relationships so operators set accurate yield factors.

#### Cross-Utilization Scoring

- Beyond byproduct recovery (already defined in Cross-Utilization above), ingredient overlap scoring measures how many menu items share each ingredient.
- Overlap Score = (# dishes using ingredient / total menu items) x 100. Target: 70%+ of ingredients at 15%+ overlap.
- High overlap = volume purchasing power + low waste + prep efficiency. Low overlap (single-dish ingredients) = waste risk.
- Financial impact: consistent cross-utilization reduces food cost 3-8 percentage points.
- Byproduct recovery value: `Adjusted Primary Cost = Original Cost - Recovery Value of Byproducts`.
- **System behavior:** Future enhancement when recipe-ingredient relationships are queryable at menu level. The knowledge layer teaches the framework now. See reference data Section 9 (existing cross-utilization map) and the Guide for scoring methodology.

#### Actual vs. Theoretical Reconciliation

- The most important financial report in food cost management. Extends the Theoretical vs. Actual Variance concept above.
- Reconciliation is not just measuring the gap; it is explaining the gap source by source: portioning, receiving, waste, POS errors, inventory errors, then unexplained (shrink).
- Variance thresholds: 0-1 pt (normal), 1-2 pts (monitor), 2-3 pts (investigate), 3-5 pts (escalate), 5+ pts (critical).
- Frequency: monthly for standing-inventory operations (restaurants, bakeries), per-event for job-costed operations (private chefs, caterers).
- **System behavior:** Requires inventory tracking to implement. Define the reconciliation framework, investigation methodology, and reporting template now. The knowledge layer and help text teach operators how to do this manually until automated. See reference data Section 24 for variance thresholds, source magnitude tables, worksheet template, and trend interpretation.

---

## Part 1b: Calculation Precision Rules

These rules prevent rounding errors, floating-point bugs, and reproducibility failures. They are mandatory for any code that computes costs.

### Order of Operations

For every recipe cost calculation, follow this exact sequence:

1. Look up each ingredient's price per unit (cents, integer from database)
2. Convert to price per recipe unit (using conversion factors, full float precision)
3. Multiply by recipe quantity (full float precision)
4. Divide by yield factor (full float precision; guard against zero)
5. Sum all ingredient costs (full float precision)
6. Apply Q-factor: `adjusted = sum * (1 + qFactorPct / 100)` (full float precision)
7. Round ONCE to nearest cent: `Math.round(adjusted)` (half-up rounding)
8. Divide by portion count for per-serving cost (full float precision, then round once)

### Precision Rules

- **Intermediate calculations:** Full JavaScript `number` (float64) precision. Never round intermediate values.
- **Final per-ingredient cost:** Round to nearest cent (`Math.round`) only when storing or displaying.
- **Percentage displays:** Round to one decimal place (e.g., 32.4%, not 32.3846%).
- **Yield factor multiplication:** Always multiply trim and cooking yields together first, then divide once. Never apply sequentially with intermediate rounding.
- **Q-factor application:** Apply AFTER summing all ingredient costs, not per-ingredient.
- **Conversion factors:** Use the exact values from `docs/food-costing-reference-data.md` Section 1. Export as named constants in `lib/costing/knowledge.ts`.

### Unit Conversion Engine

- **Canonical base units:** grams (weight), milliliters (volume), "each" (count).
- **Valid conversion paths:**
  - Weight-to-weight: always valid (direct factor lookup)
  - Volume-to-weight: requires ingredient density lookup (Section 1c)
  - Count-to-weight: requires count-to-weight entry (Section 1d)
  - Volume-to-count: requires both density AND count-to-weight entries
- **Missing conversion:** Return a `missing_conversion` warning, never zero or null silently.
- **Chain depth limit:** Maximum 3 conversion steps. Flag conversions that chain 3+ steps as "estimated" in the UI.

### Floating-Point Guards

- `yield_factor === 0` produces `Infinity`. Guard: reject at validation (see Input Validation below).
- `portion_count === 0` produces `Infinity`. Guard: reject at validation.
- Circular sub-recipe references produce infinite loops. Guard: cycle detection before computation (maintain a visited-recipe set during recursive costing).

### Input Validation Rules

Every costing input must pass validation before entering the calculation pipeline. Invalid inputs are rejected with a specific error message, never silently clamped.

| Field                  | Valid Range     | Notes                                                                         |
| ---------------------- | --------------- | ----------------------------------------------------------------------------- |
| `price_per_unit_cents` | >= 0            | Zero is valid (foraged, donated, comped). Negative is never valid.            |
| `trim_yield_factor`    | > 0 and <= 1.0  | You cannot gain edible matter by trimming.                                    |
| `cooking_yield_factor` | > 0             | CAN exceed 1.0 (rice, pasta, beans absorb water). Flag > 4.0 as likely error. |
| `combined_yield`       | > 0             | Product of trim and cooking yields.                                           |
| `q_factor_pct`         | >= 0 and <= 100 | Recommended range 3-15%, but validation allows 0-100.                         |
| `quantity`             | > 0             | Zero or negative quantities are always invalid.                               |
| `portion_count`        | >= 1            | Must be a positive integer.                                                   |
| `profit_margin_pct`    | >= 0 and < 100  | 100% margin is mathematically valid but flagged as likely error.              |
| `target_food_cost_pct` | > 0 and <= 100  | 0% target is meaningless (free food).                                         |

### Historical Cost Snapshots

- **Event/quote costs are snapshot at quote creation time.** Re-costing a recipe updates the recipe template but does NOT retroactively change existing quotes or events.
- The `CostingResult` should include a `computedAt: string` (ISO timestamp) field.
- Historical event reports always show the cost as it was when the quote was created, not current prices.
- If a chef explicitly re-costs an event, the snapshot is replaced and the old snapshot is logged.

### Localization Scope

- **V1 targets the US market.** Currency is USD. Unit system defaults to US customary with metric conversion available.
- Currency is stored as integer minor units (cents). If localization ships, storage becomes `(amount_minor_units: number, currency_code: string)`.
- Seasonal availability data (Section 5) is North American temperate. Conversion factors (Section 1) are universal except fluid ounces and cups (US-specific volume measures).
- Localization (metric-primary UI, non-USD currencies, non-US tax rules) is a future enhancement, not V1 scope.

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

- **24 sections** of structured lookup tables
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
- **Beverage costing data** (18 beverage categories with targets, yield reference, ice displacement, event planning guides)
- **Waste and spoilage rates** by operation type (12 types) and ingredient category (15 categories)
- **Non-revenue food allowances** (5 categories with percentage ranges)
- **Purchasing strategy reference** (vendor channel comparison, delivery fee impact, volume discount breakdowns)
- **Re-costing frequency** by operation type (11 types with triggers)
- **Presentation and garnish costs** (12 items with per-plate cost calculations, 4 service levels)
- **Breakeven analysis templates** (formulas, 8 operation types, contribution margin reference)
- **Tax reference** (sales tax exemptions, resale certificate cost impact at 5 spend levels)

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

  // Snapshot metadata
  computedAt: string // ISO timestamp of when this result was calculated
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
    | 'high_spoilage_risk'
    | 'no_recost_recent'
    | 'case_break_waste'
    | 'no_resale_cert'
    | 'high_garnish_cost'
    | 'beverage_cost_missing'
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
    | 'spoilage'
    | 'non_revenue_food'
    | 'beverage_cost'
    | 'batch_allocation'
    | 'breakeven'
    | 'purchasing_strategy'
    | 'garnish_cost'
    | 'recosting_frequency'
    | 'inflation_escalation'
    | 'case_break'
    | 'tax_exemption'
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
| Chef asks about beverage costing              | Knowledge layer explains beverage cost methodology. Does not compute beverage costs (future module). Shows targets and methodology from the guide.             |
| Chef has high spoilage but no tracking        | Knowledge layer explains spoilage concept, provides rate benchmarks by operation type. Does not display spoilage-adjusted numbers until tracking exists.       |
| Chef asks about breakeven                     | Knowledge layer explains the formula and provides benchmarks by operation type. Does not compute (requires fixed cost input not yet in system).                |
| Chef asks about resale certificate            | Knowledge layer explains tax exemption and cost impact. Informational only; tax is outside costing engine scope.                                               |
| Chef asks about retainer vs. one-off pricing  | Knowledge layer explains different economics. Does not auto-adjust pricing. Chef controls all pricing decisions.                                               |
| Recipe hasn't been re-costed in 90+ days      | Surface "info" hint: "This recipe was last costed X days ago. Ingredient prices may have changed." Not a block.                                                |
| Zero-cost ingredient (foraged, donated)       | Include in ingredient count and coverage ratio. Q-factor applies to $0 (still $0). Do not flag as "missing price."                                             |
| All ingredients missing prices                | `totalIngredientCostCents` = 0. `foodCostPct` = null (not 0%). Show "Costing incomplete" state. Do not compute suggested price.                                |
| Negative price (vendor credit/return)         | Reject at validation. Credits are accounting adjustments, not ingredient prices. They do not flow through the recipe costing engine.                           |
| Recipe with zero yield (division by zero)     | Reject at validation before any calculation. Surface error: "Recipe yield cannot be zero."                                                                     |
| Circular sub-recipe (A -> B -> A)             | Detect cycle before computation. Surface error: "Circular recipe reference detected." Do not attempt to compute.                                               |
| Cooking yield > 1.0 (rice, pasta, beans)      | Allow it. Correct behavior (water absorption). Surface info if > 4.0: "Cooking yield above 400% is unusual. Please verify."                                    |
| Very large menu (1000+ items)                 | Batch computation with progress indicator. Use `resolvePricesBatch` (never N+1 individual lookups). Target: < 5 seconds for 1000 items.                        |
| Payment processing fees on event total        | Not a food cost. Belongs in cost-plus as an overhead or separate line item. Reduces effective revenue, which raises actual food cost %.                        |

---

## Golden Test Cases

These are exact-output test cases for verifying costing math. All values are deterministic. Use these as automated regression tests.

### Test 1: Simple Single Ingredient

- Input: 1 ingredient, price = 500 cents/lb, quantity = 0.5 lb, yield = 1.0, Q-factor = 0%, portions = 1
- Expected: `totalIngredientCostCents = 250`, `foodCostPct` at $8.33 selling price (30% target) = 30.0%
- `suggestedPriceCents = 833` (250 / 0.30 = 833.33, rounded to 833)

### Test 2: Yield Factor Applied

- Input: 1 ingredient, price = 500 cents/lb, quantity = 6 oz (0.375 lb), trim yield = 0.78, cooking yield = 1.0, Q-factor = 0%, portions = 1
- Calculation: `(500 * 0.375) / 0.78 = 240.384...`
- Expected: `totalIngredientCostCents = 240` (Math.round)

### Test 3: Combined Yield (Trim + Cooking)

- Input: 1 ingredient, price = 800 cents/lb, quantity = 8 oz (0.5 lb), trim yield = 0.78, cooking yield = 0.55, Q-factor = 0%, portions = 1
- Calculation: combined yield = `0.78 * 0.55 = 0.429`, cost = `(800 * 0.5) / 0.429 = 932.400...`
- Expected: `totalIngredientCostCents = 932`

### Test 4: Q-Factor Applied

- Input: 3 ingredients totaling 1200 cents raw cost, Q-factor = 7%, portions = 1
- Calculation: `1200 * 1.07 = 1284`
- Expected: `totalIngredientCostCents = 1284`, `qFactorApplied = true`

### Test 5: Cooking Yield > 1.0 (Rice)

- Input: rice, price = 150 cents/lb, quantity = 1 lb dry, trim yield = 1.0, cooking yield = 2.5, Q-factor = 0%, portions = 4
- Calculation: cost of 1 lb = 150. Yield factor = 2.5 (you get 2.5 lb cooked from 1 lb dry). Cost per lb cooked = `150 / 2.5 = 60`. Per portion (4 portions from 2.5 lb cooked) = `150 / 4 = 37.5`
- Expected: `totalIngredientCostCents = 150` (total recipe), per-serving = 38 cents (Math.round(37.5))
- Note: for rice/pasta, cooking yield affects portion planning, not cost-per-AP-unit. The 1 lb of dry rice still costs 150 cents regardless of how much water it absorbs.

### Test 6: Blended Menu Cost

- Input: 3 items. Item A: cost 300c, price 1000c, qty 20. Item B: cost 500c, price 1200c, qty 15. Item C: cost 200c, price 800c, qty 10.
- Calculation: `(300*20 + 500*15 + 200*10) / (1000*20 + 1200*15 + 800*10) = (6000+7500+2000) / (20000+18000+8000) = 15500/46000 = 0.33695...`
- Expected: `blendedFoodCostPct = 33.7%`

### Test 7: Sub-Recipe Costing

- Input: Recipe B makes 80 cups at total cost 2200 cents. Recipe A uses 2 cups of Recipe B.
- Calculation: cost of 2 cups = `2200 / 80 * 2 = 55`
- Expected: Sub-recipe ingredient contributes 55 cents to Recipe A's total cost.

### Property-Based Test Rules

These are invariants that must hold for ANY valid input:

1. If all ingredients have prices > 0 and quantities > 0, then `totalIngredientCostCents > 0`
2. `foodCostPct` is always between 0 and 100 when both cost and selling price are positive
3. Adding an ingredient with price > 0 never decreases `totalIngredientCostCents`
4. `ingredientsWithPrice + ingredientsMissingPrice = ingredientCount`
5. `coverageRatio = ingredientsWithPrice / ingredientCount` (always 0 to 1)
6. Enabling Q-factor always increases total cost (when Q > 0 and base cost > 0)
7. Reducing yield factor always increases per-unit cost (when base cost > 0)

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

- **Inventory tracking and actual vs. theoretical variance** - defined conceptually here (including reconciliation framework, variance thresholds, and investigation methodology), built when inventory feature ships
- **Cross-utilization tracking and scoring** - defined conceptually (including overlap scoring, byproduct recovery valuation), no implementation until recipe-menu relationships are queryable
- **Menu engineering matrix automation** - defined conceptually (Stars/Plowhorses/Puzzles/Dogs classification), built when POS/sales mix data is available
- **Prep production planning automation** - defined conceptually (par levels, prep sheets, batch sizing), built when sales forecasting and inventory exist
- **Vendor price alerting** - defined conceptually (threshold triggers, switching criteria), built when price history has enough data points
- **Shrink measurement and reporting** - defined conceptually (investigation methodology, benchmarks), built when inventory tracking ships
- **Seasonal price trend indicators** - future enhancement on auto-costing engine
- **Client-facing cost breakdown** - clients see totals, not methodology. Separate spec if needed.
- **Competitive pricing intelligence** - "what do other chefs charge?" is a different system entirely
- **Localization** - V1 is US market only (USD, US customary units, US tax rules). Metric-primary UI and non-USD currencies are future enhancements
- **POS integration** - POS sales data feeding into actual food cost is a future integration, not V1 scope
- **Accounting software export** - direct export to QuickBooks/Xero chart of accounts is a future integration
- **Inventory management system integration** - consuming inventory counts from external systems is future scope
- **Recipe import from other platforms** - structured import from ChefTec, Meez, CostBrain, etc. is future scope

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
- The reference data file contains 24 sections: 150+ yield factors, 60+ density values, 70+ count-to-weight conversions, portion standards, operator cost lines, seasonal data, beverage costing (targets, yields, ice displacement, event planning), waste/spoilage rates (by operation type and ingredient category), non-revenue food allowances, purchasing strategy (vendor channels, delivery fees, volume discounts), re-costing frequency, presentation/garnish costs, breakeven templates, tax reference (sales tax, income tax, prepared food), regulatory/compliance costs (permits, insurance, certifications), packaging cost reference (container types, eco-premiums), accounting/financial reporting reference (chart of accounts mapping, total cost structure benchmarks, portioning error impact, delivery platform commission impact), **shrink benchmarks** (rates by operation type, investigation priority matrix, cost impact tables), **menu engineering classification** (Stars/Plowhorses/Puzzles/Dogs matrix, thresholds, worked examples, analysis frequency), **equipment yield impact** (protein yield by cooking equipment, effective cost per usable pound, vegetable yield, upgrade ROI calculator), and **actual vs. theoretical variance** (threshold response table, common variance sources, reconciliation worksheet template, trend interpretation). This is a LOT of static data. Structure `lib/costing/knowledge.ts` as typed lookup maps, not inline strings.
- **Calculation precision is mandatory.** Read Part 1b (Calculation Precision Rules) before writing any costing math. Key rules: never round intermediate values, multiply yield factors together before dividing, apply Q-factor after summing, round once at the end with Math.round. Golden test cases (below Verification Steps) must pass as automated regression tests.
- **Cooking yield CAN exceed 1.0.** Rice, pasta, dried beans, and grains absorb water during cooking. A cooking yield of 2.5 (rice triples in weight) is valid and expected. Only trim yield is capped at 1.0. Do not reject or clamp cooking yields above 1.0.
- Operator-specific cost lines (`lib/costing/operator-cost-lines.ts`) should export a map keyed by `OperatorType`. When a chef selects their operation type in settings, the UI pre-populates relevant cost line templates they can fill in with their actual numbers.
- Follow the Universal Interface Philosophy: one primary action per screen, five mandatory states, cognitive load limits. The knowledge layer is supplementary; it must not compete with primary costing data for attention.
- No em dashes anywhere. No "OpenClaw" in any user-visible string.
