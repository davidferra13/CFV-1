# Food Costing Guide

> **For:** Chefs, caterers, and food operators using ChefFlow
> **Last updated:** 2026-04-05
> **Canonical source:** This document is the single source of truth for food costing methodology in ChefFlow. All in-app help text, tooltips, and AI responses reference this guide.
> **Companion document:** `docs/food-costing-reference-data.md` contains all exhaustive lookup tables (conversions, yield factors, portions, operator cost lines, seasonal data).

---

## Quick Start: Cost Your First Recipe in 5 Minutes

If you have never formally costed a dish before, start here. This walkthrough takes one recipe from ingredients to food cost percentage.

**Example: Pan-Seared Chicken Breast with Roasted Vegetables (serves 4)**

Step 1: List every ingredient with exact quantities.

| Ingredient                       | Quantity | Purchase Price | Purchase Unit |
| -------------------------------- | -------- | -------------- | ------------- |
| Boneless skinless chicken breast | 2 lbs    | $3.99          | per lb        |
| Olive oil                        | 2 tbsp   | $8.99          | per 500 mL    |
| Zucchini                         | 2 medium | $1.49          | each          |
| Bell pepper (red)                | 1 large  | $1.99          | each          |
| Garlic                           | 4 cloves | $0.50          | per head (10) |
| Salt                             | to taste | (Q-factor)     |               |
| Black pepper                     | to taste | (Q-factor)     |               |
| Butter                           | 2 tbsp   | $4.99          | per lb        |
| Lemon                            | 1        | $0.50          | each          |

Step 2: Calculate the cost of each ingredient used.

| Ingredient     | Calculation              | Cost       |
| -------------- | ------------------------ | ---------- |
| Chicken breast | 2 lbs x $3.99/lb         | $7.98      |
| Olive oil      | 29.6 mL / 500 mL x $8.99 | $0.53      |
| Zucchini       | 2 x $1.49                | $2.98      |
| Bell pepper    | 1 x $1.99                | $1.99      |
| Garlic         | 4/10 head x $0.50        | $0.20      |
| Butter         | 1 oz / 16 oz x $4.99     | $0.62      |
| Lemon          | 1 x $0.50                | $0.50      |
| **Subtotal**   |                          | **$14.80** |

**Step 3: Apply yield factor.** Chicken breast has ~10% trim loss (yield factor 0.90). True cost: $7.98 / 0.90 = $8.87. Adjusted subtotal: **$15.69**.

**Step 4: Apply Q-factor (7%).** This covers the salt, pepper, oil for the pan, and other small items. $15.69 x 1.07 = **$16.79** total recipe cost.

**Step 5: Calculate per-serving cost.** $16.79 / 4 servings = **$4.20 per plate**.

**Step 6: Calculate food cost percentage.** If you charge $14.00 per plate: $4.20 / $14.00 = **30% food cost**. That is within the target range for most operations (25-35%).

**What these numbers mean:**

- Below 25%: strong margins, but verify you are not under-portioning
- 25-35%: healthy range for most food operations
- 35-45%: workable for high-volume or value-focused operations
- Above 45%: review your pricing, portions, or ingredient sourcing

That is the entire process. The rest of this guide explains every component in depth, but this is the core loop: list ingredients, calculate costs, apply yield, apply Q-factor, divide by portions, compare to your selling price.

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

### Making Recipes Costable (Recipe Card Format)

Most operators have recipes that cannot be costed as-is. "Season to taste," "a drizzle of oil," and "some bread for service" are fine for cooking but useless for costing. To cost a recipe, it must be in this format:

A costing-ready recipe card has:

- **Recipe name** (exactly as it appears on your menu)
- **Yield** (total portions AND total weight or volume: "serves 8" AND "makes 3 lbs cooked")
- **Every ingredient** with: name, exact quantity, specific unit, and whether it is AP or EP weight
- **Sub-recipes** listed as ingredients with a quantity (e.g., "Beurre Blanc, 4 fl oz" rather than "sauce")
- **No vague quantities.** Replace "to taste" items with either a measured estimate or move them to Q-factor coverage

Common translations from vague to costable:

- "Season to taste" -> covered by Q-factor (no line item needed)
- "A drizzle of olive oil" -> "1 tbsp olive oil"
- "Some herbs for garnish" -> "0.25 oz fresh parsley" or covered by garnish/presentation cost
- "Bread for the table" -> "2 oz bread per person" (separate recipe or cost line)
- "2 chicken breasts" -> "1.5 lbs boneless skinless chicken breast (AP weight)"

If you are converting recipes from memory to paper for the first time: cook the recipe once while measuring everything. Write down actual quantities as you go. That single cook-through gives you a costable recipe card.

### Substitution Economics

When an ingredient is unavailable or poor quality, you substitute. Careless substitutions can double your cost on that ingredient without you noticing. Smart substitutions can cut cost while maintaining quality.

Before substituting, check three things:

1. **Same category?** Replacing butter with olive oil changes the dish. Replacing one olive oil brand with another does not.
2. **Similar yield?** If the substitute has a worse yield factor, the per-serving cost changes even if the purchase price is identical.
3. **Comparable cost per EP unit?** Compare the cost per usable ounce, not the price per package.

Decision rules:

- Cost difference under 10%, same yield, same category: substitute freely
- Cost difference 10-20%: proceed but note the cost impact
- Cost difference over 20% or different flavor profile: get the chef's approval before substituting
- No acceptable substitute at any cost: remove the item from service (86 it)

Emergency sourcing (running to the grocery store mid-shift) typically costs 20-50% more than wholesale. That premium is the real cost of poor inventory planning or missed order deadlines.

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

### Waste and Spoilage (Before Service)

Yield factors account for prep loss (trim, cooking shrinkage). Spoilage is a different category: product that expires, goes bad, or gets damaged before you ever use it.

**Spoilage is not the same as yield.** Yield is predictable and ingredient-specific. Spoilage is operational and depends on how you run your kitchen.

**Where spoilage comes from:**

- Perishables that expire before use (fresh herbs, dairy, seafood, berries)
- Produce that wilts, bruises, or rots in storage
- Proteins that pass use-by dates
- Mise en place prepped too far in advance
- Inventory that doesn't move because the menu changed
- Freezer burn on improperly stored items

**Typical spoilage rates by operation type:**

| Operation Type | Typical Spoilage | Why                                          |
| -------------- | ---------------- | -------------------------------------------- |
| Restaurant     | 4-10%            | Large menu = more unique ingredients on hand |
| Bakery         | 5-15%            | Unsold daily production (bread, pastries)    |
| Catering       | 2-5%             | Buy per event, less sitting inventory        |
| Private chef   | 1-3%             | Buy per job, small scale                     |
| Meal prep      | 3-7%             | Batch production, tight shelf life           |
| Food truck     | 3-8%             | Limited storage, weather-dependent demand    |
| Institutional  | 3-6%             | High volume, formal waste tracking           |
| Ghost kitchen  | 3-8%             | Demand unpredictable, perishable-heavy menus |

**How to account for it:** Spoilage cost must be spread across sold units, not absorbed as a lump loss. If you produce 100 meals and throw away 8, the cost of those 8 meals is distributed across the 92 you sold. Your effective per-unit cost is higher than your recipe card says.

```
Effective Cost Per Unit = Total Production Cost / Units Actually Sold
```

A focused menu with fewer unique ingredients reduces spoilage. Cross-utilization (using trim and surplus in other dishes) reduces it further. FIFO discipline (first in, first out) is the baseline defense.

### Beverage Costing

Beverages have their own costing methodology. If your operation serves drinks, ignoring beverage cost is the same as ignoring food cost on half your menu.

**Beverage cost targets (industry standard):**

