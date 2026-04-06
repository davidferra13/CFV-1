# Food Costing Guide

> **For:** Chefs, caterers, and food operators using ChefFlow
> **Last updated:** 2026-04-05
> **Canonical source:** This document is the single source of truth for food costing methodology in ChefFlow. All in-app help text, tooltips, and AI responses reference this guide.
> **Companion document:** `docs/food-costing-reference-data.md` contains all exhaustive lookup tables (conversions, yield factors, portions, operator cost lines, seasonal data).

---

## Part 1: What You Need Before You Can Cost Anything

Food costing is not a single formula. It's a chain. Every link has to be solid or the number at the end is wrong. This section covers every prerequisite, from the obvious to the overlooked.

### How Food Breaks Down

Every piece of food you serve exists in a hierarchy:

```
Menu
  Course (appetizer, entree, dessert...)
    Dish (what the guest sees by name)
      Component (the protein, the sauce, the starch, the garnish)
        Recipe (instructions to make that component)
          Ingredient (a specific item, exact quantity, specific unit)
```

You can't cost a menu without breaking it down to the ingredient level. A "pan-seared salmon with risotto and beurre blanc" is three recipes: salmon prep, risotto, sauce. Each has its own ingredient list, its own yield, its own cost.

**Key facts:**

- A recipe has a **yield** (how much it makes: "serves 8" or "makes 2 quarts")
- Every ingredient has an **exact quantity** and a **specific unit**. "Some garlic" can't be costed. "4 cloves garlic (20g)" can.
- Sub-recipes are normal. A vinaigrette is a recipe inside a salad recipe. The cost flows up.
- Batch recipes (stocks, sauces, spice blends) produce a large quantity. The cost is allocated per portion used. A 5-gallon chicken stock that costs $22 and yields 80 cups costs $0.275 per cup.
- The same recipe can appear in multiple dishes. Cost it once, reference it everywhere.

### What You Need to Know About Every Ingredient

For accurate costing, you need to know (or the system needs to know) these things about each ingredient:

- **What it costs** (current price per purchase unit)
- **What unit it's sold in** (per lb, per case, per each, per bunch)
- **What pack size** (a case of chicken breast is 40 lbs; a case of basil is 12 bunches)
- **Where you buy it** (broadline distributor, specialty, retail, direct farm)
- **What quality tier** (commodity, premium, organic, luxury; same ingredient can vary 2-10x)
- **How much waste it has** (yield factor: what percentage is actually servable)
- **How long it lasts** (shelf life determines whether buying in bulk makes sense)
- **What can replace it** (substitutions and their cost impact)
- **When it's available** (seasonal items may be unavailable or 2-3x more expensive off-season)

### Units and Conversions

Recipes use volume (cups, tablespoons). Suppliers sell by weight (pounds, cases). Costing requires consistency. You need to convert between them.

**The critical thing to understand:** a cup of flour does not weigh the same as a cup of sugar. Volume-to-weight conversion depends on the ingredient's density. This is why professional recipes are written in grams. Home-cook recipes use cups. The system must handle both.

Common conversions you'll use constantly:

- 1 lb = 16 oz = 453.59 g
- 1 cup = 8 fl oz = 236.59 mL
- 1 gallon = 4 quarts = 16 cups
- 1 tbsp = 3 tsp
- 1 kg = 2.205 lbs

For complete conversion tables and ingredient density data, see the companion reference document.

### AP vs. EP (As Purchased vs. Edible Portion)

**AP** is what you buy. **EP** is what you serve.

You buy 10 lbs of beef brisket. After trimming fat, removing the deckle, and accounting for cooking shrinkage, you serve 6.5 lbs. That's a yield factor of 0.65 (65%).

**Why it matters:** If brisket costs $5/lb, most people think their meat costs $5/lb. It actually costs $5 / 0.65 = **$7.69/lb** just for trim loss. Add cooking shrinkage (55% yield when smoked) and your true cost is $5 / (0.78 x 0.55) = **$11.66/lb**. That difference between $5 and $11.66 is where operators bleed money without knowing why.