| Category          | Target Cost % | Notes                                  |
| ----------------- | ------------- | -------------------------------------- |
| Liquor (well)     | 15-18%        | Highest margin in the building         |
| Liquor (premium)  | 18-22%        | Higher cost, but higher price too      |
| Cocktails         | 18-24%        | Depends on fresh ingredient load       |
| Wine (by glass)   | 25-35%        | Standard 3-4x bottle cost              |
| Wine (by bottle)  | 30-40%        | Lower markup than by-the-glass         |
| Beer (draft)      | 20-28%        | Keg yields ~124 pints (half-barrel)    |
| Beer (bottled)    | 25-30%        |                                        |
| Non-alcoholic     | 10-20%        | Soda syrup cost is nearly nothing      |
| Coffee / espresso | 12-20%        | Per-cup cost is very low at volume     |
| Fresh juice       | 25-35%        | High produce cost, low yield on citrus |

**Beverage-specific yield factors:**

- **Ice displacement:** A 12 oz glass with ice holds 8-9 oz of liquid. You're serving less than the glass size suggests.
- **Pour cost:** A standard pour is 1.5 oz (jigger). A 750 mL bottle yields approximately 17 standard pours. Free pouring without a jigger increases cost by 15-25%.
- **Spillage allowance:** Budget 1-2% of bar revenue for spillage, over-pours, and waste.
- **Wine by the glass:** A standard 750 mL bottle yields 5 glasses at 5 oz pour. If you pour 6 oz, you get 4.2 glasses per bottle.
- **Draft beer:** A half-barrel (15.5 gal) yields ~124 pints. Account for foam loss (5-10%) from dirty lines or improper temperature.
- **Fresh juice:** Citrus juice yield is 30-40% of fruit weight. A case of lemons for lemonade costs more per serving than most operators expect.

**The blended approach:** Restaurants often run beverage cost at 18-25% to subsidize food cost at 30-35%. The combined margin matters more than either number alone.

**For events with bar service:** Cost the bar package separately from the food package. An open bar at $25/person with a 20% beverage cost means $5/person in drink cost. A consumption bar (tab) is harder to predict; budget based on drink count per person per hour (1.5-2 drinks in the first hour, 1 per hour after).

### Comp, Staff Meal, Tasting, and R&D Costs

Food you prepare but don't sell to a paying customer is still food cost. Most operators forget to account for these categories:

**Staff meals:** Feeding your team is standard practice. A restaurant feeding 8 staff members one meal per shift at $3-5/person is $24-40/day, $720-1,200/month. That's real food cost with zero direct revenue. Budget 1-3% of food cost for staff meals.

**Comps (complimentary):** Sending out a free appetizer, comping a dissatisfied guest's meal, sending dessert to a VIP. Restaurants typically comp 1-3% of food revenue. Caterers and private chefs comp less (0.5-1%) but it still happens: a tasting plate for a potential client, an extra portion "just in case."

**Client tastings:** Private chefs and caterers routinely do tastings before booking. A full tasting for 2-4 people costs you $50-200 in food plus 3-6 hours of labor. If you book 60% of tastings, spread the cost of all tastings across booked events.

**R&D and recipe development:** Testing new dishes means buying ingredients for trials. Some attempts fail. A professional kitchen budgets 1-3% of food cost for R&D. If you're developing a new menu, the testing cost should be factored into the first season's pricing, not absorbed as a surprise loss.

**How to account for these:** Add a single line item called "non-revenue food" to your cost-plus calculations. Even a flat 2-4% surcharge on your food cost covers the gap. Alternatively, track these costs monthly and roll them into your overhead rate.

### Batch Allocation and Shared Ingredients

You make a 5-gallon batch of chicken stock. It costs $22 in ingredients and 4 hours of simmer time. Over the next week, that stock is used in risotto, soup, pan sauce, and a braise across 6 different events.

**The question:** How much of that $22 does each dish absorb?

**The method:** Cost per portion used.

```
Batch Cost Per Unit = Total Batch Cost / Total Yield in Usable Units
Per-Recipe Charge = Batch Cost Per Unit x Units Used in Recipe
```

**Example:** 5 gallons of stock = 80 cups. Total cost $22. Cost per cup = $0.275. A risotto recipe uses 4 cups of stock = $1.10 charged to that recipe.

**Shared pantry staples work the same way.** You buy a gallon of olive oil for $28. It's used across 30 recipes this week. Allocate cost per tablespoon ($28 / 256 tbsp per gallon = $0.11/tbsp). This is precise. If you'd rather not track this granularly, this is exactly what Q-factor covers (the blanket surcharge for small shared items).

**The rule of thumb:** Batch-cost any shared recipe that costs more than $10 total. For shared staples under $10, let Q-factor handle it.

### Minimum Order Waste (The Case-Break Problem)

You need 2 lbs of saffron threads for a special event. Your supplier only sells saffron in 1 oz containers at $12 each, and you need 1 oz. Fine, that's $12.

But now consider: you need 3 lbs of a specialty mushroom blend. Your distributor sells it in 5 lb cases at $45. You can't buy 3 lbs. You buy the case.

**The real cost of your 3 lbs is $45, not $27** (which is what $9/lb x 3 would be), unless you can use those remaining 2 lbs before they spoil.

This is the case-break problem. It shows up constantly:

- You need 6 eggs but the recipe calls for just yolks (6 whites are now waste unless cross-utilized)
- You need fresh thyme for one dish; the minimum purchase is a full bunch, and you use 20% of it
- You need 2 cans of coconut milk; the case of 12 costs half as much per can, but you have no use for the other 10

**How to handle it:**

1. If the surplus will be used within shelf life, cost only what you use
2. If the surplus will spoil or go to waste, charge the full purchase to the job that triggered it
3. If you can split the cost across multiple events that week, allocate proportionally
4. For events with unique specialty items, always charge the full minimum purchase to that event

### Plating and Presentation Costs

Edible garnishes and presentation elements are ingredients. They have a cost. Operators (especially in fine dining and catering) routinely forget to include them in recipe costing.

**Common presentation ingredients and their cost:**

| Item               | Typical Cost   | Usage                 |
| ------------------ | -------------- | --------------------- |
| Microgreens        | $25-40/lb      | 0.1-0.25 oz per plate |
| Edible flowers     | $15-30/pack    | 1-3 per plate         |
| Gold leaf          | $30-80/booklet | 1 sheet per plate     |
| Specialty sauces   | Varies         | 0.5-1 oz per plate    |
| Herb oil drizzle   | $2-5/batch     | 0.25 oz per plate     |
| Cocoa powder dust  | Negligible     | Q-factor territory    |
| Candied nuts       | $8-15/lb       | 0.5-1 oz per plate    |
| Truffle shavings   | $40-120/oz     | 0.1-0.2 oz per plate  |
| Balsamic reduction | $12-40/bottle  | 0.25 oz per plate     |

On a $12 plate cost, a garnish of microgreens ($0.10-0.25), edible flower ($0.30-0.50), and herb oil ($0.05) adds $0.45-0.80. That's 4-7% of plate cost from presentation alone. Over 100 covers, that's $45-80 you didn't account for if you only costed the "main" ingredients.

### Purchasing Strategy

Where and how you buy ingredients has a direct impact on food cost. The same chicken breast can vary 30-50% in price depending on your purchasing channel.

**Vendor comparison:**

| Channel                           | Typical Price Position | Delivery  | Minimum Order | Best For                     |
| --------------------------------- | ---------------------- | --------- | ------------- | ---------------------------- |
| Broadline (Sysco, US Foods)       | Baseline               | Yes       | $200-500      | Volume, consistency, range   |
| Specialty distributor             | +10-30%                | Yes       | $150-400      | Quality, unique items        |
| Cash-and-carry (Restaurant Depot) | -5-15% vs delivered    | No        | None          | No delivery fee, immediate   |
| Direct farm/ranch                 | Varies (+/- 20%)       | Sometimes | Varies        | Quality, story, relationship |
| Retail grocery                    | +20-50% vs wholesale   | No        | None          | Emergency, tiny quantities   |
| Online wholesale                  | -5-10% vs local        | Yes       | Varies        | Dry goods, shelf-stable      |