```
True Cost Per Serving = Purchase Price / (Trim Yield x Cooking Yield)
```

ChefFlow tracks yield factors per ingredient. If your numbers feel off, check your yields first. The reference data document has yield factors for 150+ common ingredients.

### Q-Factor (The Small Stuff)

Some ingredients are impractical to cost individually: oil in the pan, salt, pepper, a squeeze of lemon, butter for tossing pasta, flour for dusting.

The Q-factor is a blanket percentage added to direct ingredient cost. Industry standard: **5-10%.** ChefFlow defaults to **7%.**

```
Adjusted Cost = Direct Ingredient Cost x 1.07
```

On one dish, 7% is a few cents. Across 200 covers, it's the difference between $0 and $84 in unaccounted costs.

### Portion Standards

You need to know how much food goes on each plate. Portions vary by course, service style, and context.

**Standard plated dinner:**

- Protein entree: 5-8 oz cooked weight
- Starch: 4-6 oz cooked
- Vegetable: 3-4 oz
- Soup: 6-8 oz (cup) or 10-12 oz (bowl)
- Dessert: 4-6 oz
- Bread: 1.5-2 oz per person
- Butter: 0.5-1 oz per person

**Tasting menu:** Each course is 40-60% of standard size, but there are 5-12 courses. Total food per person often exceeds a standard 3-course meal.

**Buffet:** Increase total food by 25-40% over plated. You must keep trays looking full. Plan 1.5x of popular items.

**Passed hors d'oeuvres:** 8-12 pieces per person per hour (first hour), 4-6 per hour after. Minimum 3-4 varieties.

**Adjustments by context:** Children eat 50-60% of adult portions. Outdoor summer events need less heavy protein, more light items. Heavy drinking events need 15-20% more food overall. Late-night events (after 9 PM) need 15-20% less since most guests have eaten earlier.

Full portion tables and demographic adjustments are in the reference data document.

### What's on Hand

You can't cost accurately if you don't know what you already have. Inventory awareness means:

- What's in the walk-in, dry storage, and freezer right now
- What's going to expire before you can use it (sunk cost)
- What overlaps between events this week (buy once, use twice)
- Whether buying the case makes sense (cheaper per lb) or if you'll waste half of it

### Menu Architecture

How you structure a menu directly affects cost:

- **Course count:** A 3-course dinner and a 7-course tasting have different total food volumes
- **Options per course:** Each additional option increases prep, waste, and cost. Without pre-orders, prep 45-50% of guest count per option.
- **Balance:** Not every course needs to hit food cost target. Some courses subsidize others (this is menu engineering; covered in Part 2)

### Scaling

Recipes don't always scale linearly:

- **Salt, seasoning, leavening, aromatics:** Scale to 75-90% when doubling. Exact doubling usually oversalts or over-leavens.
- **Fats for sauteing:** Constrained by pan capacity. You need more pans, not more oil.
- **Cooking time:** Does not scale proportionally with batch size.
- **Buffer:** Add 5-10% for plated events, 15-25% for buffet.

### Dietary Restrictions Change Cost

Every restriction has a cost impact:

- **Gluten-free:** +10-25% (GF ingredients cost 2-4x conventional)
- **Dairy-free:** +5-15% (plant-based dairy alternatives)
- **Kosher:** +15-40% (certified meat is 1.5-2.5x)
- **Organic:** +30-100% (varies wildly by ingredient)
- **Multiple restrictions stack.** GF + dairy-free + organic can reach 1.5-2.5x baseline.

### Seasonal Pricing

Produce and seafood prices swing 40-60% between peak and off-season. A fixed menu price with floating ingredient costs means your margin changes every month. Key rules:

- Peak season = lowest price, best quality
- Off-season = imported, more expensive, often inferior
- Holiday demand spikes are predictable (turkey in November, beef tenderloin in December, lobster on Valentine's Day)
- Review pricing quarterly at minimum

### Cross-Utilization

Using trim, byproducts, or surplus from one recipe in another lowers your effective food cost:

- Protein trim becomes ground meat, stock, staff meal
- Vegetable trim becomes stock
- Day-old bread becomes breadcrumbs, croutons, bread pudding
- Shrimp shells become bisque
- Citrus peels become zest, candied peel, oleo saccharum
- Rendered fats (bacon, duck) become cooking fats

Consistent cross-utilization recovers 3-8 percentage points on food cost.

### Equipment and Capacity

What you can cook is limited by what you have:

- **Oven capacity** determines batch size (2 sheet pans in a home oven, 5-10 in commercial convection)
- **Burner count** determines simultaneous components
- **Refrigeration** determines how far in advance you can prep
- **Transport** determines what fits in the vehicle at safe temperature
- **Rental equipment** is a real cost line: $8-25 per chafing dish, $0.50-1.50 per plate/glass, $8-15 per linen

### Labor and Timing

Food cost is only one piece. Labor is the other major variable:

- **Prep time is not cook time.** A 3-hour braise needs 45 minutes of active prep.
- **Skill level affects speed.** A 10-year chef preps 2-3x faster than a culinary school graduate.
- **Technique affects cost.** Brunoise (fine dice) takes 3-4x longer than rough chop. A dish requiring extensive hand-work costs more in labor.
- **Day-of vs. advance:** Sauces, marinades, and mise en place done 1-3 days ahead reduce day-of labor pressure.

### Food Safety Costs

Not directly on the plate, but real expenses:

- Hot-holding equipment (chafing dishes, heat lamps)
- Cold-holding (ice, coolers) for transport
- Allergen management may require separate prep tools
- ServSafe certification is required in most jurisdictions
- Transport time counts against the 2-hour danger zone window

### Know Your Own Numbers

Beyond ingredients and recipes, you need:

- **Your hourly labor rate** (what you pay yourself and staff, including taxes)
- **Your overhead rate** (monthly fixed costs / monthly jobs)
- **Your target food cost %** (your standard, not just the industry average)
- **Your target profit margin** (what you want to take home after all costs)
- **Your operation type** (this determines which benchmarks apply)
- **Your market** (what clients in your area will pay)
- **Your breakeven point** (minimum revenue to cover fixed costs)

---

## Part 2: The Two Methods

With all prerequisites in place, there are two methods for turning ingredient cost into a selling price. Most operators use both.

### Method 1: Food Cost Percentage (Top-Down)

The industry standard. Set a target for how much of your selling price goes to ingredients.

**The formula:**

```
Food Cost % = (Ingredient Cost / Selling Price) x 100
Selling Price = Ingredient Cost / Target Food Cost %
```

**Target ranges:**

| Operation Type            | Target Range |
| ------------------------- | ------------ |
| Fine dining               | 28-32%       |
| Casual dining             | 30-35%       |
| Private chef              | 25-35%       |
| Catering / events         | 28-35%       |
| High volume / fast casual | 28-32%       |
| Food truck                | 28-35%       |
| Ghost kitchen / delivery  | 30-35%       |
| Bakery                    | 25-35%       |
| Meal prep                 | 30-38%       |

**30% is the default.** For every dollar the client pays, 30 cents goes to ingredients, 70 cents covers everything else.

**The quick multiplier:**

| Target % | Multiply Ingredient Cost By |
| -------- | --------------------------- |
| 25%      | 4.00                        |
| 28%      | 3.57                        |
| 30%      | 3.33                        |
| 32%      | 3.13                        |
| 35%      | 2.86                        |

**Example:** $6 in ingredients at 30% target = $6 x 3.33 = $20 selling price.

**When to use this method:**

- Pricing individual dishes or recipes
- Setting per-person rates for events
- Quick sanity checks on any menu
- Comparing your pricing to industry benchmarks

### Method 2: Cost-Plus Buildup (Bottom-Up)

Accounts for everything, not just ingredients. Sum every cost, then add profit.

**The formula:**

```
Price = (Food + Labor + Overhead + Incidentals) x (1 + Profit Margin)
```

**The line items:**

| Line          | What It Covers                                                |
| ------------- | ------------------------------------------------------------- |
| Food          | Total ingredient cost (AP/EP adjusted, Q-factor applied)      |
| Labor         | All hours: prep, cook, service, cleanup, travel, shopping     |
| Overhead      | Allocated fixed costs: kitchen, insurance, equipment, vehicle |
| Incidentals   | Per-job: travel, parking, rentals, disposables, fuel, ice     |
| Profit margin | What you keep. Default 20%.                                   |

**Example:**

| Line                      | Amount      |
| ------------------------- | ----------- |
| Food (8 guests, $12/head) | $96         |
| Labor (6 hours at $35/hr) | $210        |
| Overhead allocation       | $45         |
| Travel + parking          | $30         |
| Disposables               | $15         |
| **Subtotal**              | **$396**    |
| Profit margin (20%)       | $79.20      |
| **Client price**          | **$475.20** |

Per person: $59.40. Compare to Method 1 alone: $96 / 0.30 = $320 ($40/person). Method 1 underprices this job by $155 because it ignores 6 hours of labor and $90 in overhead and travel.

**When to use this method:**

- Custom event proposals
- Private chef engagements (every job is different)
- Jobs with significant labor, travel, or equipment
- When you need to justify pricing to a client with a transparent breakdown

**Operator-specific cost lines** vary by business type. A food truck has commissary rental and generator fuel. A ghost kitchen has platform commissions. A caterer has linen and equipment rental. Full cost line tables for every operator type are in the reference data document.

### Using Both Methods Together

Smart operators use food cost percentage for quick mental math and benchmarking, and cost-plus for actual proposals and profitability tracking. They are not competing methods. They are complementary lenses.

- Use Method 1 to sanity-check: "Is my food cost in range?"
- Use Method 2 to set the real price: "Does this job actually make money after all costs?"

---

## Part 3: Advanced Concepts

### Prime Cost (Food + Labor)

Food cost alone is half the picture.

```
Prime Cost % = (Food Cost + Labor Cost) / Revenue x 100
```

**Target: 55-65% of revenue.**

A dish with 28% food cost and 42% labor cost has a 70% prime cost. That operation is losing money regardless of how good the food cost percentage looks. Watch prime cost, not just food cost.

### Contribution Margin

The dollar complement to food cost percentage.

| Item         | Price | Food Cost | Food Cost % | Contribution |
| ------------ | ----- | --------- | ----------- | ------------ |
| Wagyu steak  | $65   | $28       | 43%         | **$37**      |
| Caesar salad | $14   | $2.80     | 20%         | **$11.20**   |

The steak fails on percentage but puts 3.3x more dollars in your pocket per order. Both views matter. ChefFlow shows both.

### Menu Engineering (Blended Food Cost)

No menu is priced dish by dish in isolation. The **weighted average** across all items is what matters.

```
Blended Food Cost % = Sum(item_cost x quantity_sold) / Sum(item_price x quantity_sold) x 100
```

You can run a 40% food cost appetizer because your 18% dessert pulls the blend to 30%. Tasting menus and multi-course events are built this way: some courses subsidize others.

### Theoretical vs. Actual Variance

**Theoretical** = what cost should be (recipe cards x covers sold).
**Actual** = what cost is (purchases adjusted for inventory change).

The gap is where money disappears: over-portioning, waste, spoilage, theft, unrecorded comps.

**Target: less than 2 percentage points.**

If theoretical is 30% and actual is 34%, you're leaking 4 cents on every dollar. On $10,000/month, that's $400.

_This metric requires inventory tracking (future ChefFlow feature). When live, this is where you'll find it._

### Value-Based Pricing

Everything above gives you the **floor** (minimum to cover costs and make margin). Your **ceiling** is what the market will pay.

A private dinner for two with a personal chef, custom menu, and wine pairings isn't priced at 3.3x ingredient cost. The experience, exclusivity, and convenience command a premium.

**Use cost-based pricing to know your minimum. Use your judgment and market knowledge to set the actual price.** ChefFlow gives you the floor. You decide how high to go.

---

## Part 4: Operator-Specific Guidance

### Private Chef

Your biggest variable costs after food are **labor (your time)** and **travel**. Method 2 (cost-plus) is essential because every job has different logistics. Don't underprice your time. If you spend 2 hours shopping, 4 hours cooking, and 1 hour cleaning, that's 7 hours of labor. At $40/hr, that's $280 in labor alone before you count a single ingredient.

### Caterer / Event Production

You operate at scale, but every event is custom. Cost-plus is your primary method. Your rental line (equipment, linen, china) can be $500-2,000 per event. Staff costs (servers, bartenders at $25-45/hr each) can exceed food cost on service-heavy events. Always cost the event as a whole; individual dish food cost percentages are secondary to the overall job P&L.

### Food Truck

Your unique costs: commissary rental ($500-2,000/month), generator fuel ($15-40/day), vending permits ($25-500/day), and packaging ($0.50-1.50 per order). Speed is your advantage; your menu should be tight (8-12 items) and optimized for fast execution. Waste from a broad menu kills margin faster than ingredient cost.

### Ghost Kitchen / Delivery

Platform commissions (15-30%) are your dominant non-food cost. On a $25 order with 30% food cost ($7.50) and 25% commission ($6.25), you're already at 55% before labor or overhead. Engineer your menu for items that travel well, prep fast, and have high contribution margin. Packaging ($0.75-2.50 per order) adds up at volume.

### Bakery

Oven time is your bottleneck, not burners. Batch scheduling (proof, bake, cool, decorate) drives labor allocation. Decoration labor on custom work (wedding cakes: 8-20 hours) is often the largest cost line. Packaging is a real material cost ($0.25-3.00 per item). Waste rate on unsold perishables (5-15% of daily production) must be factored into your average cost per sold unit, not per produced unit.

### Meal Prep / Subscription

Cost per meal plan, not per plate. A 5-meal plan at $75 needs to hit margin across the mix. Your unique costs: containers ($0.30-1.00 each), labels, insulated shipping ($1.50-4.00 per delivery), and cold chain. Shelf life drives your production schedule: everything is batched, labeled, and dated. Menu rotation reduces ingredient overlap if you're not careful.

### Restaurant

Beverage margins (18-35% cost) often subsidize food margins. Table turn rate affects revenue per seat per hour, which determines how thin your food margin can run. A fast-casual turning tables every 30 minutes can live on 35% food cost. A fine-dining spot with 2-hour seatings needs 28% or tighter. Comps and voids (1-3% of revenue) are food cost with zero revenue return. Menu size directly correlates with waste: a 40-item menu means more ingredients on hand and more spoilage.

### Institutional (Schools, Hospitals, Corporate)

Per-meal budgets may be externally set (federal reimbursement caps, administration budgets). Ingredient cost fluctuation risk falls on you when contracts lock pricing for 6-12 months. Nutritional compliance is mandatory and constrains your menu. Commodity programs (USDA) offset some costs but add administration. Waste tracking is formalized and feeds directly into variance analysis.

### Pop-Up / Temporary

Every cost is concentrated into one event. There's no amortization across months like a restaurant. Venue, permits, transport, setup, and breakdown are all one-time charges this event must absorb. Budget conservatively. A pop-up that breaks even is a success; profitability comes from repeat pop-ups where you've dialed in the model.

### Wholesale / CPG

Ingredient cost at industrial scale drops 30-60% versus retail. But new cost lines appear: co-packing fees ($5,000-50,000 per run), packaging design, freight, slotting fees ($5,000-25,000 per retail chain per SKU), broker commissions (5-10%), and spoilage/returns (2-8% of shipped product). Your margin math is completely different from foodservice.

---

## Part 5: Using ChefFlow for Costing

### How to Cost a Recipe

1. **Enter your recipe** with ingredients, quantities, and units
2. **ChefFlow auto-costs** each ingredient using current market prices
3. **Yield factors** adjust for waste automatically (review them if numbers feel off)
4. **Q-factor** adds incidental ingredient costs (7% by default, configurable)
5. **Divide by portions** to get per-serving cost
6. **Review food cost %** against your target

If any ingredient is missing a price, ChefFlow tells you which ones and why. It never substitutes a fake number.

### How to Price an Event

1. **Build your menu** (courses, dishes, portions per guest)
2. **ChefFlow calculates blended food cost** across all courses
3. **Add labor** if using cost-plus (hours x rate for each role)
4. **Add overhead and incidentals** as applicable
5. **Set your margin** (or let the default apply)
6. **Review per-person price** and adjust as needed

The system shows both the formula-driven price and your override (if you set one). You always control the final number.

---

## Part 6: Common Mistakes

**Costing AP weight instead of EP weight.** You think 10 lbs at $5/lb = $5/lb on the plate. After trim and cooking, it's $11.66/lb. This single error can put food cost 5-8 points higher than you think.

**Ignoring Q-factor.** "It's just salt and oil." Over a month of service, those items add 5-10% to ingredient spend.

**Pricing by feel instead of formula.** "That feels like a $45 dish" might be right. Or you might be losing money on every plate. Do the math first, then adjust.

**Watching food cost but ignoring labor.** A 28% food cost with 50% labor cost is a 78% prime cost. The business doesn't work.

**Copying competitor prices.** Their cost structure is different. Their $35/head might be profitable for them and a loss for you.

**Flat pricing across seasons.** Produce and seafood swing 40-60%. A fixed menu price with moving ingredient costs means your margin is a moving target.

**Not accounting for service style.** Buffet requires 25-40% more food than plated. Family style 15-25% more. Pricing for plated portions and serving buffet is a guaranteed margin loss.

**Over-extending the menu.** Every additional dish option requires its own prep, its own ingredients, and increases waste. A focused menu is a profitable menu.

**Forgetting non-food costs on custom events.** Travel, parking, rentals, disposables, and shopping time are real costs. Method 1 alone can't capture them. Use Method 2 for custom work.

---

## Glossary

| Term                      | Definition                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **AP (As Purchased)**     | Weight or quantity as you buy it, including waste                                             |
| **EP (Edible Portion)**   | Weight or quantity that ends up on the plate                                                  |
| **Yield Factor**          | EP weight / AP weight. Decimal between 0 and 1.                                               |
| **Trim Yield**            | Percentage remaining after fabrication (peeling, cutting, deboning)                           |
| **Cooking Yield**         | Percentage remaining after applying heat (shrinkage, evaporation, fat render)                 |
| **Combined Yield**        | Trim yield x cooking yield. The true usable percentage from purchase to plate.                |
| **Q-Factor**              | Percentage surcharge for incidental ingredients (oil, salt, seasonings). Default 7%.          |
| **Food Cost %**           | Ingredient cost as a percentage of selling price                                              |
| **Cost-Plus**             | Pricing method summing all costs (food, labor, overhead, extras) plus profit margin           |
| **Prime Cost**            | Food cost + labor cost, as a percentage of revenue. Target 55-65%.                            |
| **Contribution Margin**   | Selling price minus food cost, in dollars                                                     |
| **Blended Food Cost**     | Weighted average food cost % across a full menu or event                                      |
| **Menu Engineering**      | Pricing items as a portfolio so the overall blend hits target, even if individual items don't |
| **Theoretical Food Cost** | What food cost should be based on recipe cards and covers sold                                |
| **Actual Food Cost**      | What food cost is based on purchases and inventory change                                     |
| **Variance**              | Gap between theoretical and actual food cost. Target: under 2 points.                         |
| **Value-Based Pricing**   | Setting price based on perceived value, above the cost-based floor                            |
| **Par Level**             | Minimum quantity of a staple to keep on hand                                                  |
| **FIFO**                  | First In, First Out. Use oldest inventory first.                                              |
| **Cross-Utilization**     | Using trim, byproducts, or surplus from one recipe in another                                 |
| **Pack Size**             | The unit a supplier sells in (per lb, per case, per #10 can)                                  |
| **Broadline Distributor** | Large-scale supplier (Sysco, US Foods) with wide selection and delivery minimums              |
| **#10 Can**               | Institutional-size can, approximately 6.5 lbs / 3 quarts                                      |
| **IQF**                   | Individually Quick Frozen. Each piece frozen separately for easy portioning.                  |
| **Mise en Place**         | Everything in its place. All ingredients prepped, measured, and ready before cooking begins.  |