**Key purchasing principles:**

- **Delivery fees are hidden cost.** A $50 delivery fee on a $300 order adds 17% to your food cost. Consolidate orders to minimize drops per week.
- **Volume discounts matter at scale.** Buying a 50 lb bag of flour vs. 5 lb bags saves 40-60%. But only if you'll use it before quality degrades.
- **Contract pricing vs. spot pricing.** Locking a price for 3-6 months protects against spikes but locks you in if prices drop. Best for staples with predictable usage.
- **Payment terms affect cash flow.** Net-30 from a distributor means you can serve the food and collect payment before you pay for ingredients. Cash-and-carry means money out before money in.
- **Early-pay discounts.** Some distributors offer 1-2% discount for payment within 10 days. On $5,000/month in purchases, that's $50-100/month saved.
- **Group purchasing organizations (GPOs).** Institutional operators can access volume pricing through GPOs. Smaller operators may access similar pricing through buying groups or co-ops.

### Taxes on Ingredient Purchases

In most US states, raw ingredients purchased for resale are **tax-exempt** if you have a resale certificate (sales tax permit). This is significant: 5-10% sales tax on all ingredient purchases directly inflates food cost.

**What's typically exempt (with resale cert):**

- Raw ingredients that become part of a menu item sold to customers
- Beverages for resale
- Packaging that goes to the customer (containers, bags, wraps)

**What's typically taxable (even with resale cert):**

- Equipment and smallwares
- Cleaning supplies
- Paper goods used internally (not given to customers)
- Items consumed by staff (staff meals are complex; varies by state)

**If you don't have a resale certificate,** you're paying sales tax on every ingredient purchase. On $3,000/month in ingredients at 7% tax, that's $210/month ($2,520/year) in unnecessary cost. Getting a resale certificate is one of the fastest ways to lower food cost for a new operator.

**For catering and private chefs:** Many states require you to charge sales tax on prepared food sold to clients. This is a pass-through (the client pays it), but you must track it. It does not affect your food cost percentage (which is calculated on pre-tax revenue and pre-tax ingredient cost).

### How Often to Re-Cost

Recipe costs drift. Ingredient prices change, suppliers adjust packaging, yield factors shift with different product quality. A recipe costed in January may be 5-10% off by June.

**Re-costing frequency by operation type:**

| Operation Type | Recommended Frequency | Why                                                  |
| -------------- | --------------------- | ---------------------------------------------------- |
| Private chef   | Per event             | Every job has unique sourcing; re-cost each proposal |
| Caterer        | Per event             | Custom menus, seasonal ingredients, varying scale    |
| Restaurant     | Monthly               | Fixed menu, but prices drift; quarterly at minimum   |
| Bakery         | Monthly               | Flour, butter, eggs fluctuate; high-volume amplifies |
| Food truck     | Monthly               | Tight menu makes monthly review fast                 |
| Ghost kitchen  | Monthly               | Platform pricing must stay competitive               |
| Meal prep      | Weekly                | Tight margins, perishable-heavy, price-sensitive     |
| Institutional  | Quarterly             | Contract pricing buffers short-term swings           |
| Wholesale/CPG  | Per production run    | Batch economics change with ingredient lots          |

**Triggers for immediate re-costing (regardless of schedule):**

- Supplier sends a price increase notice
- You switch vendors for a key ingredient
- A seasonal ingredient enters or leaves peak season
- Your yield factor turns out to be wrong (actual waste higher than assumed)
- You change portion size or recipe formulation

### Know Your Own Numbers

Beyond ingredients and recipes, you need:

- **Your hourly labor rate** (what you pay yourself and staff, including taxes and benefits; see "Calculating Your True Labor Rate" below)
- **Your overhead rate** (monthly fixed costs / monthly jobs or monthly revenue)
- **Your target food cost %** (your standard, not just the industry average)
- **Your target profit margin** (what you want to take home after all costs)
- **Your operation type** (this determines which benchmarks apply)
- **Your market** (what clients in your area will pay)
- **Your breakeven point** (minimum revenue to cover fixed costs; see formula in Part 3)
- **Your spoilage rate** (what percentage of purchases you throw away before serving)
- **Your non-revenue food rate** (comp, staff meal, tasting, R&D as % of food cost)

### Calculating Your True Labor Rate

If you enter the wrong hourly rate into a cost-plus calculation, every job you price will be wrong. Most operators undercount their true labor cost.

**Solo operators (no employees):** Your "hourly rate" is not what you charge clients. It is your cost. Calculate it:

1. Start with what you need to earn per hour to meet your income target
2. Add self-employment tax (15.3% in the US): rate x 1.153
3. Add health insurance allocation: monthly premium / productive hours per month
4. Add retirement contribution: whatever you set aside per hour
5. Divide by productive hours ratio: you work 50 hrs/week but only 30-35 are billable (rest is admin, shopping, marketing, bookkeeping). If 65% of your hours are productive, divide by 0.65.

Example: a solo private chef who wants to earn $50/hr.

- After self-employment tax: $50 x 1.153 = $57.65
- Health insurance: $400/month / 140 productive hrs = $2.86/hr
- Retirement: $3/hr
- Total cost per productive hour: $63.51
- Adjusted for productive ratio (65%): $63.51 / 0.65 = **$97.71/hr true cost**

That $50/hr chef actually costs $97.71/hr to run. If they enter $50 in their cost-plus calculation, they are systematically underpricing every job by 49%.

**Operators with employees:** Your labor cost per employee is:

- Hourly wage
- Plus employer FICA (7.65%)
- Plus workers' compensation (3-8% for kitchen staff, higher for delivery drivers)
- Plus benefits (health, PTO, meal allowance)
- Plus non-productive time (training, cleaning, setup/breakdown)

A line cook at $18/hr with full burden typically costs $22-26/hr in actual employer cost.

### Receiving: Where Cost Leakage Starts

When product arrives at your door, that is the first point where actual food cost can diverge from theoretical. If you do not verify what you receive, you will overpay.

Receiving checklist:

- **Verify weight:** Spot-check protein cases on a scale. Frozen seafood includes ice glaze (10-15% of stated weight). Meat packaging includes soaker pads (2-5% of package weight). You are paying for product you cannot serve.
- **Check temperature:** Proteins below 40F, frozen below 0F. If product arrives above safe temperature, reject it. That is a food safety issue, not just cost.
- **Inspect quality:** Color, smell, packaging integrity. Poor quality product has lower yield (more trim waste), which raises your actual food cost even if the price per pound is correct.
- **Count case goods:** Verify the number of units matches the invoice. Short shipments are common.
- **Match invoice to order:** Compare the price on the invoice to the price you were quoted. Price discrepancies (market price items, substitutions, surcharges) happen regularly.

When something is wrong, document it and request a credit memo immediately. Do not accept short shipments and hope to sort it out later.

**Catch weight items** (proteins sold by actual weight, not fixed weight) are especially important to verify. If your recipe assumes 10 lb cases of chicken breast but the actual case weighs 9.3 lb, your food cost is 7.5% higher than calculated on every case.

### Portion Control: The Biggest Source of Variance

Having the right portion standards (covered in the Portion Standards section) is necessary but not sufficient. Those standards are theoretical until someone plates the food. Portion control is how you enforce them.

A cook who free-hands a 7 oz protein portion instead of weighing out 6 oz adds 17% to the protein cost on every plate. Over 100 covers at $8/portion protein cost, that is $136 in unplanned food cost per service.

Required portioning tools by station:

- **Proteins:** Digital scale (weigh every portion during prep, not during service)
- **Starches and sides:** Volume scoops (e.g., #8 scoop for 4 oz, #6 scoop for 5.3 oz)
- **Sauces and soups:** Ladles (2 oz, 4 oz, 6 oz, 8 oz)
- **Composed plates:** Ring molds or visual guides (photos of correctly plated dishes)

To identify portioning problems: weigh 5 random plates during service and compare to the recipe card spec. If plates consistently come in over spec, retrain the cook or adjust the recipe card to reflect the portion you actually want to serve (and reprice accordingly).

### Waste Tracking: Making the Invisible Visible

Waste has three distinct sources, each with different causes and solutions:

1. **Prep waste:** Trim loss during preparation. This is already accounted for by yield factors. If your actual trim waste exceeds the yield factor, the factor needs updating.
2. **Production waste:** Over-production (made too much), line mistakes (burned, dropped, wrong order), refires. This is not accounted for by yield factors. It is pure cost leakage.
3. **Post-service waste:** Unsold buffet food, expired mise en place, plate returns. This is the spoilage category.

To track waste, keep a waste log: date, item, quantity, reason (prep error, over-production, spoilage, refire, plate return), and estimated cost. Review weekly. Look for patterns: the same item, the same shift, the same cook. Patterns point to training needs or recipe adjustments, not just bad luck.

The goal is not zero waste (that is impossible). The goal is reducing waste from "invisible background noise" to a measured, managed number that you can improve over time.

### Shrink: The Gap Between Paper and Reality

Shrink is the difference between what your inventory records say you should have and what you actually have. It is the single largest unexplained cost in most food operations, averaging 2-5% of food cost industry-wide.

Shrink has four sources:

1. **Theft (internal).** Employee consumption without authorization, taking product home, over-portioning for friends and family. Industry estimates: 75% of inventory shrink in foodservice comes from internal sources.
2. **Theft (external).** Vendor short-deliveries, delivery driver pilferage, customer walkouts. Less common but harder to detect.
3. **Administrative error.** Receiving mistakes (accepted 9 cases, logged 10), POS entry errors (rang up wrong item), recipe card errors (card says 6 oz, actual portion is 8 oz). Often the largest single category once you start measuring.
4. **Unrecorded waste.** Product thrown away without logging it. A cook burns a steak, tosses it, fires a new one. The waste log shows nothing, but inventory is short one steak.

**How shrink differs from waste:** Waste is product you know about (trim, spoilage, over-production). Shrink is product that disappears without a documented reason. Waste is measured. Shrink is the gap between measured and actual.

**Measuring shrink:**

```text
Shrink % = (Theoretical Usage - Actual Usage) / Theoretical Usage x 100

Where:
  Theoretical Usage = Sum of (recipe card quantity x covers sold) for each item
  Actual Usage = Beginning Inventory + Purchases - Ending Inventory
```

**Shrink benchmarks by operation type:**

| Operation Type | Expected Shrink % | Notes                                                |
| -------------- | ----------------- | ---------------------------------------------------- |
| Fine dining    | 2-4%              | Tight controls, expensive product, high visibility   |
| Casual dining  | 3-6%              | Higher volume, more staff, more opportunities        |
| Quick service  | 2-5%              | Standardized portions, limited menu                  |
| Private chef   | 1-2%              | Solo operator, buy-per-job, minimal sitting stock    |
| Catering       | 2-4%              | Event-based purchasing limits exposure               |
| Food truck     | 2-5%              | Small team, limited storage, informal tracking       |
| Institutional  | 1-3%              | Formal inventory systems, regular audits             |
| Bakery         | 3-6%              | Sampling, broken items, weight variation in dough    |
| Bar/beverage   | 3-8%              | Over-pouring is the #1 source; free drinks for staff |

**When shrink exceeds your benchmark:** Investigate in this order: (1) check recipe cards against actual portions being served, (2) verify receiving accuracy against invoices, (3) review POS against kitchen tickets for entry errors, (4) then consider theft. Most "theft" turns out to be portioning or recording errors. Fix those first.

**Cost impact:** On $10,000/month food spend, 4% shrink is $400/month ($4,800/year) in product you paid for but cannot account for. Reducing shrink from 5% to 2% on that volume saves $3,600/year. This is money already spent; you are recovering it, not earning it.

### Equipment Impact on Yield

The yield factors in your recipe cards are not universal constants. They depend heavily on what equipment you use to cook the food. Two kitchens cooking the same protein at the same internal temperature can get dramatically different yields based on their cooking equipment.

**Protein yield by cooking method:**

| Equipment/Method       | Typical Yield (Protein) | Why                                                        |
| ---------------------- | ----------------------- | ---------------------------------------------------------- |
| Sous vide (water bath) | 90-95%                  | No evaporation, sealed bag retains all moisture            |
| Combi oven (steam+dry) | 85-92%                  | Controlled humidity reduces moisture loss                  |
| Convection oven        | 70-80%                  | Dry circulating heat drives significant moisture loss      |
| Standard oven          | 65-78%                  | Less even heat, longer cook times, more moisture loss      |
| Grill/broil            | 65-75%                  | High direct heat, fat render, flare-up charring            |
| Deep fry               | 75-85%                  | Quick cook preserves moisture; breading adds weight        |
| Pan sear               | 75-85%                  | Short cook time limits loss; finish in oven adds more loss |
| Braising               | 55-65%                  | Long cook, significant collagen breakdown and shrinkage    |
| Smoking (hot)          | 60-70%                  | Extended low heat, major moisture evaporation              |

**What this means for costing:** A 10 lb pork loin at $4.50/lb ($45.00) produces:

- **Sous vide (92% yield):** 9.2 lb usable = $4.89/lb effective cost
- **Convection oven (75% yield):** 7.5 lb usable = $6.00/lb effective cost
- **Smoking (65% yield):** 6.5 lb usable = $6.92/lb effective cost

The same product ranges from $4.89 to $6.92 per usable pound depending on how you cook it. That is a 41% cost difference from equipment choice alone.

**Vegetable yield by method:**

| Equipment/Method    | Typical Yield (Vegetables) | Notes                                     |
| ------------------- | -------------------------- | ----------------------------------------- |
| Steaming            | 90-95%                     | Minimal moisture loss                     |
| Combi oven (steam)  | 88-93%                     | Similar to steaming with better control   |
| Roasting (high dry) | 70-80%                     | Significant moisture loss, caramelization |
| Grilling            | 75-85%                     | Quick cook, some charring loss            |
| Sauteing            | 80-90%                     | Quick, moderate moisture loss             |
| Braising/stewing    | 75-85%                     | Long cook, but liquid retained in dish    |

**When to update yield factors:** If you change cooking equipment (bought a combi oven, switched from roasting to sous vide), update every recipe card that uses the affected method. A kitchen that upgrades from a standard oven to a combi oven on proteins can see a 10-15 percentage point yield improvement, which directly lowers food cost.

### Prep Production Planning: Connecting Cost to Daily Operations

Knowing what something costs is step one. Knowing how much to prepare today is what prevents that knowledge from being wasted. Over-production is money in the trash. Under-production is lost revenue and upset customers.

**Par levels:** The minimum quantity of a prepped item to have on hand at the start of service.

```text
Par Level = Average Daily Usage x Days Between Deliveries x Safety Factor

Where:
  Average Daily Usage = total used over period / number of service days
  Safety Factor = 1.2-1.5 (20-50% buffer depending on variability)
```

**Example:** You use an average of 8 lbs of diced onions per day. Deliveries come every 3 days. Safety factor 1.25 (moderate demand variability).

```text
Par = 8 lbs x 3 days x 1.25 = 30 lbs
```

If you have 12 lbs of diced onions on hand at start of day, your prep order is 30 - 12 = 18 lbs of onions to dice.

**Prep sheets:** The daily production list that translates par levels and forecasted demand into specific tasks.

A prep sheet for each station should include:

| Item              | Par    | On Hand | To Prep | Shelf Life | Priority |
| ----------------- | ------ | ------- | ------- | ---------- | -------- |
| Diced onions      | 30 lbs | 12 lbs  | 18 lbs  | 3 days     | High     |
| Chicken stock     | 4 gal  | 1 gal   | 3 gal   | 5 days     | High     |
| Vinaigrette       | 2 qt   | 0.5 qt  | 1.5 qt  | 7 days     | Medium   |
| Chocolate ganache | 3 lbs  | 3 lbs   | 0       | 5 days     | Skip     |

**Batch sizing:** When prepping, match batch sizes to your equipment capacity and shelf life:

- Do not prep 50 lbs of mirepoix if your largest container holds 30 lbs and it only lasts 4 days
- Do not make a half batch of stock if your pot holds a full batch at nearly the same labor cost
- Round up to equipment-efficient sizes (full sheet trays, full hotel pans, full pots)

**Shelf life of common prepped items (refrigerated):**

| Prepped Item           | Shelf Life | Storage Notes                        |
| ---------------------- | ---------- | ------------------------------------ |
| Cut/diced vegetables   | 2-3 days   | Covered, airtight, no standing water |
| Blanched vegetables    | 3-4 days   | Shocked in ice water, drained        |
| Cooked grains/pasta    | 3-5 days   | Cooled within 2 hours, covered       |
| Stocks and broths      | 5-7 days   | Rapid cool, labeled, date            |
| Vinaigrettes/dressings | 5-14 days  | Varies by acidity and dairy          |
| Marinades (no protein) | 5-7 days   | Discard if raw protein was added     |
| Prepped proteins (raw) | 1-2 days   | Portioned, wrapped, dated            |
| Cooked proteins        | 3-4 days   | Cooled within 2 hours, covered       |
| Sauces (cream-based)   | 3-5 days   | Dairy limits shelf life              |
| Sauces (stock-based)   | 5-7 days   | Cool rapidly, label, date            |
| Fresh herb oils        | 3-5 days   | Refrigerate immediately              |

**The cost connection:** Every item on a prep sheet has a costed recipe card. If your par level says "prep 18 lbs diced onions" and your recipe card says onions cost $0.89/lb with a 0.90 trim yield, you know that prep task costs $17.80 in product. If the cook preps 25 lbs instead (because the container was empty and "better safe than sorry"), that is $7.80 in unplanned food cost. Multiply that casual over-prepping across 10 items per day and you find $30-80/day in hidden costs.

### Vendor Price Tracking: Catching Cost Drift Before It Eats Your Margin

Ingredient prices change constantly. Without tracking, a 3% price increase on your top 10 ingredients can shift your food cost by a full percentage point before you notice. Most operators discover price increases 30-90 days after they start, through financial statements that are already reporting the damage.

**What to track:** Focus on your top 20 ingredients by spend. These typically represent 60-80% of total food cost. Tracking every ingredient is unnecessary; track the ones that matter.

**How to track:**

```text
Weekly price log (per key ingredient):
  Date | Vendor | Item | Pack Size | Unit Price | Price/lb or Price/oz | vs. Last Week | vs. 90-Day Avg
```

**Price alert triggers (when to take action):**

| Price Change         | Action                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| +3-5% single item    | Note it, monitor next week, check alternate vendor                       |
| +5-10% single item   | Get competing quotes, consider substitution                              |
| +10%+ single item    | Switch vendors or substitute immediately, re-cost recipes                |
| +3%+ across 5+ items | Broad market move; review all recipe costs, consider menu price increase |
| -10%+ single item    | Lock in price if possible (contract, forward buy)                        |

**When to switch vendors:** Price alone does not justify switching. Consider:

- **Minimum order requirements** (new vendor may require larger minimums)
- **Delivery schedule** (do they deliver on days you need?)
- **Quality consistency** (cheaper product with inconsistent yield costs more in the end)
- **Payment terms** (net 7 vs. net 30 affects cash flow)
- **Reliability** (late or missed deliveries cost more than a price difference)

**The rule:** switch if the price difference is 10%+ on a high-volume item AND the new vendor meets quality/reliability standards. For differences under 10%, the switching cost (new account setup, testing, relationship building) usually exceeds the savings.

**Seasonal price patterns to anticipate:**

Budget for these annual cycles rather than reacting to them:

- **Produce:** highest prices December-March (limited domestic supply), lowest June-October
- **Proteins:** beef peaks summer (grilling season demand), poultry peaks November-December (holidays), seafood varies by species
- **Dairy:** butter and cream peak November-December (holiday baking demand), lowest spring-summer
- **Eggs:** peak January-March (post-holiday recovery, lower lay rates), lowest summer

### Cross-Utilization Scoring: Measuring Ingredient Efficiency

The Cross-Utilization Map (Section 9 of Reference Data) shows what byproducts can become. But cross-utilization also works in the other direction: how many of your menu items share the same base ingredients? The more overlap, the less waste and the better your purchasing power.

**Ingredient overlap score:**

```text
Overlap Score = Number of Menu Items Using Ingredient / Total Menu Items x 100
```

An ingredient used in 8 out of 20 dishes has a 40% overlap score. High-overlap ingredients are your purchasing anchors: you can buy them in volume, negotiate better prices, and have near-zero waste because demand is consistent.

**Menu-level cross-utilization analysis:**

| Ingredient     | Used In (# dishes) | Overlap Score | Volume/Week | Purchasing Impact                            |
| -------------- | ------------------ | ------------- | ----------- | -------------------------------------------- |
| Chicken breast | 6 of 20            | 30%           | 40 lbs      | Case pricing, low waste                      |
| Mixed greens   | 8 of 20            | 40%           | 15 lbs      | High usage, moderate spoilage                |
| Olive oil      | 18 of 20           | 90%           | 3 gal       | Commodity buy, negligible waste              |
| Saffron        | 1 of 20            | 5%            | 0.5 oz      | Expensive, slow turnover, high spoilage risk |
| Heavy cream    | 7 of 20            | 35%           | 6 qt        | Good usage, manageable shelf life            |

**Target:** aim for 70%+ of your ingredients to have an overlap score above 15% (used in 3+ dishes on a 20-item menu). Ingredients with less than 5% overlap (used in only 1 dish) are waste risks and purchasing inefficiencies. Either find more uses for them or consider removing the dish that requires them.

**The financial impact:** Consistent cross-utilization reduces food cost by 3-8 percentage points through three mechanisms:

1. **Volume purchasing** - higher quantities of fewer ingredients unlock better pricing
2. **Waste reduction** - shared ingredients get used before they expire
3. **Prep efficiency** - one batch of diced onions serves multiple dishes (less labor)

**Byproduct recovery value:** When you actively use trim and byproducts (the Cross-Utilization Map), assign them a recovery value:

```text
Recovery Value = Byproduct Weight x Fair Market Value of Equivalent Product
Adjusted Primary Cost = Original Cost - Recovery Value

Example: Whole chicken ($2.50/lb, 4 lb bird = $10.00)
  Breast yield: 1.5 lb (primary product)
  Thigh/leg yield: 1.2 lb (secondary product, valued at $1.80/lb = $2.16)
  Carcass: 1.0 lb (stock, valued at $0.50/lb equivalent = $0.50)
  Trim/loss: 0.3 lb

  Adjusted breast cost = ($10.00 - $2.16 - $0.50) / 1.5 lb = $4.89/lb
  vs. buying breast alone: $4.50/lb (case) to $6.50/lb (retail)
```

Whole-animal fabrication often produces a lower effective cost per portion than buying individual cuts, if you have uses for every part.

### Actual vs. Theoretical Food Cost Reconciliation

This is the most important financial report in food cost management. Everything else in this guide builds toward this: can you explain the gap between what your food should have cost and what it actually did cost?

**The two numbers:**

```text
Theoretical Food Cost = Sum of (recipe cost per portion x portions sold) for all items
Actual Food Cost = Beginning Inventory + Purchases - Ending Inventory
```

Theoretical is what your recipe cards and POS say should have happened. Actual is what your bank account and shelves say did happen. The difference is variance.

**Variance formula:**

```text
Variance (%) = Actual Food Cost % - Theoretical Food Cost %
Variance ($) = Actual Food Cost ($) - Theoretical Food Cost ($)
```

**Variance thresholds and response:**

| Variance   | Assessment | Action Required                                                |
| ---------- | ---------- | -------------------------------------------------------------- |
| 0-1 point  | Excellent  | Normal operational tolerance. No action needed.                |
| 1-2 points | Acceptable | Monitor trends. Investigate if consistent across 3+ periods.   |
| 2-3 points | Warning    | Active investigation. Check portioning, receiving, waste log.  |
| 3-5 points | Problem    | Full audit: inventory accuracy, recipe cards, shrink analysis. |
| 5+ points  | Critical   | Stop and fix. Something is systematically wrong.               |

**Investigation framework (when variance exceeds 2 points):**

Work through these in order. Each step either explains the variance or eliminates a cause:

1. **Inventory accuracy.** Did you count correctly? Recount high-value items. Check unit conversions (did someone count cases when the system expects eaches?). This is the most common source of large variance and the easiest to fix.

2. **Recipe card accuracy.** Are recipe cards current? Weigh 5 random plates during service and compare to the card. If cooks are consistently portioning 8 oz when the card says 6 oz, the card is wrong or the cook needs retraining. Update the card to reflect reality, then reprice.

3. **POS accuracy.** Is the POS recording what is actually being served? Wrong buttons, missing modifiers (extra protein, double sauce), and unrecorded comps all create theoretical usage that is lower than actual. If the POS says you sold 50 steaks but the kitchen fired 55, you have 5 unrecorded covers.

4. **Waste.** Check the waste log. If no waste log exists, that is the problem. Start one. Unrecorded waste is invisible variance.

5. **Receiving.** Spot-check 5 deliveries against invoices. Count cases, weigh proteins, verify credits for shorts and returns. Vendor errors (intentional or not) create immediate variance.

6. **Shrink.** If steps 1-5 do not fully explain the gap, the remainder is shrink (theft, unrecorded consumption, administrative errors). See the Shrink section above.

**Reconciliation report format:**

```text
Period: [month]
Revenue: $XX,XXX

Theoretical food cost: $X,XXX (XX.X%)
Actual food cost:      $X,XXX (XX.X%)
Variance:              $XXX   (X.X points)

Variance explained:
  Portioning errors:   $XXX  (identified by plate weight checks)
  Receiving errors:    $XX   (invoice vs. actual delivery discrepancy)
  Unrecorded waste:    $XX   (estimated from waste log gaps)
  POS errors:          $XX   (comps, modifiers, wrong buttons)
  Inventory errors:    $XX   (recount corrections)
  Unexplained (shrink): $XX  (remainder after all identified sources)
```

**Frequency:** Run this reconciliation monthly for operations with standing inventory (restaurants, bakeries, institutional). For per-event operations (private chefs, caterers), run it per event or per week during busy seasons. The goal is not perfect accuracy on every line; it is identifying whether variance is trending up, and catching it before it compounds.

**The bridge to your P&L:** Your accountant's COGS number (from the P&L section above) IS your actual food cost. Your theoretical food cost comes from ChefFlow's recipe cards multiplied by covers sold. The reconciliation report is how you explain the difference between the two to yourself, your accountant, or your business partner.

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

### Breakeven Analysis

Before worrying about food cost targets, you need to know whether your operation can sustain itself at all.

```text
Breakeven Point (units) = Fixed Costs / (Revenue Per Unit - Variable Cost Per Unit)
Breakeven Point (revenue) = Fixed Costs / (1 - Variable Cost Ratio)
```

**Example:** A food truck with $4,500/month in fixed costs (commissary, insurance, vehicle, permits) and an average meal price of $14 with $5.60 in variable cost (food + packaging):

```text
$4,500 / ($14.00 - $5.60) = $4,500 / $8.40 = 536 meals/month = ~18 meals/day (30 days)
```

If you can't sell 18 meals a day, no food cost target will save you. Breakeven tells you the minimum viable volume before margins even matter.

### Inflation and Price Escalation

Seasonal pricing swings are one thing. Year-over-year commodity inflation is another. Food prices have risen 3-8% annually in recent years. A menu priced in January may be underpriced by June if ingredient costs rose 5% and you didn't adjust.

**How to protect yourself:**

- **Re-cost recipes on schedule** (see "How Often to Re-Cost" in Part 1)
- **Build escalation clauses into long-term contracts.** Institutional caterers who lock pricing for 12 months without an escalation clause absorb all inflation risk. A standard clause: "Prices subject to adjustment if ingredient costs increase more than 5% from contract date, with 30 days' notice."
- **Review menu prices quarterly at minimum.** Even a 2-3% bump every 6 months is less painful to clients than a sudden 10% increase after a year.
- **Track your actual food cost monthly.** If your theoretical cost hasn't changed but your actual cost has crept up, prices have moved and your recipes need re-costing.

### Contract and Retainer Pricing

A weekly private chef client gets different economics than a one-off event. Understanding this changes how you price.

**One-off events:**

- Full setup, teardown, shopping, and travel costs each time
- Higher per-event overhead allocation (spread across fewer jobs)
- Must cover all costs plus profit in a single transaction
- Higher per-person pricing is justified and expected

**Recurring/retainer clients:**

- Shopping can be consolidated across multiple visits
- Ingredient overlap between visits reduces waste
- Travel cost is known and amortized
- Overhead allocation per visit is lower (fixed costs spread across more jobs)
- Client expects a volume discount, and you can afford to give one

**The math:** If a one-off dinner costs you $396 (from the Method 2 example) and you charge $475, that's 20% margin. A weekly client doing 4 dinners/month lets you consolidate shopping (save 2-3 hours), reduce waste (shared ingredients), and streamline prep. Your cost per dinner might drop to $320. At $400/dinner (a "discount" from $475), your margin jumps to 25% while the client pays less. Both sides win.

### Menu Pricing Psychology

Cost-based pricing gives you the floor. Value-based pricing gives you the ceiling. Pricing psychology determines where in that range you actually land.

**Principles that affect what you can charge:**

- **Charm pricing:** $29 feels meaningfully cheaper than $30 to most buyers, even though the difference is 3%. Works for menus, meal plans, and per-person event quotes.
- **Anchoring:** Placing a high-price item on a menu makes everything else feel reasonable by comparison. A $95 wagyu entree makes the $42 lamb rack seem like a deal. Caterers do this by showing a "premium" package alongside the one they expect most clients to pick.
- **Remove dollar signs on menus.** Research shows guests spend more when prices are listed as "42" instead of "$42.00". This is a restaurant-specific tactic.
- **Round numbers for premium, precise for value.** A fine-dining tasting menu at $150 signals premium. A food truck combo at $11.49 signals value.
- **Decoy pricing:** Three package tiers where the middle one is the best deal. The top tier makes the middle look reasonable. The bottom tier is too stripped down. Most clients pick the middle.

These are not tricks. They're how buyers make decisions. Your job is to understand the psychology so your pricing doesn't accidentally signal the wrong thing.

### Deposit and Payment Timing

When money comes in affects what you can buy, which affects achievable quality at a given food cost target.

- **50% deposit on booking:** You have cash to buy premium ingredients for the event. No personal float required.
- **Invoice after event (net 15-30):** You front all ingredient, labor, and overhead costs. You need working capital. If a client pays late, you're financing their event.
- **Retainer clients:** Steady monthly income lets you plan purchasing, negotiate better terms with suppliers, and buy in volume.

For private chefs and caterers, a deposit policy isn't just about cash flow. It directly affects your ingredient purchasing power. A chef collecting 50% up front can buy the best product at the right vendor. A chef floating costs on a credit card adds 2-3% in interest to their effective food cost.

### Payment Processing Fees

Credit card processing (2.5-3.5%) is a cost that most operators forget to factor into pricing. On a $500 event, 3% processing is $15. On $10,000/month revenue, it is $300/month ($3,600/year).

Payment processing fees reduce your effective revenue. If you charge $100 and pay 3% processing, your effective revenue is $97, which makes your actual food cost percentage higher than what you calculated. A recipe with $30 ingredient cost at $100 selling price is 30% food cost on paper, but 30.9% against actual collected revenue.

Where to account for it: include processing fees as an overhead line item in cost-plus calculations, or build it into your profit margin. Do not ignore it.

### Food Cost and Your Financial Statements (COGS and P&L)

ChefFlow calculates recipe-level food cost (what a dish should cost based on ingredient prices and yield). Your accountant calculates period-level COGS (what you actually spent on food in a month or year). These are related but not identical.

**COGS formula (what your accountant uses):**

```text
Cost of Goods Sold = Beginning Inventory + Purchases - Ending Inventory
```

ChefFlow's food cost percentage is a **theoretical** number based on recipe cards. COGS is an **actual** number based on what you bought, what you had on hand, and what is left. The difference between the two is variance (waste, portioning errors, spoilage, theft).

**Simplified food-service P&L:**

```text
Revenue (what you collected)
- COGS (food + direct materials)                    Target: 28-35%
= Gross Profit
- Labor (wages, taxes, benefits, workers' comp)      Target: 25-35%
- Occupancy (rent, utilities, insurance, permits)    Target: 8-12%
- Operating expenses (marketing, admin, supplies)    Target: 5-10%
= Operating Profit (EBITDA)                          Target: 10-20%
```

When your accountant asks for food cost data, they want COGS, not recipe percentages. Until ChefFlow has inventory tracking, you bridge the gap by tracking total purchases (your vendor invoices) and doing periodic inventory counts (even if informal).

**Chart of accounts mapping:** ChefFlow's cost-plus categories map to standard accounting categories as follows:

- Food cost -> COGS: Food
- Beverage cost -> COGS: Beverage
- Packaging/disposables -> COGS: Paper and Disposables
- Direct event labor -> COGS: Direct Labor (or Cost of Revenue: Labor)
- Travel/vehicle -> Transportation Expense
- Equipment rental -> Cost of Revenue: Rentals
- Insurance -> Operating Expense: Insurance
- Kitchen rent/commissary -> Occupancy Expense
- Marketing -> Operating Expense: Marketing
- Payment processing -> Operating Expense: Processing Fees

If your bookkeeper needs to categorize ChefFlow data for tax filing, this mapping tells them where each cost-plus line item belongs.

### Baker's Percentage (Bakery-Specific Costing Method)

Bakers use a different system called baker's percentage (or baker's math). Every ingredient in a formula is expressed as a percentage of total flour weight, with flour always equal to 100%.

**Example: baguette formula at 68% hydration:**

| Ingredient    | Baker's %  | Weight (for 1 kg flour) |
| ------------- | ---------- | ----------------------- |
| Bread flour   | 100%       | 1,000 g                 |
| Water         | 68%        | 680 g                   |
| Salt          | 2%         | 20 g                    |
| Instant yeast | 1.5%       | 15 g                    |
| **Total**     | **171.5%** | **1,715 g dough**       |

To cost this formula: convert each ingredient's weight to its purchase-unit cost (e.g., 1,000 g flour = 2.2 lbs x $0.45/lb = $0.99). Baker's percentage does not change the costing math, but it changes how bakers scale and think about their recipes. The system needs to accept baker's percentage as an input format and convert to gram weights for costing.

**Baking yield:** Bread and pastry lose 10-15% of dough weight during baking (moisture evaporation). A 1,715 g dough batch produces approximately 1,460-1,545 g of finished bread. This is a cooking yield of 0.85-0.90.

### Service Style Cost Conversion

The same menu costs differently depending on how you serve it. Portion standards (Section 3 of the reference data) give multipliers, but the total cost difference between service styles goes beyond food volume:

- **Plated service (1.0x food):** Precise portions, minimal waste, standard labor. The baseline.
- **Family style (1.15-1.25x food):** More food prepared (guests serve themselves), fewer plating staff but more serving vessels needed. Equipment rental increases. End-of-service waste: 5-10% (food left in serving dishes).
- **Buffet (1.25-1.40x food):** Significantly more food, replenishment labor, chafing dishes and serving equipment, sneeze guards. End-of-service waste: 10-20% (food on the buffet at close is typically discarded depending on jurisdiction). Total cost difference from plated: 40-60%, not just the 25-40% food volume increase.
- **Stations (1.30-1.50x food):** Similar to buffet but with attended action stations requiring skilled cooks at each station. Higher labor cost than buffet.

When converting a quote from plated to buffet, do not simply multiply food cost by 1.3. Add the equipment, labor, and waste differences separately.

### Regulatory and Compliance Costs

These are mandatory costs that affect your overhead and breakeven. They vary by operation type and jurisdiction, but they are not optional.

**Permits and licenses:** Health department permits ($100-1,000/year), catering permits ($50-500/year), temporary event permits ($25-200 per event), mobile vendor permits ($200-1,000/year), home kitchen permits under cottage food laws ($0-200/year). Some jurisdictions require separate permits for each type of activity.

**Food safety certifications:** ServSafe Manager certification ($150-200, renewal every 5 years). Food handler cards ($15-25 per person, renewal every 2-3 years). Allergen awareness training ($20-50 per person in states that require it). For operations with employees, these are per-employee costs that compound.

**Insurance:** General liability ($500-3,000/year). Product liability for packaged goods ($500-5,000/year). Commercial auto for catering/food truck ($1,200-5,000/year). Workers' compensation for employees (3-8% of payroll for kitchen staff). Liquor liability if serving alcohol ($500-3,000/year). Many venues and clients require proof of $1M-$2M coverage as a condition of booking.

**Cottage food operators:** If you operate from a home kitchen, know your state's revenue cap ($5,000-$75,000/year in most states, with some states having no cap). Exceeding the cap without upgrading to a commercial kitchen permit is a violation. The cost of upgrading (commercial kitchen rental at $500-2,000/month or buildout at $10,000-50,000) is a breakeven consideration.

All of these costs belong in your overhead calculation. They are fixed costs that you pay whether you have zero events or fifty events in a month.

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

**Multi-platform economics:** If you are on multiple platforms with different commission rates, you need to calculate your effective food cost per platform, not just overall:

```text
Effective Revenue = Menu Price - Commission - Promo Subsidy - Processing Fee
Platform Food Cost % = Ingredient Cost / Effective Revenue x 100
```

Example: a $25 menu item with $7.50 ingredient cost across three platforms:

- Platform A (15% commission): effective revenue $21.25, food cost 35.3%
- Platform B (25% commission): effective revenue $18.75, food cost 40.0%
- Platform C (30% commission): effective revenue $17.50, food cost 42.9%

The same item at the same price goes from viable (35%) to unsustainable (43%) depending on the platform. Many operators charge 15-20% more on high-commission platforms to compensate. If a platform also requires funded promotions ($0 delivery, 20% off first order), subtract those from your effective revenue too.

**Adjusted food cost targets for delivery:** The standard 28-35% target assumes you keep most of your revenue. With 25-30% going to platform commissions, your food cost target on delivery items should be 20-25% to maintain workable margins.

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

**The CPG margin stack:** Food cost percentage targets from restaurants do not apply. In CPG, the margin is shared across four levels:

```text
Ingredient Cost (your COGS)
  x 2.0-2.5 = Wholesale Price (what you sell to distributors)
    x 1.15-1.25 = Distributor Price (what distributors sell to retailers)
      x 1.8-2.2 = Retail Price (what consumers pay)
```

A jar of sauce with $2.50 in ingredients becomes ~$5.00 wholesale, ~$6.25 at distributor, ~$11-12 retail. The "4x rule": retail price should be roughly 4x your ingredient cost to survive the margin stack. If your ingredient cost is too high for the target retail price, reformulate the recipe before launching.

**Landed cost (your true COGS):** Ingredient cost alone is not your cost. Add: co-packing labor, packaging materials, labels, freight to warehouse, insurance, and expected shrinkage/returns (2-8%). This is your landed cost per unit, and it is what you use for margin calculations.

**Slotting fees:** Retailers charge $5,000-25,000 per SKU per chain for shelf space. Amortize this across expected unit sales over the placement period. If you place 1 SKU in a chain expecting to sell 5,000 units in year one and the slotting fee is $10,000, add $2.00/unit to your effective cost for that channel.

**FSMA compliance:** If you manufacture, process, or pack food for wholesale distribution, FDA's Food Safety Modernization Act requires a written food safety plan, a Preventive Controls Qualified Individual (PCQI), and supplier verification programs. Budget $2,000-10,000 for initial plan development and $800-1,500 for PCQI training. These are real overhead costs.

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

**Ignoring spoilage as a cost.** Product that expires before you use it is money in the trash. If you throw away 6% of what you buy, your effective food cost is 6% higher than your recipe cards say. Track it. A focused menu with fewer unique ingredients is the best defense.

**Not counting non-revenue food.** Staff meals, client tastings, comps, and recipe testing are all real food expenses with zero direct revenue. If you don't account for 2-4% of food cost in non-revenue uses, your actual food cost will always be higher than your theoretical.

**Buying the case when you need the pound.** The case is cheaper per unit, but if half of it spoils before you use it, you paid more per usable unit than the smaller package. Always calculate cost per usable unit, not cost per purchased unit.

**No resale certificate.** Paying 5-10% sales tax on every ingredient purchase when you could be exempt. This is one of the easiest wins for a new operator.

**Never re-costing recipes.** A recipe costed in January is 5-10% wrong by summer if ingredient prices shifted. Monthly re-costing for fixed menus, per-event for custom work.

**Ignoring beverage cost entirely.** If you serve drinks and don't track beverage cost separately, you're flying blind on half your revenue. Beverage margins (18-25% cost) are often the difference between a profitable operation and a struggling one.

**Pricing one-offs and retainers the same.** A weekly client has different economics (lower overhead per visit, less waste, consolidated shopping) than a one-time event. If you charge the same, you're either overcharging the retainer or undercharging the one-off.

**Floating event costs on personal credit.** Without deposits, you're financing the client's event and adding 2-3% in credit card interest to your effective cost. Collect deposits. It's not just cash flow; it affects your purchasing power and ingredient quality.

---

## Glossary

| Term                        | Definition                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AP (As Purchased)**       | Weight or quantity as you buy it, including waste                                                                                                                         |
| **EP (Edible Portion)**     | Weight or quantity that ends up on the plate                                                                                                                              |
| **Yield Factor**            | EP weight / AP weight. Decimal between 0 and 1.                                                                                                                           |
| **Trim Yield**              | Percentage remaining after fabrication (peeling, cutting, deboning)                                                                                                       |
| **Cooking Yield**           | Percentage remaining after applying heat (shrinkage, evaporation, fat render)                                                                                             |
| **Combined Yield**          | Trim yield x cooking yield. The true usable percentage from purchase to plate.                                                                                            |
| **Q-Factor**                | Percentage surcharge for incidental ingredients (oil, salt, seasonings). Default 7%.                                                                                      |
| **Food Cost %**             | Ingredient cost as a percentage of selling price                                                                                                                          |
| **Cost-Plus**               | Pricing method summing all costs (food, labor, overhead, extras) plus profit margin                                                                                       |
| **Prime Cost**              | Food cost + labor cost, as a percentage of revenue. Target 55-65%.                                                                                                        |
| **Contribution Margin**     | Selling price minus food cost, in dollars                                                                                                                                 |
| **Blended Food Cost**       | Weighted average food cost % across a full menu or event                                                                                                                  |
| **Menu Engineering**        | Pricing items as a portfolio so the overall blend hits target, even if individual items don't                                                                             |
| **Theoretical Food Cost**   | What food cost should be based on recipe cards and covers sold                                                                                                            |
| **Actual Food Cost**        | What food cost is based on purchases and inventory change                                                                                                                 |
| **Variance**                | Gap between theoretical and actual food cost. Target: under 2 points.                                                                                                     |
| **Value-Based Pricing**     | Setting price based on perceived value, above the cost-based floor                                                                                                        |
| **Par Level**               | Minimum quantity of a staple to keep on hand                                                                                                                              |
| **FIFO**                    | First In, First Out. Use oldest inventory first.                                                                                                                          |
| **Cross-Utilization**       | Using trim, byproducts, or surplus from one recipe in another                                                                                                             |
| **Pack Size**               | The unit a supplier sells in (per lb, per case, per #10 can)                                                                                                              |
| **Broadline Distributor**   | Large-scale supplier (Sysco, US Foods) with wide selection and delivery minimums                                                                                          |
| **#10 Can**                 | Institutional-size can, approximately 6.5 lbs / 3 quarts                                                                                                                  |
| **IQF**                     | Individually Quick Frozen. Each piece frozen separately for easy portioning.                                                                                              |
| **Mise en Place**           | Everything in its place. All ingredients prepped, measured, and ready before cooking begins.                                                                              |
| **Spoilage**                | Product lost before service (expiration, damage, rot). Different from yield loss.                                                                                         |
| **Non-Revenue Food**        | Food prepared but not sold: staff meals, comps, tastings, R&D. Budget 2-4% of food cost.                                                                                  |
| **Case-Break**              | Buying less than a full case. Often costs more per unit but reduces waste on specialty items.                                                                             |
| **Pour Cost**               | Beverage equivalent of food cost %. Cost of drink ingredients / selling price.                                                                                            |
| **Breakeven Point**         | Revenue or units needed to cover all fixed costs before any profit.                                                                                                       |
| **Escalation Clause**       | Contract term allowing price adjustment if ingredient costs rise beyond a threshold.                                                                                      |
| **GPO**                     | Group Purchasing Organization. Pools buying power across multiple operators for volume pricing.                                                                           |
| **Resale Certificate**      | Tax document exempting ingredient purchases from sales tax when buying for resale.                                                                                        |
| **Retainer Pricing**        | Recurring client pricing that reflects lower per-visit overhead from guaranteed volume.                                                                                   |
| **Anchoring**               | Pricing tactic: high-priced item makes other items feel reasonable by comparison.                                                                                         |
| **Batch Allocation**        | Distributing the cost of a shared recipe (stock, sauce) across all dishes that use it.                                                                                    |
| **Spoilage Rate**           | Percentage of purchased product lost to waste before service. Track monthly.                                                                                              |
| **Shrink**                  | Unexplained inventory loss: the gap between what records say you should have and what you actually have. Includes theft, administrative errors, and unrecorded waste.     |
| **Menu Engineering Matrix** | Classification of menu items into Stars (popular + profitable), Plowhorses (popular + low margin), Puzzles (unpopular + profitable), and Dogs (unpopular + unprofitable). |
| **Prep Sheet**              | Daily production list translating par levels and demand forecasts into specific prep tasks with quantities, shelf life, and priority.                                     |
| **Overlap Score**           | Percentage of menu items that use a given ingredient. Higher overlap = better purchasing power and lower waste.                                                           |
| **Byproduct Recovery**      | Assigning value to trim and byproducts when they are used in other preparations, reducing the effective cost of the primary product.                                      |
| **Reconciliation**          | The process of explaining the gap between theoretical and actual food cost, source by source (portioning, receiving, waste, POS errors, shrink).                          |
| **Variance Threshold**      | The point at which the gap between theoretical and actual food cost triggers investigation. Standard: 2 percentage points.                                                |
| **Equipment Yield**         | The yield percentage specific to a cooking method/equipment. Sous vide (90-95%) vs. convection (70-80%) vs. smoking (60-70%) on the same protein.                         |
