# Culinary Operations and Costing System: A Professional Chef's Complete Guide

> **Purpose:** Product-design reference for ChefFlow. Not a spec. Not code. A professional culinary operations lecture that establishes how chefs actually think about pricing, recipes, menus, events, and operational memory. Every product decision in ChefFlow's costing, recipe, and menu systems should be informed by this document.
>
> **Perspective:** 30+ years across Michelin kitchens, high-volume restaurants, private dining, catering, restaurant ownership, culinary instruction, and real-world business survival.

---

## 1. Recipe Costing Fundamentals

### The Core Problem

A recipe is a formula. A costed recipe is a financial instrument. Most chefs treat recipes as cooking instructions. Professional operators treat recipes as cost documents that happen to contain cooking instructions.

The difference between a chef who survives and a chef who closes is whether they know, to the cent, what every plate costs before it leaves the kitchen.

### Raw Ingredient Cost: The Starting Point

Every ingredient has a **purchase cost** and a **usable cost**. They are never the same number.

**Purchase cost** is what appears on the invoice. **Usable cost** is what the recipe actually consumes after trim, waste, yield loss, and unit conversion.

#### Unit Conversion: Purchase Unit vs Recipe Unit

Ingredients are purchased in one unit and used in another. This is where most costing errors begin.

| Purchased As                     | Used As               | Conversion Required                          |
| -------------------------------- | --------------------- | -------------------------------------------- |
| 50 lb case of onions             | 2 cups diced onion    | Case -> lb -> oz -> cup (volume from weight) |
| 1 gallon olive oil               | 2 tablespoons         | Gallon -> fl oz -> tablespoon                |
| 5 lb bag flour                   | 250 grams             | Pounds -> grams                              |
| Bunch of cilantro                | 2 tablespoons chopped | Bunch -> usable leaves -> chopped volume     |
| Whole beef tenderloin (6 lb avg) | 6 oz plated portion   | Whole -> trimmed -> portioned                |
| Case of 12 pints heavy cream     | 1/4 cup per recipe    | Case -> pint -> cup -> quarter cup           |
| 10 lb bag sugar                  | 150 grams             | Pounds -> grams                              |

**Formula: Unit Cost**

```
Unit Cost = Purchase Price / Number of Usable Units

Example: Olive oil
  Purchase: 1 gallon = $28.00
  1 gallon = 128 fl oz = 256 tablespoons
  Cost per tablespoon = $28.00 / 256 = $0.109
  Recipe calls for 2 tbsp = $0.22
```

#### Pack Size vs Usable Quantity

A case of romaine lettuce contains 24 heads. Each head has outer leaves that get discarded, a core that gets cut, and usable inner leaves. A "case of romaine" is not 24 heads of usable romaine.

```
Example: Romaine lettuce
  Purchase: 1 case (24 heads) = $36.00
  Usable yield per head: ~65% (trim outer leaves, core)
  Average head weight: 1.5 lb
  Usable weight per head: 1.5 lb x 0.65 = 0.975 lb
  Usable weight per case: 0.975 x 24 = 23.4 lb
  Cost per usable pound: $36.00 / 23.4 = $1.54/lb
  NOT $36.00 / 36 lb = $1.00/lb (the naive calculation)
```

This is a 54% error. That error multiplied across every ingredient on a menu is the difference between profit and loss.

### Edible Yield, Trim Loss, and Waste Factor

**Edible yield** (also called yield percentage or usable yield) is the percentage of a purchased ingredient that actually ends up on the plate.

**Formula:**

```
Edible Yield % = (Usable Weight / As-Purchased Weight) x 100

Actual Cost per Usable Unit = Purchase Price per Unit / Yield %

Example: Whole beef tenderloin
  As-Purchased weight: 6.0 lb
  After trimming silver skin, chain, fat: 4.2 lb
  Edible Yield: 4.2 / 6.0 = 70%
  Purchase price: $32.00/lb
  Actual cost per usable lb: $32.00 / 0.70 = $45.71/lb

  Portion: 6 oz (0.375 lb)
  Cost per portion: $45.71 x 0.375 = $17.14
  NOT $32.00 x 0.375 = $12.00 (the naive calculation)
```

The naive calculation underestimates the protein cost by $5.14 per plate. On a 12-guest dinner, that is $61.68 of invisible loss.

### Cooked Yield (Moisture Loss)

Cooking reduces weight. A 6 oz raw steak does not weigh 6 oz after cooking. Roasting, braising, grilling, and sauteing all cause moisture loss.

**Common Cooked Yield Percentages:**

| Protein         | Cooking Method | Approximate Cooked Yield |
| --------------- | -------------- | ------------------------ |
| Beef tenderloin | Roast/sear     | 75-80%                   |
| Chicken breast  | Roast          | 70-75%                   |
| Salmon fillet   | Sear/roast     | 80-85%                   |
| Pork shoulder   | Braise         | 55-65%                   |
| Whole chicken   | Roast          | 50-55% (meat only)       |
| Shrimp          | Saute          | 80-85%                   |
| Scallops        | Sear           | 75-80%                   |
| Duck breast     | Render/sear    | 65-70%                   |
| Lamb rack       | Roast          | 70-75%                   |
| Short ribs      | Braise         | 50-60%                   |

**Formula: True Cost Per Cooked Portion**

```
True Cost = (Purchase Price / Trim Yield %) / Cooked Yield %

Example: Duck breast
  Purchase: $14.00/lb
  Trim yield: 85% (remove excess fat, silver skin)
  Cooked yield: 67% (rendering fat)

  Cost per usable raw lb: $14.00 / 0.85 = $16.47
  Cost per cooked lb: $16.47 / 0.67 = $24.58

  Plated portion: 5 oz cooked (0.3125 lb)
  Cost per portion: $24.58 x 0.3125 = $7.68

  Raw weight needed for 5 oz cooked: 5 oz / 0.67 = 7.46 oz raw (trimmed)
  As-purchased weight needed: 7.46 oz / 0.85 = 8.78 oz

  For 10 guests: 8.78 oz x 10 = 87.8 oz = 5.49 lb as-purchased
```

### Waste Factor

Beyond trim and cooking loss, real kitchens have operational waste:

- Dropped portions
- Overcooked pieces
- Tasting/quality checks
- Plate returns
- Staff meal allocation
- Spillage
- Spoilage between purchase and use
- Recipe testing

A professional adds 5-10% waste factor on top of calculated needs.

```
Total Purchase Needed = (Portions x Raw Weight per Portion) / Trim Yield / (1 - Waste Factor)

Example: 12 guests, 6 oz raw trimmed salmon per guest
  Raw trimmed needed: 12 x 6 oz = 72 oz
  Trim yield on salmon: 90% (skin, pin bones)
  Waste factor: 7%

  As-purchased: 72 / 0.90 / 0.93 = 86.0 oz = 5.38 lb

  Order: 6 lb (round up to practical purchase unit)
```

### Vendor Pricing vs Retail Fallback

**Vendor pricing** is the gold standard. Wholesale purveyors provide weekly price sheets with case prices, unit prices, and pack sizes. These prices fluctuate weekly.

**Retail pricing** is the emergency fallback. If a chef cannot get vendor pricing (new ingredient, small quantity, emergency purchase, no vendor relationship), they use retail grocery prices.

Retail prices are typically 40-100% higher than wholesale. Any recipe costed at retail must be flagged: the cost will decrease when vendor pricing is secured, or the chef is overpaying.

**The costing hierarchy:**

1. Current vendor invoice price (highest confidence)
2. Current vendor price sheet (high confidence)
3. Recent vendor invoice (medium confidence, check for drift)
4. Retail price (low confidence, likely overpaying)
5. Online estimate (lowest confidence, informational only)

### Seasonal Price Movement and Volatility

Some ingredients have predictable seasonal patterns. Others are volatile.

**Predictable seasonal movement:**

- Asparagus: cheap in spring, expensive in winter
- Tomatoes: cheap in summer, expensive in winter
- Stone fruit: available June-September, expensive or unavailable otherwise
- Lobster: cheapest in late summer (new shell season), expensive in winter
- Oysters: cheapest fall/winter, less available summer
- Root vegetables: cheapest fall/winter

**Volatile ingredients:**

- Seafood (weather, catch, fuel costs)
- Beef (feed costs, supply chain)
- Avocados (political/trade disruption)
- Imported specialties (currency, tariffs)
- Any ingredient with a short supply chain during disruption

A costed recipe from January may be 15-30% wrong by July if it includes seasonal ingredients. ChefFlow must track when a price was captured and flag staleness.

### Pantry and Staple Assumptions

Every recipe uses salt, pepper, oil, butter, and other staples. Most chefs do not cost these per recipe because:

1. The per-recipe cost is tiny (fractions of a cent for salt)
2. Tracking every pinch of salt creates false precision
3. These are operational overhead, not recipe-specific costs

**The professional approach:**

- **Staple pantry overhead:** Add 3-5% to total food cost for salt, pepper, common oils, common spices, common dried herbs, flour for dusting, butter for greasing, sugar for pinches, vinegar for deglazing, stock for small amounts.
- **Recipe-specific spices/herbs:** If a recipe calls for a significant quantity (2 tbsp saffron, 1 cup fresh basil, 1 cup pine nuts), cost that ingredient specifically.
- **Threshold rule:** If an ingredient contributes more than $0.25 per portion, cost it specifically. Below that, it rolls into pantry overhead.

```
Example: Pantry overhead
  Total recipe food cost (specific ingredients): $14.50 per plate
  Pantry overhead at 4%: $0.58
  Adjusted food cost per plate: $15.08
```

### Sub-Recipes and Batch Recipes

Many dishes contain components that are themselves recipes:

- A vinaigrette is a recipe used as a component
- A stock is a recipe used in multiple dishes
- A duxelle is a recipe used in a Wellington
- A pastry cream is a recipe used in multiple desserts
- A compound butter is a recipe used across several proteins

**Sub-recipe costing:**

```
Example: Brown Butter Vinaigrette (batch recipe)
  Butter: 1 lb = $6.00
  Shallot: 2 oz = $0.50
  Sherry vinegar: 4 fl oz = $1.80
  Dijon: 1 oz = $0.40
  Honey: 1 oz = $0.30
  Salt: pantry
  Pepper: pantry

  Batch cost: $9.00
  Batch yield: 2 cups (16 fl oz)
  Cost per fl oz: $9.00 / 16 = $0.5625
  Portion per plate: 1 oz
  Cost per plate: $0.56
```

The sub-recipe cost then plugs into the parent dish cost.

### What Inexperienced Chefs Get Wrong

1. **Ignoring yield.** Costing 6 oz of tenderloin at purchase price instead of usable cost. This alone can create 30-40% costing errors.
2. **Ignoring cooked shrinkage.** Planning 6 oz portions but needing 8 oz raw to get there.
3. **Confusing volume and weight.** A cup of flour weighs differently than a cup of sugar. Weight-based recipes are more accurate.
4. **Forgetting sub-recipe costs.** The sauce, the puree, the garnish, and the vinaigrette all cost money.
5. **Using stale prices.** A recipe costed 6 months ago with different vendor prices.
6. **Not accounting for minimum purchases.** Needing 4 oz of tarragon but having to buy a full bunch.
7. **False precision.** Calculating a plate cost to 4 decimal places when the yield assumption could be off by 10%.
8. **Treating trim as free.** The trim you paid for but threw away is part of the plate cost.

### Practical vs Obsessive Costing

There is a real danger in over-engineering recipe costing. A chef who spends 3 hours calculating that a pinch of salt costs $0.003 has wasted more money in labor than the salt will ever cost.

**The practical approach:**

- Cost major ingredients precisely (proteins, expensive produce, dairy, specialty items)
- Cost sub-recipes as batches, then calculate per-portion
- Use pantry overhead for trivial items
- Round to the nearest cent per portion
- Flag uncertainty, do not pretend it away
- Update costs quarterly or when vendor prices shift significantly
- Focus energy on the ingredients that actually move the needle

A plate where the protein is $17 and the garnish herbs are $0.08 does not need the herbs costed to the milligram. But it absolutely needs the protein yield calculated correctly.

---

## 2. Portioning and Yield

### The Fundamental Question

"How much food goes on the plate?" seems simple. It is not. Portion size changes based on:

- Course position (appetizer vs entree)
- Number of courses (3-course vs 7-course)
- Service style (plated vs buffet vs family-style)
- Event type (wedding vs intimate dinner)
- Client expectations (casual vs luxury)
- Guest demographics (adults vs children)
- Menu style (comfort food vs fine dining)
- Time of year (lighter in summer, heavier in winter)
- Time of day (lunch vs dinner)

### Raw Weight vs Cooked Weight

This causes more confusion than any other topic.

When a chef says "6 oz portion," do they mean 6 oz raw or 6 oz cooked?

**Industry standard:** Protein portions are specified as **raw weight** unless explicitly stated as cooked weight.

When a menu says "8 oz New York strip," that is 8 oz raw. After cooking to medium-rare, it weighs approximately 6-6.5 oz. This is normal and expected.

For purchasing and costing, always work in raw weight. For plating and guest experience, think in cooked weight.

### Portion Standards by Course Type

**Plated Dinner Service (per guest):**

| Component    | Appetizer     | Entree        | Side          |
| ------------ | ------------- | ------------- | ------------- |
| Protein      | 3-4 oz raw    | 6-8 oz raw    | N/A           |
| Starch       | 2-3 oz cooked | 4-5 oz cooked | 4-5 oz cooked |
| Vegetable    | 2-3 oz cooked | 3-4 oz cooked | 4-5 oz cooked |
| Sauce        | 1-1.5 oz      | 1.5-2 oz      | 1 oz          |
| Puree        | 1.5-2 oz      | 2-3 oz        | 2-3 oz        |
| Garnish      | 0.25-0.5 oz   | 0.25-0.5 oz   | 0.25 oz       |
| Salad greens | 1.5-2 oz      | N/A           | 2-3 oz        |
| Soup         | 6-8 oz        | 10-12 oz      | N/A           |
| Bread        | 1-2 pieces    | 1-2 pieces    | N/A           |
| Dessert      | 3-4 oz        | N/A           | N/A           |

**Tasting Menu (5-7 courses):**

Everything is smaller. The point is variety, not volume.

| Component  | Per Course    |
| ---------- | ------------- |
| Protein    | 2-3 oz raw    |
| Starch     | 1-2 oz cooked |
| Vegetable  | 1-2 oz cooked |
| Sauce      | 0.5-1 oz      |
| Puree      | 1-1.5 oz      |
| Garnish    | minimal       |
| Intermezzo | 2-3 oz        |
| Dessert    | 2-3 oz        |

**Buffet (per guest, total across all items):**

Guests serve themselves. They take more than plated. Account for grazing, seconds, and unevenness.

| Component                  | Per Guest (total) |
| -------------------------- | ----------------- |
| Protein (across options)   | 8-10 oz raw       |
| Starch (across options)    | 6-8 oz cooked     |
| Vegetable (across options) | 6-8 oz cooked     |
| Salad                      | 3-4 oz            |
| Bread/rolls                | 2-3 pieces        |
| Dessert                    | 4-6 oz            |

**Family-Style (per guest, served in shared platters):**

Between plated and buffet. Guests see abundance but portion themselves.

| Component | Per Guest              |
| --------- | ---------------------- |
| Protein   | 7-9 oz raw             |
| Starch    | 5-7 oz cooked          |
| Vegetable | 5-7 oz cooked          |
| Salad     | 2-3 oz                 |
| Bread     | 2-3 pieces             |
| Sauce     | served on side, 2-3 oz |
| Dessert   | 4-5 oz                 |

**Cocktail Party / Passed Hors d'oeuvres:**

No plated portions. Guests eat standing, grazing over 2-3 hours.

| Duration | Pieces Per Guest | Notes                                      |
| -------- | ---------------- | ------------------------------------------ |
| 1 hour   | 4-6 pieces       | Pre-dinner reception                       |
| 2 hours  | 8-10 pieces      | Cocktail party                             |
| 3 hours  | 12-15 pieces     | Full cocktail reception (meal replacement) |
| 4+ hours | 15-18 pieces     | Extended event, add substantial stations   |

Rule of thumb: 3 varieties minimum. For a 2-hour party, plan 3 pieces per person per variety with at least 3-4 varieties.

### Hors d'oeuvres Specific

Each passed piece should be 1-2 bites. A "piece" is approximately 1-1.5 oz total weight.

If hors d'oeuvres are the only food (no dinner to follow), increase by 30-50% and include at least 2 "substantial" options (sliders, skewers, tartlets with protein).

### Scaling Portions for Guest Count

Portions per guest do not change much with guest count. What changes is batch efficiency, overage math, and waste management.

**Overage rules:**

| Guest Count | Overage Factor | Rationale                                         |
| ----------- | -------------- | ------------------------------------------------- |
| 2-6         | 15-20%         | Small batches; one ruined portion is catastrophic |
| 7-12        | 10-15%         | Comfortable margin for plated service             |
| 13-25       | 8-12%          | Production batches start yielding well            |
| 26-50       | 5-10%          | Economies of scale help                           |
| 51-100+     | 5-8%           | Large batches; waste factor stabilizes            |

**Buffet overage** is higher: 15-25% because consumption is uneven and you cannot run out visually.

### Seconds, Staff Meal, and Mistakes

Professional operations plan for:

- **Seconds:** Family-style and buffet assume some guests will have seconds. Build it into the batch.
- **Staff meal:** If you have 2-3 staff (servers, bartender), plan 2-3 extra portions or a designated staff meal. Do not eat into guest food.
- **Mistakes:** 1-2 extra portions for plated service. A dropped plate, an overcooked portion, an allergy that was not communicated.
- **Tasting:** The chef tastes every component before service. This comes out of the batch.

### Children vs Adults

- Children under 10: half portions
- Children 10-14: 70-80% portions
- Teenagers: full adult portions (often more)
- Elderly guests: sometimes lighter, but never assume; offer full portions

### Luxury vs Practical Portions

A luxury private dinner for 6 at $250/head features generous portions, premium proteins (8 oz filet, whole lobster tail, A5 wagyu), and abundant garnish.

A practical private dinner for 12 at $85/head features disciplined portions, good-quality proteins (6 oz salmon, chicken supreme), and efficient garnish.

The portion size is part of the value proposition. Higher price = higher perceived generosity.

### Concrete Examples

**Whole Beef Tenderloin to Plated Portions:**

```
As-purchased: 1 whole tenderloin, ~6 lb
After trim (silver skin, chain, fat): 4.2 lb (70% yield)
Usable center-cut portion: 3.5 lb (chain and tail for other uses)
Portion size: 6 oz (0.375 lb) raw
Portions from center: 3.5 lb / 0.375 lb = 9.3 portions
Practical yield: 9 plated portions per tenderloin

For 12 guests: need 2 tenderloins (yields 18 center-cut portions)
Usable: 12 for guests + 2 overage + 2 tasting + 2 staff = 18

Chain and tail: reserve for staff meal, apps, or stock
```

**Batch of Vinaigrette to Plated Portions:**

```
Batch yield: 1 quart (32 fl oz)
Portion per plate: 1 oz
Portions per batch: 32
For 12 guests + 3 overage: 15 oz needed = half batch
Make full batch (leftover keeps well)
```

**Tray of Focaccia to Servings:**

```
One sheet pan focaccia: approximately 2 lb dough
Baked yield: ~1.75 lb (moisture loss ~12%)
Cut into pieces: 2 oz per piece = 14 pieces per tray
For 12 guests at 2 pieces each: 24 pieces = 2 trays

Make 2.5 trays (allow for tasting, breakage, overage)
```

---

## 3. Building a Recipe That Never Needs Backtracking

### The Problem with Most Recipes

Most recipes, even professional ones, are written to be "good enough" for someone who already knows the dish. They assume knowledge that may not exist in the person executing six months later, whether that person is a new hire, a catering partner, or the same chef who has forgotten the details.

A recipe that requires the chef to remember unwritten details is a recipe that will produce inconsistent results.

### Recipe Documentation Standard

A recipe that never needs backtracking contains:

**Header Information:**

- Recipe name (unambiguous)
- Recipe ID (for system tracking)
- Category (appetizer, entree, dessert, sauce, base, component, garnish, etc.)
- Cuisine/style tag
- Parent recipe (if this is a variation)
- Date created
- Date last modified
- Last event used
- Author

**Yield and Portions:**

- Batch size (e.g., "1 full recipe")
- Total yield (weight or volume)
- Number of portions
- Portion size (weight or volume)
- Portion description (e.g., "6 oz center-cut, seared medium-rare")

**Ingredient List:**

Every ingredient should have:

- Name (specific: "extra-virgin olive oil," not "oil")
- Quantity (by weight preferred, volume acceptable for liquids)
- Unit (grams, oz, cups, each)
- Prep state (diced, julienned, blanched, room temperature, cold)
- Yield note if relevant (e.g., "4 lemons, juiced = approx. 1/2 cup juice")
- Sub-recipe reference if applicable (e.g., "Brown Butter Vinaigrette, see recipe #47")
- Allergen flag
- Cost per unit (populated by system)
- Cost for quantity used (populated by system)

**Method:**

Step-by-step with:

- Numbered steps
- Equipment specified per step
- Temperature specified (oven temp, oil temp, internal temp)
- Time specified (ranges acceptable: "sear 2-3 minutes per side")
- Visual/tactile cues ("until golden brown and releases from pan easily")
- Critical control points flagged (temperatures for food safety, resting times, carry-over cooking)
- Warnings for common mistakes

**Timing:**

- Total active prep time
- Total passive time (marination, resting, chilling)
- Fire-to-plate time during service
- Hold time (how long can it sit before quality degrades)

**Food Safety:**

- Internal temperature targets
- Cooling protocol (if made ahead)
- Reheating protocol (if applicable)
- Holding temperature and maximum time
- Allergen list
- Cross-contamination notes

**Service:**

- Plating description (or photo reference)
- Plating sequence
- Plate type/size
- Garnish placement
- Sauce application method (drizzle, pool, smear, side)
- Temperature at service
- Last-second finishing (flaky salt, herbs, oil drizzle)

**Equipment:**

- Full list (pans, pots, blender, thermometer, scale, etc.)
- Special equipment noted

**Scaling Notes:**

- Does this recipe scale linearly? If not, what changes?
- Maximum batch size (e.g., "do not exceed 2x; custard will not set properly in larger batches")
- Minimum batch size
- Adjustments needed at different scales

**History (living section):**

- Event log: which events used this recipe
- Notes from each use
- What worked
- What failed
- What was modified on the fly
- What should change next time
- Cost actuals vs estimates

### Eliminating Vague Language

| Vague                | Precise                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| "Add herbs"          | "Add 2 tbsp chiffonade basil and 1 tbsp picked thyme leaves"                                                                |
| "Season to taste"    | "Season with 1 tsp kosher salt and 1/2 tsp black pepper; adjust after tasting"                                              |
| "Cook until done"    | "Cook to internal temperature of 135F (medium-rare), approximately 4-5 minutes per side for 1.5-inch thick portion"         |
| "Use enough sauce"   | "Ladle 1.5 oz sauce in pool on plate"                                                                                       |
| "Add a little oil"   | "Add 2 tbsp extra-virgin olive oil"                                                                                         |
| "Roast until tender" | "Roast at 400F for 25-30 minutes, until fork-tender and lightly caramelized"                                                |
| "Garnish nicely"     | "Top with 3 shaved asparagus ribbons, 2 drops chive oil, and 5 microgreens"                                                 |
| "Reduce the sauce"   | "Reduce over medium-high heat until sauce coats the back of a spoon, approximately 8-10 minutes, yield approximately 1 cup" |
| "Cream the butter"   | "Beat butter on medium-high (stand mixer, paddle) for 3 minutes until pale and fluffy"                                      |

### When Chef Intuition Is Acceptable

There are moments in cooking that resist exact measurement:

- Final seasoning adjustment (taste, adjust, taste again)
- Doneness of a sear (visual + tactile: color, resistance, sound)
- Emulsification pace (watching the sauce come together)
- Bread dough hydration feel (experienced bakers adjust by feel)
- Sauce consistency (coating a spoon is more reliable than a timer)

These are acceptable as **secondary cues** alongside primary measurements. The recipe should say: "Sear 3-4 minutes per side, until deep golden brown and releases from the pan without resistance." The time is the primary cue. The color and release are the sensory confirmation.

Software should capture the measurable part. The intuitive part should be documented as guidance text ("Look for..." "Should feel like..." "The sound changes from sizzling to quiet when moisture is gone").

---

## 4. Menu Costing

### From Dish to Event

A menu is not just a list of dishes. A menu is a financial commitment.

Costing a menu means knowing the total cost to deliver a complete event, including every component, every course, every logistic, and every hour of labor.

### Cost Per Dish -> Cost Per Guest -> Cost Per Event

```
Example: 4-Course Plated Dinner for 12 Guests

Course 1: Burrata with heirloom tomato, basil oil
  Burrata (4 oz): $3.20
  Heirloom tomato (3 oz): $0.90
  Basil oil (0.5 oz, sub-recipe): $0.15
  Micro basil garnish: $0.30
  Flaky salt: $0.02
  Olive oil drizzle: $0.10
  Course 1 total per plate: $4.67

Course 2: Seared scallop with sunchoke puree, asparagus, brown butter vinaigrette
  Scallops U-10 (2 each, 3 oz total): $5.40
  Sunchoke puree (2 oz, sub-recipe): $0.85
  Asparagus (3 spears, 2 oz): $0.60
  Brown butter vinaigrette (1 oz, sub-recipe): $0.56
  Herbs: $0.15
  Course 2 total per plate: $7.56

Course 3: Braised short rib, celery root puree, roasted carrots, red wine jus
  Short rib (8 oz raw, yields ~5 oz cooked): $7.20
  Celery root puree (3 oz, sub-recipe): $0.70
  Roasted carrots (3 oz): $0.35
  Red wine jus (2 oz, sub-recipe): $1.40
  Herbs: $0.15
  Course 3 total per plate: $9.80

Course 4: Dark chocolate torte, salted caramel, whipped cream
  Torte slice (sub-recipe, 1/12 of batch): $1.80
  Salted caramel (1 oz, sub-recipe): $0.25
  Whipped cream (1.5 oz): $0.20
  Cocoa nib garnish: $0.10
  Flaky salt: $0.02
  Course 4 total per plate: $2.37

Bread service (focaccia, butter): $0.85 per guest
Amuse bouche (bite of soup): $0.40 per guest

TOTAL FOOD COST PER GUEST: $25.65
Pantry overhead (4%): $1.03
Overage factor (12%): $3.20

ADJUSTED FOOD COST PER GUEST: $29.88
TOTAL FOOD COST (12 guests): $358.56
```

### Beyond Food Cost: The Full Picture

Food cost is only one part of the event cost:

```
FULL EVENT COST BREAKDOWN:

Food cost: $358.56
  (Detail: per-dish breakdown above)

Labor:
  Shopping: 3 hours x $0 (chef time, built into fee) = included
  Prep: 6 hours x $0 (chef time, built into fee) = included
  Execution/service: 4 hours x $0 (chef time, built into fee) = included
  Cleanup: 1.5 hours x $0 (chef time, built into fee) = included
  Assistant cook (hired): 6 hours x $25 = $150.00
  Server (hired): 4 hours x $22 = $88.00
  Labor total: $238.00

Travel:
  Mileage (round trip 45 miles): $33.75 ($0.75/mile)
  Tolls: $5.40
  Travel total: $39.15

Equipment/Supplies:
  Disposable gloves, foil, parchment, towels: $15.00
  Printed menus (12 copies): $8.00
  Ice: $12.00
  Equipment rental (none this event): $0
  Supplies total: $35.00

Communication/Admin:
  Menu development, emails, calls: ~3 hours (built into fee)

TOTAL HARD COST: $670.71
```

### Food Cost Percentage

```
Food Cost % = Total Food Cost / Total Revenue x 100
```

In restaurants, target food cost percentage is typically 28-35%. Private chefs operate differently:

- Food cost percentage for private chefs: 20-30% is typical
- But food cost percentage alone is misleading (see Section 5)
- A $150/person dinner with 25% food cost = $37.50 food cost, $112.50 gross margin per guest
- A $75/person dinner with 20% food cost = $15.00 food cost, $60.00 gross margin per guest

The cheaper dinner has a "better" food cost percentage but half the actual dollar margin.

### Menu Stages

A menu goes through distinct stages. Each stage serves a different purpose:

**1. Menu Idea**

- Rough concept: "spring tasting menu, asparagus-forward, 5 courses"
- No costing, no portions, no detailed recipes
- Used for initial client discussion
- ChefFlow role: capture inspiration, seasonal notes, ingredient wishlist

**2. Draft Menu**

- Course titles and descriptions
- Preliminary ingredient list
- Rough cost estimate (ballpark, based on comparable past menus)
- No finalized recipes
- ChefFlow role: store draft, link to similar past menus, flag seasonal availability

**3. Costed Menu**

- Full recipes written or referenced
- Sub-recipes identified
- Ingredient costs populated (vendor or estimated)
- Yield calculations completed
- Portion sizes set
- Food cost per plate calculated
- Total food cost calculated
- Labor estimated
- Overhead estimated
- Margin calculated
- Price per person determined
- ChefFlow role: full costing engine, confidence flags, vendor price freshness

**4. Client-Facing Menu**

- Beautiful, clean course descriptions
- No costs visible
- No portion weights visible
- No sub-recipe references
- Allergens noted if required
- Wine pairing notes if applicable
- ChefFlow role: generate client-facing output from costed menu data

**5. Chef-Facing Production Menu (BEO/Prep Sheet)**

- Every recipe with quantities scaled to guest count
- Sub-recipes with batch quantities
- Prep timeline
- Equipment list
- Shopping list (organized by vendor/store section)
- Pack list (what goes in the vehicle)
- Fire order (sequence of cooking during service)
- Plating guide
- ChefFlow role: generate from costed menu, scaled to event

**6. Final Event Menu**

- Last-minute changes applied
- Substitutions noted
- Actual guest count confirmed
- Final prep quantities
- ChefFlow role: locked version of production menu

**7. Post-Event Actualized Menu**

- What was actually served
- What was substituted
- Actual food cost vs estimated
- Actual portions served
- Waste recorded
- Notes on what worked and what did not
- Actual labor hours
- Client feedback
- Profitability analysis
- ChefFlow role: close the loop, feed data back into intelligence

---

## 5. Menu Pricing Strategy

### Pricing Methods

**Cost-Plus Pricing:**

```
Price = Total Cost x Markup Multiplier

Example: Total cost per guest = $56
Markup: 3x
Price per guest: $168
```

Simple, transparent, guaranteed margin. But ignores market reality and perceived value.

**Market-Based Pricing:**
"What are other private chefs in this market charging for comparable service?"

If the market rate for a 4-course private dinner in this area is $125-175 per person, pricing at $250 may lose clients, and pricing at $75 leaves money on the table. Regardless of cost.

**Value-Based Pricing:**
"What is this experience worth to this client?"

A 30th birthday dinner for 8 close friends has different value than a Tuesday night family dinner for 4. Same chef, similar food cost, but the birthday dinner commands a premium because the occasion, the experience, and the perceived luxury are worth more to the client.

**The Reality: Blend All Three**

Professional chefs use cost-plus as a floor (never price below cost + minimum margin), market-based as a guide (stay competitive), and value-based for premium opportunities (signature events, luxury clients, unique experiences).

### Minimum Event Fee

Every private chef should have a minimum event fee, regardless of guest count.

```
Example:
  Minimum fee: $500

  A dinner for 2 guests still requires:
    Shopping: 2 hours
    Prep: 3 hours
    Travel: 1 hour
    Service: 3 hours
    Cleanup: 1 hour
    Total: 10 hours of work

  At $500 for 10 hours = $50/hour effective rate
  Food cost for 2 guests might only be $60

  Without a minimum, pricing at $85/person = $170
  $170 - $60 food = $110 for 10 hours = $11/hour
  That is below minimum wage.
```

The minimum exists because small guest counts do not reduce the fixed costs (travel, shopping, communication, setup, cleanup).

### Per-Person vs Flat-Rate vs Tiered

**Per-person pricing:** $125-200/person. Simple for clients to understand. Works well for 8-30 guests.

**Flat-rate pricing:** "$2,400 for a dinner party for up to 10 guests." Includes everything. Simple, clean. Works for standard offerings.

**Tiered pricing:**

- Basic menu: $95/person (3 courses, approx)
- Signature menu: $135/person (4 courses, premium proteins)
- Luxury menu: $185/person (5+ courses, luxury ingredients)

Clients self-select. The tiers frame expectations.

### Upgrade Logic

```
Base menu: $125/person (NY strip, seasonal vegetables, standard dessert)

Upgrades:
  Filet mignon (+$15/person): premium cut, lower yield, higher cost
  Lobster tail add (+$22/person): market price volatile, luxury perception
  Wagyu (+$45/person): A5 or domestic, extreme premium
  Truffle supplement (+$12/person): seasonal, luxury perception
  Extra course (+$18-25/person): additional labor + food cost
  Wine pairing coordination (+$20/person): time, expertise, markup

Complexity surcharge:
  Tasting menu (7+ courses): +$25-40/person for labor intensity
  Dietary accommodation (3+ restrictions): +$10/person for sourcing and prep complexity

Rush fee:
  Less than 7 days notice: +15-25%
  Less than 3 days notice: +25-40%

Travel fee:
  Beyond 25 miles one-way: $0.75-1.00/mile round trip
  Over 50 miles: consider overnight + per diem
```

### When Food Cost Percentage Is Misleading

Food cost percentage is the most quoted metric in the food industry. It is also the most misunderstood.

**Scenario 1: Cheap Ingredients, Low Margin**

- Pasta dinner: food cost 18% ($13.50 per person)
- Priced at $75/person
- Dollar margin: $61.50
- But prep took 8 hours and the chef is exhausted
- Labor-adjusted margin: much lower

**Scenario 2: Expensive Ingredients, Great Margin**

- Luxury steak dinner: food cost 30% ($52.50 per person)
- Priced at $175/person
- Dollar margin: $122.50
- Prep took 4 hours because steak is simple to execute
- Labor-adjusted margin: excellent

The pasta dinner has a "better" food cost percentage but half the dollar margin and double the labor. The steak dinner is more profitable in every real measure.

**Key insight:** Food cost percentage is useful for comparing similar menus. It is dangerous when used to compare different service styles, complexity levels, or price points. Dollar margin and effective hourly rate matter more.

### Why Labor Can Matter More Than Ingredient Cost

A dish can have cheap ingredients and be wildly unprofitable because of labor:

- Hand-rolled pasta for 50 guests: $0.40/portion in flour and eggs, 12 hours of labor
- Tasting menus: each plate takes 5-8 minutes to compose, multiplied by 7 courses and 12 guests = hours of plating
- Composed desserts with multiple sub-recipes: each component is cheap but requires separate prep, chilling, tempering, assembling

When evaluating a menu, the chef must calculate:

```
Effective Hourly Rate = (Revenue - All Costs) / Total Hours

Example:
  Revenue: $2,100 (14 guests x $150)
  Food cost: $420
  Staff: $250
  Travel/supplies: $80
  Net before chef labor: $1,350
  Total chef hours: 16 (planning, shopping, prep, service, cleanup)
  Effective hourly rate: $84.38/hour

  If the menu was more complex:
  Same revenue: $2,100
  Same food cost: $420
  Same staff: $250
  Same travel/supplies: $80
  But total chef hours: 24
  Effective hourly rate: $56.25/hour

  The "fancier" menu paid the chef $28/hour less.
```

### Private Chef vs Restaurant Pricing: Why They Cannot Be Compared

| Factor             | Restaurant                             | Private Chef                                  |
| ------------------ | -------------------------------------- | --------------------------------------------- |
| Fixed costs        | Spread across hundreds of covers/night | Absorbed by one event                         |
| Labor              | Shared kitchen team                    | Solo or small team                            |
| Equipment          | Full commercial kitchen                | What fits in a vehicle                        |
| Purchasing         | Bulk wholesale, standing orders        | Per-event, smaller quantities                 |
| Prep space         | Dedicated prep kitchen                 | Client's home kitchen (unknown until arrival) |
| Mise en place      | Built over service period              | Must arrive complete                          |
| Mistakes           | Send another plate from the line       | No backup; one shot                           |
| Volume discount    | Amortized across service               | No amortization                               |
| Client interaction | Minimal (server handles)               | Constant (chef is the experience)             |
| Customization      | None (eat the menu)                    | Total (every event is custom)                 |
| Revenue per hour   | $500-5,000+ (full dining room)         | $150-400 (one client)                         |

A restaurant can serve a $42 steak profitably because 80 other diners are also ordering. A private chef serving that same steak to 8 people cannot use restaurant math.

---

## 6. Scaling Menus by Guest Count

### Linear vs Non-Linear Scaling

Some things scale linearly:

- Salt and pepper: double the guests, double the seasoning
- Cooking oil for searing: roughly proportional
- Plating garnish: proportional per plate

Many things do not scale linearly:

**Sauces and purees:**

```
A sauce for 6 guests might need 12 oz (with overage).
A sauce for 50 guests needs ~60 oz, not 100 oz.
Why: larger batches are more efficient; you need less overage
  percentage at scale.

6 guests: 2 oz per plate x 6 = 12 oz + 4 oz overage = 16 oz
50 guests: 2 oz per plate x 50 = 100 oz + 10 oz overage = 110 oz

The overage dropped from 33% to 10%.
```

**Bread and dough:**
Dough recipes have yeast, which behaves differently in large batches. A focaccia recipe that works perfectly for 1 sheet pan cannot simply be multiplied by 10. Large dough batches:

- Take longer to mix
- Generate more friction heat (changes yeast activity)
- May need adjusted hydration
- Need longer bulk fermentation in some cases
- Need to be divided and handled differently

**Desserts with precise chemistry:**
Custards, souffles, meringues, tempered chocolate, and pastry creams do not scale linearly. Egg-based preparations in particular have scaling limits:

- A creme brulee base for 6 ramekins cannot simply be multiplied by 10
- Mix in batches of 12-15 maximum; larger batches risk curdling
- Ice cream base: process no more than 1.5 quarts per batch (machine capacity)

### Equipment Limitations

Scaling hits physical limits:

| Equipment          | Typical Capacity   | Implication               |
| ------------------ | ------------------ | ------------------------- |
| Standard home oven | 2 sheet pans       | 12 portions max per batch |
| Home stovetop      | 4 burners          | 4 pans simultaneously     |
| Home refrigerator  | 20-25 cu ft        | Limited holding space     |
| Blender            | 64 oz              | Puree in batches          |
| Stand mixer        | 5-7 qt             | Dough batches limited     |
| Portable cooler    | 2-3 sheet pans     | Transport constraint      |
| Vehicle            | Finite cargo space | Pack carefully            |

For a 50-guest event in a client's home, the oven becomes the bottleneck. Everything must be sequenced:

```
Oven schedule for 50-guest dinner (2 sheet pans at a time):
  3:00 PM - Roast vegetables batch 1 (400F, 25 min)
  3:30 PM - Roast vegetables batch 2
  4:00 PM - Bake focaccia batch 1 (425F, 20 min)
  4:25 PM - Bake focaccia batch 2
  4:50 PM - Roast potatoes batch 1 (400F, 30 min)
  5:25 PM - Roast potatoes batch 2
  6:00 PM - Proteins begin
  ...
```

This is why a menu designed for 6 guests may become operationally impossible for 50 guests in the same kitchen.

### When to Change the Menu Instead of Forcing Scale

**6-guest dish that breaks at 50:**

- Seared scallops: works beautifully for 6 (cook in 2 batches). For 50, you need 100+ scallops seared in maybe 12-15 batches on a home stove. By the time the last batch is done, the first is cold. Change to a preparation that holds better, or add a second cooking station.
- Individual beef Wellingtons: works for 6-8. For 50, you need 50 individual wrappings, precise bake times, and they cannot hold. Switch to a large-format Wellington (whole tenderloin in pastry, slice to serve).
- Risotto: works for 8 (one pot). For 50, you need multiple pots cooking simultaneously or a par-cook-and-finish method. The texture changes.
- Composed tasting plates: 5 minutes per plate x 7 courses x 50 guests = 29 hours of plating. Impossible. Change to family-style or simplified plating.

**The Rule:** If scaling a dish past a certain guest count changes the method, the quality, or the timing beyond recognition, change the dish. Do not force a 6-top fine-dining technique onto a 75-person event. That is a recipe for disaster.

### Practical Scaling Examples

```
Sunchoke Puree
  For 6 guests: 12 oz yield needed
    Sunchokes: 1 lb (70% yield after peel)
    Cream: 4 oz
    Butter: 1 oz
    Salt: 1/2 tsp
    Yield: ~14 oz
    Method: one pot, one blender batch

  For 50 guests: 100 oz yield needed
    Sunchokes: 8 lb
    Cream: 32 oz (1 qt)
    Butter: 8 oz
    Salt: 4 tsp
    Yield: ~112 oz
    Method: two pots, 3-4 blender batches
    Note: may need to adjust cream ratio slightly;
      larger batch retains more moisture from cooking
```

---

## 7. Menu Development and Rotation

### How Experienced Chefs Build Menus

Experienced chefs do not start from scratch. They build from known patterns, seasonal ingredients, and proven combinations.

**The mental model:**

A chef has a library of:

- Reliable proteins they know how to source, cost, and execute
- Reliable sauces/preparations for each protein
- Reliable starches/purees that pair with those proteins
- Reliable vegetable preparations by season
- Reliable dessert formats
- Reliable bread/pastry options

A "new" menu is usually a recombination of known elements with seasonal adjustments, not a ground-up invention.

### Cross-Utilization: The Efficiency Engine

Cross-utilization means using the same ingredient across multiple courses to reduce purchasing, prep, and waste.

```
Example: Asparagus appears in 3 courses
  Course 1: Shaved raw asparagus salad
  Course 2: Blanched asparagus spears as vegetable side
  Course 3: Asparagus veloute as sauce element

One purchase, one prep session (peel, blanch, portion), three applications.

Example: Citrus as a thread
  Course 1: Blood orange vinaigrette on salad
  Course 2: Lemon compound butter on fish
  Course 3: Meyer lemon curd for dessert

Citrus purchased once, zested and juiced in one session.
```

Cross-utilization reduces:

- Total unique ingredient count
- Shopping time
- Prep time
- Waste (more of each ingredient gets used)
- Cost (buying more of fewer items, better vendor pricing at higher volume)

### Menu Balance

A well-composed menu has balance across:

**Temperature:** Not all hot. Not all cold. Mix temperatures across courses.
**Texture:** Crispy + creamy + tender + crunchy. Every course should have textural contrast.
**Weight:** Start light, build to rich, end refreshing. Do not put three heavy courses in a row.
**Color:** The plate should look alive. Green, red, gold, brown. Monochrome plates feel dead.
**Flavor:** Acid, fat, salt, sweet, bitter, umami. Each course should hit different notes.
**Method:** Not all roasted. Not all seared. Not all raw. Variety in cooking techniques.

### Reusing Without Repetition

The key to sustainable private chef work is reusing proven components without making clients feel they are getting the same dinner.

**Strategy:**

- Base sauces rotate seasonally (winter: red wine jus, demi-glace; spring: beurre blanc, herb oil; summer: tomato vinaigrette, salsa verde; fall: brown butter, mushroom jus)
- Purees follow what is in season (winter: celery root, parsnip; spring: pea, asparagus; summer: corn, pepper; fall: butternut, sunchoke)
- Proteins rotate across events for the same client (never repeat the same protein two events in a row for the same client)
- Garnish library stays consistent (microgreens, herbs, finishing oils, toasted nuts, shaved vegetables) but changes seasonally
- Bread program rotates (focaccia, sourdough, brioche, grissini)

This allows the chef to have 5-6 well-tested preparations in each category and rotate them to create dozens of unique-feeling menus from a manageable repertoire.

---

## 8. Dish Breakdown Model

### The Component Architecture of a Dish

**Dish: Seared Scallops with Sunchoke Puree, Asparagus, Brown Butter Vinaigrette, and Herbs**

This single dish contains five distinct operational components:

#### Component 1: Protein (Seared Scallops)

```
Product: U-10 dry-packed sea scallops
Portion: 3 pieces per plate (approximately 4 oz raw total)
Yield: 80% (trim muscle tab, pat dry)
Cooked yield: ~75% (sear creates crust, some moisture loss)
Cost: U-10 scallops at $24/lb
  4 oz raw = 0.25 lb
  After trim yield: 0.25 / 0.80 = 0.3125 lb purchased
  Cost per plate: $24 x 0.3125 = $7.50

Method:
  Pat dry, season with salt.
  Sear in high-heat neutral oil, 2 min per side.
  Baste with butter last 30 seconds.

Prep timing: 5 min (clean, dry, season per batch of 12)
Fire timing: 4-5 min per batch (2 pans x 6 scallops each)
Hold limitation: NONE. Must be served within 60 seconds of sear.
  This is a fire-to-plate component. Cannot be made ahead.

Failure points:
  - Wet scallops will not sear (steam instead)
  - Pan not hot enough = no crust
  - Overcooking turns them rubbery (they go from perfect to ruined in 30 seconds)
  - "Wet-packed" scallops (treated with STP) contain excess water; always buy dry-packed

Scaling notes:
  For 6 guests: 2 pans, 1 batch
  For 12 guests: 2 pans, 2 batches (stagger by 3 min)
  For 25+ guests: this dish becomes very difficult
    Need 50+ scallops seared in rapid succession
    First batch cools while last batch cooks
    Consider searing and finishing in oven instead
    Or change to a different preparation (crudo, poached, roasted)
```

#### Component 2: Puree (Sunchoke Puree)

```
Product: Sunchokes (Jerusalem artichokes), cream, butter
Portion: 2 oz per plate (generous quenelle or smear)
Batch for 12: 24 oz + 6 oz overage = 30 oz

Ingredients (for 30 oz yield):
  Sunchokes: 2.5 lb ($3.50/lb) = $8.75
  Heavy cream: 8 oz ($0.50) = $0.50
  Butter: 2 oz ($0.40) = $0.40
  Salt, white pepper: pantry
  Batch cost: $9.65
  Cost per portion (2 oz): $9.65 / 15 portions = $0.64

Method:
  Peel sunchokes, dice, simmer in salted water until very tender (20-25 min).
  Drain. Blend with cream and butter until silky.
  Pass through fine-mesh strainer.
  Season. Hold warm.

Prep timing: 35-40 min total
Hold: up to 2 hours in bain-marie or thermal container, covered with plastic on surface
Can be made ahead: YES. Reheat gently, adjust consistency with cream.

Failure points:
  - Under-cooked sunchokes = grainy puree
  - Over-blending in a high-speed blender = gluey (do not over-process)
  - Oxides quickly if not held properly (turns grey)
  - Add lemon juice or vitamin C water if making ahead

Scaling notes:
  Scales very well up to 50 portions.
  At 50+, process in batches (blender capacity).
  Purees hold beautifully; this is a make-ahead component.
```

#### Component 3: Vegetable (Asparagus)

```
Product: Medium-thick asparagus spears
Portion: 3 spears per plate (approximately 2 oz)
Batch for 12: 36 spears + 6 overage = 42 spears
  (approximately 2 bunches)

Ingredients:
  Asparagus: 2 bunches ($3.50/bunch) = $7.00
  Olive oil: 1 tbsp = $0.12
  Salt, pepper: pantry
  Batch cost: $7.12
  Cost per portion: $7.12 / 14 = $0.51

Method:
  Snap woody ends. Peel lower 1/3 if thick.
  Blanch in boiling salted water 2-3 min until crisp-tender.
  Ice bath immediately.
  At service: reheat in butter in pan or on plancha, season.

Prep timing: 15 min (trim, blanch, shock)
Fire timing: 2 min (reheat at service)
Hold: blanched and shocked, can hold refrigerated 4-6 hours
Can be made ahead: YES (blanch-and-shock method)

Failure points:
  - Overcooked = mushy, army green
  - Undercooked = raw, squeaky
  - Inconsistent thickness = uneven cooking (size-sort first)

Scaling notes:
  Scales linearly. No issues at any guest count.
  Blanch in batches to maintain water temperature.
```

#### Component 4: Sauce (Brown Butter Vinaigrette)

```
Product: Butter, shallot, sherry vinegar, Dijon, honey
Portion: 1 oz per plate (drizzle)
Batch for 12: 12 oz + 4 oz overage = 16 oz (1 pint)

Ingredients:
  Butter: 8 oz ($2.00)
  Shallot: 1 oz ($0.25)
  Sherry vinegar: 3 oz ($1.35)
  Dijon: 0.5 oz ($0.20)
  Honey: 0.5 oz ($0.15)
  Salt: pantry
  Batch cost: $3.95
  Cost per portion (1 oz): $3.95 / 16 = $0.25

Method:
  Brown butter until nutty and amber.
  Strain solids. Cool slightly.
  Whisk in shallot, vinegar, Dijon, honey, salt.
  Emulsify.
  Serve warm or room temperature.

Prep timing: 15 min
Hold: room temperature up to 4 hours. Re-whisk before use.
Can be made ahead: YES. Re-emulsify before service.

Failure points:
  - Burning the butter (goes from brown to black in seconds)
  - Breaking the emulsion (add vinegar too fast)
  - Serving too hot (will wilt greens, overwhelm scallops)

Scaling notes:
  Scales well. At large batches, brown butter in stages
  (1 lb at a time for even browning).
```

#### Component 5: Garnish (Fresh Herbs)

```
Product: Chervil, chive tips, micro herbs
Portion: 0.25 oz per plate (a few leaves/pieces)
Batch for 12: 3 oz + 1 oz overage = 4 oz

Ingredients:
  Chervil: 1 small bunch ($2.50), using 2 oz = $1.25
  Chives: 1 bunch ($2.00), using 1 oz = $0.50
  Micro greens: 1 oz from 4 oz container ($7.00) = $1.75
  Batch cost: $3.50
  Cost per portion: $3.50 / 13 = $0.27

Method:
  Pick herb leaves. Cut chive tips (1 inch lengths).
  Store on damp paper towel, covered, refrigerated.
  Place at service.

Prep timing: 10 min
Hold: picked herbs hold 2-4 hours refrigerated

Failure points:
  - Wilted herbs (picked too early or stored improperly)
  - Bruised herbs (handled roughly)
  - Missing garnish (forgot to prep or ran out)

Scaling notes:
  Linear. Just prep more. No complexity change.
```

#### Full Dish Summary

```
SEARED SCALLOPS, SUNCHOKE PUREE, ASPARAGUS,
BROWN BUTTER VINAIGRETTE, HERBS

COST PER PLATE:
  Scallops:            $7.50
  Sunchoke puree:      $0.64
  Asparagus:           $0.51
  Brown butter vin:    $0.25
  Herbs:               $0.27
  Pantry overhead (4%): $0.37
  -------------------------
  TOTAL PER PLATE:     $9.54

TOTAL PREP TIME (for 12): ~65 min active
FIRE TIME (per batch of 6): ~5 min
HOLD LIMITATIONS: Scallops must fire at service
MAKE-AHEAD: Puree, blanched asparagus, vinaigrette, picked herbs
SERVICE ORDER:
  1. Warm plate
  2. Smear or quenelle puree (2 oz)
  3. Place asparagus (3 spears)
  4. Place scallops (3 pieces)
  5. Drizzle vinaigrette (1 oz)
  6. Place herbs
  7. Serve immediately
```

### Why This Component Model Matters for ChefFlow

A dish in ChefFlow is not a text block. It is a structured assembly of independently costed, prepped, scaled, and timed components.

Each component:

- Has its own cost
- Has its own yield
- Has its own timing
- Has its own scaling behavior
- Has its own hold limitations
- Has its own make-ahead potential
- Has its own failure points
- Can be swapped independently
- Can be reused across multiple dishes

When a chef swaps the protein from scallops to salmon, only Component 1 changes. The puree, asparagus, vinaigrette, and herbs may remain exactly the same. ChefFlow should recalculate only what changed.

---

## 9. Recipe Archetypes, Variations, Forks, and Modular Substitutions

### How Chefs Actually Think

Professional chefs do not invent most dishes from scratch. They work from patterns:

- "I know how to make a Wellington. What if I use a different filling?"
- "This sorbet base always works. Let me swap the fruit."
- "Protein + sauce + starch + vegetable + garnish. What is in season right now?"
- "Last month's menu was great. Same structure, swap the fish and the dessert."

This is not laziness. This is mastery. A chef with 30 years of experience has hundreds of proven patterns stored in memory. The best chefs are not constantly inventing; they are constantly recombining.

### Taxonomy of Recipe Relationships

**Base Recipe (Master Recipe):**
The canonical, tested, fully costed version of a dish. It has been executed successfully, costed accurately, and serves as the reference point.

**Recipe Variation:**
A minor modification to a base recipe. The structure, method, and most components remain the same. One or two elements change.

Changes that qualify as a variation:

- Swap a garnish (chervil instead of tarragon)
- Swap a seasonal vegetable (asparagus in spring, broccolini in fall)
- Adjust a spice profile (add smoked paprika to existing seasoning)
- Change a topping on a base (olive focaccia instead of plain)
- Swap a fruit in a sorbet base
- Change the cheese in a salad

A variation inherits most properties from the parent: method, yield, timing, most costs, scaling behavior. Only the changed elements need recalculation.

**Recipe Fork:**
A significant modification that changes enough of the dish that it behaves differently operationally, even though it clearly descends from a known structure.

Changes that create a fork:

- Swap the primary protein (beef Wellington to salmon Wellington)
- Change the cooking method (braised to grilled)
- Change the service style (plated to family-style)
- Change enough components that yield, timing, or cost structure shift significantly

A fork preserves lineage ("descended from Beef Wellington") but requires independent costing, timing, yield, and scaling verification. It is a new recipe that acknowledges its parent.

**Standalone Recipe:**
A dish with no meaningful relationship to another recipe in the system. It was created independently.

**Component Swap:**
Replacing a single component within a dish without changing anything else. The dish identity remains.

- Swap the puree: celery root instead of sunchoke
- Swap the sauce: beurre blanc instead of brown butter vinaigrette
- Swap the starch: polenta instead of potato

The dish is "the same dish" with one part changed. Cost, prep, and yield must be recalculated for that component only.

### The Wellington Case Study

**Base Recipe: Classic Beef Wellington**

Components:

1. Beef tenderloin (seared, chilled)
2. English mustard coating
3. Mushroom duxelle
4. Prosciutto wrap
5. Puff pastry
6. Egg wash

Fully costed, method documented, yield known, scaling rules known.

**Variation: Beef Wellington with Truffle Duxelle**

Component 3 changes: add black truffle to the duxelle.

Everything else stays the same. Method, timing, yield are identical. Only the duxelle cost increases (truffle is expensive). This is a variation.

Inherited: method, portioning, pastry cost, sear method, chilling protocol, bake temperature, bake time, plating.
Overridden: duxelle recipe (new sub-recipe), duxelle cost.
Recalculated: total plate cost.

**Fork: Salmon Wellington**

Component 1 changes: salmon replaces beef.

But this changes much more than just the protein:

- Internal temperature target changes (salmon: 125F vs beef: 130F)
- Cooking time changes (salmon cooks faster)
- Doneness window is narrower (salmon goes from perfect to dry quickly)
- The duxelle may be replaced with something that pairs better with fish (spinach and cream cheese, for example)
- The mustard coating may be replaced (horseradish cream, dill)
- The prosciutto may be removed (does not pair as naturally with salmon)
- The yield changes (salmon portions are different from beef)
- The cost structure changes entirely
- The food safety profile changes
- The resting protocol changes
- The slicing behavior changes

This is a fork. It descends from Wellington (same pastry-wrapped protein concept) but requires independent documentation of method, yield, timing, food safety, and cost.

**Decision framework: Is it a variation or a fork?**

| Question                                              | Variation | Fork   |
| ----------------------------------------------------- | --------- | ------ |
| Does the primary protein or main ingredient change?   | No        | Yes    |
| Does the cooking method change?                       | No        | Likely |
| Does the internal temperature target change?          | No        | Yes    |
| Does the food safety profile change?                  | No        | Yes    |
| Do more than 2 components change?                     | No        | Yes    |
| Does the yield calculation change?                    | No        | Yes    |
| Would you need to re-test the recipe?                 | No        | Yes    |
| Does the plating fundamentally change?                | No        | Maybe  |
| Could you train a new cook with "do it the same way"? | Yes       | No     |

If more than 2-3 answers point to "Fork," it is a fork.

### The Sorbet Base Case Study

**Master Formula: Sorbet Base**

```
Standard sorbet base (adjustable per fruit):
  Fruit puree: 500g
  Sugar: 150-200g (adjusted per fruit Brix)
  Water: 100-150g
  Lemon juice: 15-20g
  Pinch of salt
  Optional: 1g stabilizer (if not churning immediately)

Target Brix: 28-32 (measured with refractometer)
Method: Combine sugar, water, heat to dissolve. Cool. Add puree, lemon, salt.
  Chill. Churn.
Yield: approximately 1 quart
```

**Flavor Variations:**

| Variation      | Puree Source               | Sugar Adjustment              | Acid Adjustment | Notes                                 |
| -------------- | -------------------------- | ----------------------------- | --------------- | ------------------------------------- |
| Strawberry     | Strawberry puree           | 175g (strawberries are sweet) | 15g lemon       | Standard                              |
| Blueberry      | Blueberry puree            | 180g                          | 15g lemon       | Slightly sweeter to offset tannins    |
| Peach          | Peach puree                | 160g (peaches are sweet)      | 20g lemon       | More acid for balance                 |
| Citrus (lemon) | Lemon juice + zest         | 200g (very tart)              | No additional   | Needs more sugar                      |
| Herb (basil)   | Basil-infused simple syrup | 170g                          | 15g lemon       | Infuse basil into syrup               |
| Wine (rose)    | Rose wine reduction        | 180g                          | 10g lemon       | Reduce wine first; alcohol adjustment |

Each variation is clearly a variation of the same master formula. The structure, method, equipment, yield, and timing are essentially identical. Only the fruit/flavor source and sugar/acid ratios change.

ChefFlow should model this as:

- **One master sorbet formula** with documented base ratios
- **Individual flavor variations** that inherit the master formula and override only fruit source and sugar/acid/Brix adjustments
- **Cost calculated per variation** (strawberry puree costs differently than peach)
- **Yield assumed identical** unless a specific variation is noted to produce different texture (wine sorbet freezes differently due to alcohol)

**When a sorbet variation becomes its own recipe:**

If a chef creates a sorbet with alcohol (wine, champagne, liqueur), the freezing behavior changes. Alcohol depresses the freezing point. The texture will be different. The churn time changes. The storage behavior changes.

This variation may need to become a fork:

- Different Brix target
- Different churn protocol
- Different storage instructions
- Different serving temperature
- Different scoop behavior
- Independent testing required

### The Focaccia Case Study

**Master Formula: Basic Focaccia**

```
Flour: 500g bread flour
Water: 375g (75% hydration)
Olive oil: 50g + more for pan and topping
Salt: 10g
Yeast: 5g instant
Sugar: 5g

Method: Mix, autolyse 20 min, fold 3x over 1.5 hours,
  proof in oiled sheet pan 1-2 hours, dimple, oil, bake 425F 20-22 min.

Yield: 1 half sheet pan, approximately 14-16 pieces (2 oz each)
```

**Variations:**

| Variation | Changes from Base                          | Impact                                                              |
| --------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Rosemary  | Add rosemary + flaky salt before bake      | Garnish only. Same dough, yield, method, cost +$0.50/batch          |
| Tomato    | Cherry tomatoes pressed into surface       | Garnish only. Same dough. Add tomato cost.                          |
| Olive     | Kalamata olives folded in + pressed on top | Minor method change (fold in). Same dough base.                     |
| Garlic    | Roasted garlic kneaded into dough          | Minor method change. May slightly change texture.                   |
| Sweet     | Add 30g more sugar, honey drizzle          | Changes flavor profile significantly. Different use case (dessert). |
| Sandwich  | Reduce hydration to 68%, bake thicker      | Different texture, different portion, different use case. Fork.     |
| Laminated | Fold butter into dough layers              | Completely different method. Own recipe.                            |

The sweet version is a fork (different flavor category, different use case, different pairing). The sandwich version is a fork (different hydration, different bake, different portion logic). The laminated version is a standalone recipe (totally different method).

### The Protein + Sauce + Sides Template

Many private chef menus follow a core structure:

```
DISH TEMPLATE: Classic Main Course
  [Seared/Roasted/Braised Protein]
  [Seasonal Vegetable]
  [Starch or Puree]
  [Sauce]
  [Herb/Garnish Finish]
```

This template is not a recipe. It is a **dish archetype** or **menu template**.

Instances:

```
Spring:
  Pan-seared halibut
  English peas and pea tendrils
  New potato confit
  Beurre blanc with lemon and tarragon
  Chervil and chive

Summer:
  Grilled lamb chops
  Grilled zucchini with mint
  Corn puree
  Chimichurri
  Micro basil

Fall:
  Braised short rib
  Roasted root vegetables
  Celery root puree
  Red wine jus
  Crispy shallots and thyme

Winter:
  Seared duck breast
  Roasted Brussels sprouts
  Potato gratin
  Cherry gastrique
  Watercress
```

Each instance uses the same structural template. The chef does not need to reinvent the menu architecture. They plug seasonal ingredients into proven positions.

ChefFlow should:

- Allow chefs to define dish templates
- Auto-populate known costs when components are selected
- Calculate new plate cost as components are chosen
- Flag when a component has no prior costing data
- Suggest components from the chef's library that fit the template position
- Track which template instances have been used for which clients (to avoid repetition)

### Forking a Costed Menu

A chef ran a successful 4-course dinner for 12 guests in March. In June, a new client asks for a similar dinner for 8 guests.

The chef should be able to:

1. **Find the March dinner** by date, client type, course count, or ingredients
2. **Fork it** as a new event
3. **See what was costed, what was priced, what was actually spent**
4. **Adjust for the new event:**
   - Guest count: 12 -> 8 (recalculate batch quantities)
   - Season: March -> June (asparagus still in season but nearing end; check vendor price)
   - Protein: keep the same or swap (salmon was March; maybe halibut for June)
   - Dessert: keep the same (chocolate torte is season-agnostic)
   - Vendor prices: 3 months old; flag for update
   - Service style: same (plated)
   - Travel: different client location
5. **See a comparison:**
   - March dinner: $29.88/guest food cost, $2,400 total revenue, $1,729 net
   - June dinner (estimated): $32.15/guest food cost (halibut > salmon), $X revenue, $Y net
6. **Generate new quote** from forked menu
7. **After the event, record actuals** and compare both events

The original March dinner remains untouched. The fork is a new entity with a reference back to its source.

### When Is a Variation Its Own Recipe?

**Professional framework:**

A variation should become its own standalone recipe when ANY of the following are true:

1. **The primary ingredient changed** and affects cooking method, temperature, or food safety
2. **The cooking method changed** (braised instead of seared)
3. **The yield calculation is no longer valid** from the parent
4. **The allergen profile changed** (added nuts, removed gluten, etc.)
5. **The dietary classification changed** (was omnivore, now vegetarian)
6. **The equipment requirements changed** (needs a sous vide circulator instead of a pan)
7. **The scaling behavior changed** (parent scales to 50; this version caps at 12)
8. **The failure points are different** (parent is forgiving; this version has a narrow window)
9. **You would need to re-test it** before serving to a client
10. **A cook could not execute it from the parent recipe's instructions** without significant modification

If fewer than 3 of these are true, it is a variation.
If 3-5 are true, it is a fork.
If 6+ are true, it is a standalone recipe.

### Recipe Lineage: The Big Picture

ChefFlow should track recipe lineage as a tree:

```
Master Sorbet Formula
  |-- Strawberry Sorbet (variation)
  |-- Blueberry Sorbet (variation)
  |-- Peach Sorbet (variation)
  |-- Citrus Sorbet (variation, higher sugar)
  |-- Rose Wine Sorbet (fork: alcohol changes freezing)
  |-- Champagne Sorbet (fork: alcohol + carbonation)

Classic Beef Wellington
  |-- Truffle Wellington (variation: duxelle upgrade)
  |-- Salmon Wellington (fork: different protein, method, safety)
  |-- Vegetable Wellington (fork: entirely different filling, vegan)

Basic Focaccia
  |-- Rosemary Focaccia (variation: topping)
  |-- Olive Focaccia (variation: fold-in)
  |-- Sandwich Focaccia (fork: hydration, structure, use case)
  |-- Laminated Focaccia (standalone: different method entirely)
```

Each node tracks:

- Relationship to parent
- What was inherited
- What was overridden
- Cost delta from parent
- Method delta from parent
- Yield delta from parent
- Historical performance (events used, notes, profit)

This is how chefs actually work: they build from known patterns. ChefFlow should mirror this mental model.

---

## 10. Private Chef and Catering Reality

### Why Private Chef Is Not Restaurant

A restaurant amortizes costs across volume. A private chef absorbs all costs in a single event.

**Hidden costs that do not exist in restaurants:**

1. **Shopping time:** The chef personally selects every ingredient. A 12-guest dinner may require 2-4 hours of shopping across multiple vendors: fish market, butcher, produce market, specialty store, grocery store for staples. Restaurant: orders arrive by delivery truck.

2. **Travel time:** Round trip to the client's home. Could be 20 minutes or 2 hours. Restaurant: the kitchen is always in the same place.

3. **Client communication:** Menu discussions, dietary questions, follow-up emails, timeline coordination, last-minute changes. This can consume 3-5 hours per event. Restaurant: menu is fixed; guest orders from it.

4. **Unknown kitchen:** The chef arrives at a kitchen they may have never seen. Unknown oven calibration, unknown burner strength, unknown counter space, unknown equipment. Restaurant: same kitchen every day.

5. **Equipment transport:** The chef brings their own knives, pots, pans, sheet pans, blender, thermometer, torch, specialty tools. Everything must be packed, loaded, transported, unloaded, used, cleaned, repacked, and brought home. Restaurant: everything is already there.

6. **Food transport:** All ingredients, prepped components, and cold-chain items must be packed and transported in coolers. Hot items held in thermal bags. Restaurant: ingredients are in the walk-in.

7. **Setup time:** Upon arrival, the chef must organize the unfamiliar kitchen, unpack equipment, set up stations, check oven temperature, find utensils, find plates, find serving ware. 30-60 minutes before cooking even begins.

8. **Breakdown and cleanup:** After service, the chef cleans the kitchen to "better than found" standard, packs equipment, manages leftovers per client preference, removes all traces of the production. 60-90 minutes.

9. **No economies of scale:** A restaurant making 50 portions of a sauce amortizes the time and cost. A private chef making 12 portions of the same sauce uses the same technique with 1/4 the yield.

10. **Overbuying:** For a 12-guest dinner, the chef may buy 15 portions worth of protein (overage). The extra 3 portions are waste or leftovers. At a restaurant, 3 extra portions serve the next table. For a private chef, there is no next table.

11. **Premium service expectation:** The client is paying for a luxury experience. The food must be perfect. The service must be polished. The kitchen must be spotless after. The chef must be personable, professional, and invisible by turns. This is emotional labor on top of physical labor.

12. **Customization tax:** Every client wants something different. Dietary restrictions, preference lists, allergies, dislikes, cultural considerations. Each custom element adds sourcing time, prep complexity, and recipe adaptation. Restaurant: one menu for everyone.

### What "Price Per Person" Actually Covers

When a private chef quotes $150 per person for a 12-guest dinner:

```
Revenue: $150 x 12 = $1,800

What that covers:
  Menu development and client communication: 3-5 hours
  Shopping: 2-4 hours
  Prep (home kitchen or on-site): 4-8 hours
  Travel: 1-3 hours
  Setup: 0.5-1 hour
  Service: 2-4 hours
  Cleanup and breakdown: 1-1.5 hours
  Total chef hours: 14-26 hours

  Plus: food cost, travel cost, supplies, staff (if any)

If total non-food cost is $250 and food cost is $360:
  Net to chef: $1,800 - $360 - $250 = $1,190
  Divided by ~20 hours of work = $59.50/hour

That is the reality. The "luxury" private chef dinner pays
less per hour than many people assume.
```

The price must reflect the total operational promise: food, labor, expertise, travel, communication, equipment, setup, service, cleanup, and the guarantee of a perfect evening.

---

## 11. Historical Costing, Chef Memory, Vendor Records, and Pricing Intelligence

### The Old-School System

Before software, an experienced chef managed their operation with:

**Physical vendor price sheets:** Weekly faxes or printouts from each purveyor. Protein, produce, dairy, dry goods. Marked up by hand with notes: "halibut up 15% this week," "asparagus ending local season."

**Order guides:** Pre-printed lists with vendor product codes, pack sizes, and prices. The chef would circle items needed, write quantities, and call or fax the order.

**Recipe cards or binders:** Handwritten or typed 3x5 cards, or plastic-sleeved binder pages. Each recipe with ingredients, method, and yield. Some chefs kept two sets: one clean, one with handwritten modifications and notes.

**Notebooks:** Every experienced chef has a notebook. Menu ideas, client notes, "never do this again" warnings, wine pairings, vendor phone numbers, costing scratch work, yield tests, event notes.

**Spreadsheets:** The first digitization. A costed menu in Excel with ingredient costs, portion sizes, and total per-guest costs. Updated before each event. Manual process.

**Invoices and receipts:** Stuffed in folders by month or vendor. Compared against expected costs after events. Some chefs highlighted discrepancies: "Was supposed to be $24/lb, charged $28."

**Post-event notes:** "The scallop dish was great but the puree was too thin. Add less cream next time." "Ran out of bread. Make 3 trays instead of 2." "Client wanted more sauce on the steak. Note: she prefers saucy presentations."

**Mental memory:** "Tenderloin runs about $30-35/lb wholesale these days." "Scallops are expensive in winter." "This menu style usually runs me about $28-32 per person in food." "That client is easy; her sister is a nightmare."

### How Chefs Use Historical Dinners to Price New Ones

An experienced chef does not cost every new menu from scratch. They reference past events:

**Pattern matching:**
"This new inquiry is for a 10-person plated dinner with premium proteins. Last month's 12-person dinner with similar menu was $31/guest food cost. For 10 guests, my per-guest cost will be slightly higher (less efficient batches), so estimate $33-35."

**Component reuse:**
"This menu uses the same sunchoke puree, brown butter vinaigrette, and herb garnish as the Anderson dinner. I know those cost $1.45 per plate combined. I only need to cost the new protein and vegetable."

**Warning flags:**
"The last time I did a tasting menu for this guest count, the labor killed my margin. I need to add $10/person to account for plating time."

**Vendor awareness:**
"Halibut was $22/lb in March but it's always higher in summer. Check current price before quoting."

**Client pattern recognition:**
"This client added 3 guests last time with 24 hours notice. Build in flexibility."

### Estimated vs Historical vs Current vs Actual vs Theoretical

| Cost Type               | Definition                                     | Confidence | When Used                             |
| ----------------------- | ---------------------------------------------- | ---------- | ------------------------------------- |
| **Estimated**           | Best guess based on available information      | Low-Medium | New dish, no prior data               |
| **Historical**          | What it cost at a specific past event          | Medium     | Reference for similar future events   |
| **Current vendor**      | Today's price from vendor sheet or quote       | High       | Active costing for upcoming event     |
| **Actual (post-event)** | What was really spent (from invoices/receipts) | Highest    | Post-event reconciliation             |
| **Theoretical**         | What it should cost if executed perfectly      | Medium     | Benchmarking, variance analysis       |
| **Realized**            | Actual cost divided by actual portions served  | Highest    | True per-portion cost after the event |

### Post-Event Reconciliation

After every event, a professional chef should compare:

```
POST-EVENT COST ANALYSIS

Event: Johnson Dinner, April 15, 12 guests

                      Estimated    Actual    Variance
Food cost/guest:      $29.88       $33.42    +$3.54 (+12%)
Total food cost:      $358.56      $401.04   +$42.48
Staff cost:           $238.00      $263.00   +$25.00 (server stayed extra hour)
Travel/supplies:      $39.15       $41.20    +$2.05
Total cost:           $635.71      $705.24   +$69.53
Revenue:              $2,100.00    $2,100.00  $0
Net profit:           $1,464.29    $1,394.76 -$69.53

VARIANCE NOTES:
- Scallops were priced at $22/lb on order guide but invoiced at $24/lb (+$4.80 total)
- Bought extra asparagus bunch because first bunch had thick woody spears (+$3.50)
- Short rib needed longer braise than expected; used more wine (+$6.00)
- Herb overage: bought 3 varieties, used 2 fully, third was excessive (+$3.50)
- Client requested extra bread service (+$4.00)
- Server stayed additional hour for cleanup (+$25.00)
- Larger cooler needed for transport, bought extra ice (+$2.05)

LESSONS:
- Always confirm scallop price day-of or day-before
- Inspect asparagus carefully before purchasing; budget for extra bunch
- Short rib braise: increase wine allocation in recipe
- Reduce herb varieties or use shared herbs across courses
- Ask client about bread expectations during planning
- Book server for cleanup time, not just service time
```

This analysis feeds back into future pricing. The next time this chef costs a similar dinner, the estimates will be more accurate.

### How Records Become Intelligence Over Time

After 50 events:

- The chef knows average food cost by menu style and guest count
- The chef knows which dishes are consistently profitable
- The chef knows which dishes have hidden labor costs
- The chef knows which vendors are reliable on pricing
- The chef knows which ingredients fluctuate and by how much
- The chef knows which clients add guests, change menus, or require extra communication
- The chef knows which event types (wedding vs corporate vs casual dinner) require different pricing
- The chef knows their effective hourly rate by event type
- The chef knows which menus to recommend for which budgets

After 200 events:

- The chef can quote a menu in minutes because they have dozens of comparable events in memory
- The chef can predict problem areas before they happen
- The chef can price confidently because they have actual data, not estimates
- The chef knows their true cost structure, not the theoretical one

This accumulated knowledge is the chef's competitive advantage. It lives in notebooks, spreadsheets, memory, and experience. ChefFlow should capture it systematically so it compounds rather than fades.

---

## 12. Pricing When You Have No Prior Data

### The Cold Start Problem

A chef pricing their first private dinner, entering a new market, or creating a completely new menu style has no historical reference.

### The First-Pass Estimate Method

**Step 1: Define the scope fully before touching a calculator.**

- Guest count
- Number of courses
- Service style (plated, buffet, family-style, passed)
- Client expectation level (casual, upscale, luxury)
- Dietary restrictions
- Location and travel requirements
- Equipment reality (client's kitchen vs catering venue)
- Staffing needs
- Timeline
- What is included (shopping, setup, service, cleanup)
- What is NOT included (alcohol, rentals, florals)

**Step 2: Build the menu with current prices.**

Use whatever pricing sources are available, in this priority:

1. Call vendors for current pricing (best)
2. Check online wholesale catalogs
3. Visit retail stores and record prices
4. Use price databases or market reports
5. Use conservative estimates (assume higher)

**Step 3: Cost every recipe at current prices.**

Use the full costing method (Section 1): purchase price, yield adjustment, cooked yield, portion size, sub-recipes, pantry overhead.

**Step 4: Add uncertainty buffers.**

For a menu with no historical reference:

- Add 10-15% to food cost (unexpected waste, price changes, substitutions)
- Add 15-20% to labor estimate (unfamiliar kitchen, untested menu timing)
- Add 10% to travel/supplies (unknowns)

**Step 5: Flag confidence level.**

Mark the entire estimate as **LOW CONFIDENCE** or **ESTIMATED**. Do not present it as precise.

```
Example: First-time 4-course dinner for 10 guests

Food cost estimate: $32/guest (low confidence)
  Based on: retail pricing (no vendor relationship yet)
  Yield assumptions: standard charts (never tested these specific recipes)
  Uncertainty buffer: +12% applied

Labor estimate: 18 hours total (medium confidence)
  Based on: comparable complexity from restaurant experience
  Unknown: client's kitchen layout, drive time, setup needs

Total cost estimate: $750-850 (range, not a point estimate)
Quote recommendation: $145-165/person
  Floor: $145 (minimum acceptable margin)
  Target: $155 (comfortable margin with buffer)
  Ceiling: $165 (if market allows)

Flags:
  - No vendor pricing; using retail estimates (likely 20-40% high)
  - Recipes untested at this scale
  - Client kitchen unknown
  - First event for this client; communication overhead unknown
```

### The Conservative Principle

When pricing without data: **err on the side of quoting higher**. It is much better to come in slightly over market and negotiate down than to underprice and lose money.

An underpriced event cannot be repriced after the fact. The chef absorbs the loss. This is one of the most common mistakes in private chef pricing.

---

## 13. Pricing When You Do Have Prior Data

### The Intelligence Advantage

A chef with 100+ documented events can price with remarkable accuracy because they are not guessing. They are referencing.

### The Lookup Process

When a new inquiry arrives, the experienced chef:

1. **Classifies the event:** Guest count, service style, budget level, occasion type
2. **Finds comparable past events:** "10-person plated dinner, premium proteins, spring menu"
3. **Pulls actual costs from those events:** Not estimates. What was really spent.
4. **Adjusts for current conditions:**
   - Update ingredient prices to current vendor rates
   - Adjust for season (spring produce vs winter produce)
   - Adjust for inflation since last comparable event
   - Adjust for this client's specific requirements
5. **Calculates with confidence:** Because they know what similar events actually cost

```
Example: Inquiry for 14-person fall dinner

Comparable past events:
  #1: 12-person fall dinner (Oct 2025): $31.20/guest food cost, $2,520 revenue
  #2: 16-person fall dinner (Nov 2025): $28.50/guest food cost, $3,040 revenue
  #3: 10-person fall dinner (Sep 2025): $34.10/guest food cost, $1,850 revenue

Average food cost: $31.27/guest
Adjusted for current vendor prices (+4%): $32.52/guest
Adjusted for 14 guests (between 12 and 16): $31.80/guest (slight scale benefit)

Historical labor average for fall dinners: $340 (staff)
Historical travel average: $42

Total estimated cost: (14 x $31.80) + $340 + $42 = $827.20
Target margin: 3.0x on food, 2.5x all-in
Recommended quote: $148/person ($2,072 total)

Confidence: HIGH
  Based on 3 comparable events with actual data
  Vendor prices confirmed within last 2 weeks
  Similar menu structure to proven templates
```

### What Historical Data Enables

- **Faster quoting:** Minutes instead of hours
- **More accurate pricing:** Based on actuals, not estimates
- **Better margin management:** Know true profitability by event type
- **Pattern recognition:** "Tasting menus always cost more in labor than estimated"
- **Vendor intelligence:** "This vendor's prices have risen 15% this year"
- **Client intelligence:** "This client type averages 2 menu changes per event"
- **Seasonal intelligence:** "March halibut is $22/lb; July halibut is $28/lb"
- **Risk assessment:** "This menu style has a 20% variance; pad the quote"
- **Menu recommendations:** "For $100/person budget, these 5 menus have historically worked"

---

## 14. Expectations Before Food Costing

### Scope Defines Price

The price is not determined by what is on the plate. It is determined by the total scope of the commitment.

Two dinners with identical food cost can be priced very differently:

```
Dinner A:
  Drop-off for 8 guests
  Chef preps at home, delivers food in containers
  Client reheats and plates
  No service, no cleanup
  Total chef hours: 6
  Food cost: $200
  Quote: $600 ($75/person)

Dinner B:
  Full-service for 8 guests
  Chef shops, travels, sets up, cooks on-site, plates, serves, cleans
  Printed menus, wine pairing notes
  Total chef hours: 16
  Food cost: $200 (same food!)
  Quote: $1,400 ($175/person)
```

Same food. Different scope. Different price.

### The Scope Checklist

Before costing food, define scope:

**What is the client buying?**

- [ ] Menu development (custom or template)
- [ ] Shopping
- [ ] Travel to client location
- [ ] On-site cooking
- [ ] Plated service (chef serves each course)
- [ ] Buffet service (chef sets up, guests serve themselves)
- [ ] Family-style service (chef sends platters)
- [ ] Drop-off (no on-site presence)
- [ ] Cleanup (leave kitchen clean)
- [ ] Dishwashing
- [ ] Printed menus
- [ ] Wine/cocktail guidance
- [ ] Dietary accommodations
- [ ] Leftovers packaged for client
- [ ] Coordination with other vendors (servers, bartender, rentals)
- [ ] Setup (table setting, candles, etc.) - usually NOT chef's responsibility
- [ ] Multiple courses with timed pacing
- [ ] Interactive cooking (chef demonstrates, guests participate)
- [ ] Pre-event tasting (separate event, separate cost)

Each "yes" adds scope, which adds time, which adds cost, which adds to the quote.

ChefFlow should capture scope before generating a cost estimate. A costed menu without defined scope is meaningless.

---

## 15. Cost Confidence and Assumption Tracking

### Every Number Has a Story

A plate cost of "$14.37" looks precise. But precision is not accuracy.

That number might be:

- Perfectly accurate (vendor invoice from yesterday, recipe tested 10 times)
- Reasonable estimate (vendor price from last month, recipe tested twice)
- Rough guess (retail price, recipe never tested, yield assumed from chart)

ChefFlow should never display a cost without communicating confidence.

### Confidence Tiers

**Tier 1: Confirmed (Green)**

- Ingredient price from a vendor invoice or receipt dated within 30 days
- Yield verified by the chef through actual production
- Recipe executed at least 3 times with consistent results
- Portion size confirmed through actual service

**Tier 2: High Confidence (Blue)**

- Ingredient price from a vendor price sheet within 60 days
- Yield estimated from a similar recipe with the same technique
- Recipe executed 1-2 times
- Portion size based on standard professional guidelines

**Tier 3: Estimated (Yellow)**

- Ingredient price from a vendor price sheet older than 60 days or from retail
- Yield estimated from industry standard yield charts
- Recipe untested or tested once in a different context
- Portion size assumed from comparable dishes

**Tier 4: Low Confidence (Red)**

- Ingredient price unknown, sourced from online estimate or default
- Yield unknown or highly variable (new ingredient, unfamiliar product)
- Recipe never tested
- Portion size assumed
- First time for this service style or event type

### What ChefFlow Should Track Per Value

For every cost value in the system:

```
{
  value: 24.50,
  unit: "per lb",
  source: "vendor_invoice",       // or: vendor_sheet, retail, receipt, estimate, default, inherited
  source_date: "2026-05-01",
  vendor: "Harbor Fish Market",
  confidence: "confirmed",        // confirmed, high, estimated, low
  notes: "Dry-packed U-10 sea scallops",
  previous_value: 22.00,
  previous_date: "2026-03-15",
  price_change: "+11.4%",
  freshness_warning: false,       // true if older than 30 days
  inherited_from: null,           // or: recipe_id of parent
  overridden: false               // true if manually set on a variation
}
```

This is not over-engineering. This is the difference between "our costing is accurate" and "our costing is a guess displayed as fact."

---

## 16. Vendor Sheet and Invoice Workflow

### The Vendor Relationship

Professional chefs maintain relationships with 3-8 vendors:

| Vendor Type           | Products                             | Ordering Pattern                         |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| Protein purveyor      | Beef, pork, lamb, poultry, game      | Per-event order, 48-72 hours advance     |
| Seafood purveyor      | Fish, shellfish                      | Per-event order, 24-48 hours (freshness) |
| Produce distributor   | Vegetables, fruit, herbs             | Per-event or weekly standing order       |
| Dairy distributor     | Cream, butter, cheese, eggs          | Per-event or weekly                      |
| Dry goods distributor | Flour, sugar, oils, vinegars, spices | Monthly or as-needed                     |
| Specialty vendor      | Truffles, foie gras, specialty items | Per-event, often premium pricing         |
| Farmers market        | Seasonal, local produce              | Weekly, price varies                     |
| Retail grocery        | Emergency backup, staples            | As-needed                                |

### Price Sheet vs Invoice Reality

Vendors publish weekly price sheets. These are guides, not guarantees.

Common discrepancies:

| Price Sheet Says        | Invoice Shows                        | Why                                                   |
| ----------------------- | ------------------------------------ | ----------------------------------------------------- |
| Scallops $22/lb         | $24/lb                               | Market price moved between sheet publish and delivery |
| 50 lb case potatoes $28 | 50 lb case potatoes $32              | Vendor raised price, sheet was last week's            |
| Product X available     | Product X substituted with Product Y | Out of stock, vendor substituted                      |
| Case of 12 pints cream  | Case of 6 quarts cream               | Pack size changed                                     |
| Free delivery           | $15 delivery charge                  | Minimum order not met                                 |

**ChefFlow should:**

- Accept vendor price sheet imports (CSV, photo, manual entry)
- Accept invoice data (receipt scan, manual entry, photo-to-data)
- Flag discrepancies automatically
- Track actual paid price vs expected price
- Build vendor reliability scores over time
- Identify when a vendor consistently invoices higher than their sheet
- Identify seasonal patterns per vendor per product

---

## 17. Actual vs Theoretical Food Cost

### Theoretical Food Cost

Theoretical food cost is what the recipe says it should cost if:

- Every ingredient is purchased at the expected price
- Every yield assumption is correct
- Every portion is exact
- There is zero waste
- There are no substitutions
- There are no mistakes

Theoretical food cost is an ideal. It is useful as a benchmark but should never be confused with reality.

### Actual Food Cost

Actual food cost is what the event truly cost after all purchasing, waste, substitutions, overbuying, mistakes, and operational reality.

### Variance Analysis

```
FOOD COST VARIANCE: Johnson Dinner

                    Theoretical   Actual    Variance
Scallops (U-10):    $90.00       $97.20    +$7.20  (price higher than expected)
Short ribs:         $86.40       $86.40    $0.00   (matched)
Asparagus:          $7.00        $10.50    +$3.50  (extra bunch, quality issue)
Sunchokes:          $8.75        $8.75     $0.00   (matched)
Heavy cream:        $4.50        $4.50     $0.00   (matched)
Herbs:              $7.50        $11.00    +$3.50  (3 types, only used 2 fully)
Bread ingredients:  $4.00        $4.00     $0.00   (matched)
Chocolate/dessert:  $22.00       $22.00    $0.00   (matched)
Wine (cooking):     $12.00       $18.00    +$6.00  (braised longer, used more)
Misc/pantry:        $14.41       $16.00    +$1.59  (estimate was low)
                    --------     --------  --------
TOTAL:              $256.56      $278.35   +$21.79 (+8.5%)

ROOT CAUSES:
1. Scallop price drift: vendor price up from last month
2. Asparagus quality: first bunch had 30% waste, bought backup
3. Herb over-ordering: three varieties was one too many
4. Braise time: recipe said 2.5 hours; needed 3.5 hours; more wine consumed
5. Pantry overhead underestimated: more oil, butter, salt used than standard 4%

CORRECTIONS FOR FUTURE:
- Confirm scallop price before ordering (volatile)
- Budget for 1 extra bunch of asparagus
- Use 2 herb varieties max unless menu demands 3
- Increase braise wine allocation by 50%
- Raise pantry overhead to 5% for menus with braises and seared proteins
```

This analysis, done consistently after every event, is what turns a chef from "guessing at prices" to "knowing their numbers."

---

## 18. What Software Usually Gets Wrong

### Common Software Failures

**1. Treating recipes as static documents.**
Software stores a recipe as a fixed ingredient list and method. In reality, a recipe is a living document that evolves, has variations, forks, seasonal adaptations, and notes from every execution.

**2. Ignoring yield.**
Most recipe software assumes that if you buy 1 lb of something, you use 1 lb. In reality, you might use 0.6 lb after trim, waste, and cooking loss. This creates systematic under-costing.

**3. Ignoring labor.**
Food cost is one input. Labor cost is often equal or greater. Software that shows food cost per plate without labor context gives a dangerously incomplete picture.

**4. Ignoring event type.**
A 6-person tasting menu and a 50-person buffet are fundamentally different operations. Software that applies the same model to both will produce wrong results for at least one.

**5. Ignoring service style impact on portions.**
Buffet portions are 30-50% larger than plated portions. Software that uses one portion size regardless of service style undercosts buffets and overcosts plated.

**6. Ignoring recipe relationships.**
Every variation is a separate recipe with no connection to its parent. This creates duplication, divergence, and "recipe chaos" where the chef has 47 versions of a dish and cannot tell which is current.

**7. Ignoring uncertainty.**
Every price is displayed with the same confidence. A price sourced from yesterday's vendor invoice and a price guessed from a Google search look identical. This is dangerous.

**8. Failing to preserve operational memory.**
After an event, the data disappears or sits in a report nobody reads. The lessons from that event do not feed back into future pricing. The chef must remember everything manually.

**9. Treating private chef events like restaurant service.**
Restaurant logic assumes: fixed menu, high volume, stable pricing, professional kitchen, trained staff. Private chef reality is the opposite of all of these.

**10. Treating every menu as starting from zero.**
No concept of "this menu is based on that menu." No forking, no templating, no inheritance. Every new event requires complete re-entry of recipes, ingredients, and costs.

**11. Pretending prices are permanent.**
A recipe costed in January with January prices shows January's cost in July. No freshness warning, no staleness flag, no prompt to update.

**12. Separating client-facing from operational data... or worse, not separating them.**
Software either shows the client raw recipe data (ugly, confusing) or makes the chef maintain two separate documents (double work, divergence risk). The system should maintain one source of truth and generate appropriate views for different audiences.

**13. Ignoring what happened.**
Most software is forward-looking: plan the menu, cost the menu, send the quote. Very few ask: what actually happened? Was the estimate accurate? What should change?

### How ChefFlow Should Avoid These Mistakes

ChefFlow should:

- Model recipes as living, versioned, relationship-aware documents
- Calculate yield, trim, and cooked loss for every ingredient
- Track labor alongside food cost
- Distinguish event types and service styles
- Support recipe lineage (base, variation, fork, standalone)
- Display confidence level on every cost
- Close the loop after every event (actual vs estimated)
- Recognize private chef operations as fundamentally different from restaurant
- Support menu forking and template-based creation
- Flag stale prices and prompt for updates
- Generate client-facing and chef-facing outputs from the same data
- Learn from every event and get smarter over time

---

## 19. Product Requirements for ChefFlow

### Data Model Requirements

#### Recipe Schema

A recipe should contain:

- **Identity:** ID, name, category, cuisine/style, tags
- **Lineage:** parent_recipe_id (null if standalone), relationship_type (base, variation, fork, standalone), lineage_depth
- **Version:** version_number, created_date, modified_date, author
- **Yield:** batch_size_description, total_yield (weight/volume), portion_count, portion_size (weight/volume), portion_description
- **Ingredients:** array of ingredient records, each with:
  - ingredient_id (linked to ingredient master)
  - quantity, unit
  - prep_state ("diced," "blanched," "room temp")
  - yield_note (if applicable)
  - sub_recipe_id (if this ingredient is a sub-recipe output)
  - allergen_flags
  - cost_per_unit (populated by system)
  - cost_for_quantity (calculated)
  - cost_source (vendor_invoice, vendor_sheet, retail, estimate, inherited)
  - cost_source_date
  - cost_confidence (confirmed, high, estimated, low)
  - inherited_from_parent (boolean)
  - overridden (boolean)
- **Method:** array of steps with:
  - step_number, instruction_text
  - equipment_needed
  - temperature (if applicable)
  - time_range
  - critical_control_point (boolean)
  - warning_text (if applicable)
- **Timing:** total_active_prep, total_passive_time, fire_to_plate, max_hold_time
- **Food Safety:** internal_temp_target, cooling_protocol, reheat_protocol, hold_temp_and_time, allergen_summary, cross_contamination_notes
- **Service:** plating_description, plating_photo_ref, plate_type, sauce_application, garnish_placement, finishing_notes
- **Equipment:** full list
- **Scaling:** scales_linearly (boolean), max_batch_multiplier, min_batch_size, scaling_notes
- **Cost Summary:** total_batch_cost, cost_per_portion, pantry_overhead_pct, overall_confidence
- **History:** array of event_usage records (event_id, date, notes, what_worked, what_failed, what_changed, actual_cost, actual_yield)
- **Variation Tracking (if child):** inherited_fields (list), overridden_fields (list), cost_delta_from_parent, method_delta_notes, yield_delta_notes, allergen_delta, scaling_delta

#### Ingredient Schema

- ID, name, category (protein, produce, dairy, dry, spice, herb, oil, etc.)
- Allergen flags (dairy, gluten, nuts, shellfish, etc.)
- Dietary flags (vegan, vegetarian, kosher, halal, etc.)
- Standard yield percentage (default, overridable per recipe)
- Standard cooked yield percentage by method
- Unit conversions (weight-to-volume for common measures)
- Current prices: array of vendor_price records
  - vendor_id, price, unit, pack_size, date_captured, source (sheet, invoice, receipt)
- Price history: array of historical prices for trend analysis
- Volatility score (calculated from price history variance)
- Seasonality pattern (months when price is typically low/high)
- Preferred vendors (ordered list)
- Substitution suggestions (linked ingredient IDs)
- Notes

#### Vendor Schema

- ID, name, type (protein, seafood, produce, dairy, dry goods, specialty, retail)
- Contact info, ordering method, delivery days
- Minimum order, delivery fee structure
- Products supplied (linked to ingredients)
- Price sheet history (uploaded sheets with dates)
- Invoice history (uploaded or entered invoices)
- Reliability score (calculated: on-time, price accuracy, substitution frequency)
- Notes

#### Event Schema

- ID, event_name, date, client_id
- Guest count (estimated, confirmed, actual)
- Service style, event type, occasion
- Scope checklist (what is included)
- Menu (linked to menu record, which contains courses and dishes)
- Estimated costs (food, labor, travel, supplies, total)
- Actual costs (food, labor, travel, supplies, total)
- Revenue (quoted, collected)
- Profit (estimated, actual)
- Variance analysis
- Post-event notes
- Client feedback
- Staff used
- Forked from event_id (if applicable)

#### Menu Schema

- ID, name, version, created_date
- Courses: array of course records, each with:
  - course_number, course_name ("First Course," "Entree," etc.)
  - dishes: array of dish records, each with:
    - recipe_id
    - components: array of component records (protein, starch, veg, sauce, garnish)
    - per_plate_cost (calculated from components)
    - scaling_notes_for_this_event
- Total food cost per guest
- Total food cost for event
- Food cost percentage (if priced)
- Guest count this menu is scaled for
- Forked from menu_id (if applicable)
- Client-facing description (formatted text for each course)
- Chef-facing production notes
- Status (idea, draft, costed, quoted, confirmed, executed, closed)

### Calculation Engine Requirements

**Unit Conversion Engine:**

- Convert between weight units (g, oz, lb, kg)
- Convert between volume units (tsp, tbsp, fl oz, cup, pint, quart, gallon, ml, L)
- Convert weight to volume for common ingredients (using density tables)
- Handle "each" units (1 lemon, 1 bunch, 1 head)

**Yield Calculator:**

- Apply trim yield to as-purchased weight
- Apply cooked yield to trimmed weight
- Calculate as-purchased quantity needed from desired cooked portion
- Chain yields for multi-step preparations

**Batch Scaler:**

- Scale recipe by guest count
- Apply non-linear scaling rules where defined
- Round to practical purchase units (cannot buy 0.73 of a bunch)
- Calculate overage per guest-count tier
- Flag items that do not scale linearly

**Cost Aggregator:**

- Roll up sub-recipe costs into parent recipes
- Roll up component costs into dish costs
- Roll up dish costs into course costs
- Roll up course costs into menu costs
- Roll up menu costs into event costs
- Apply pantry overhead at configurable percentage
- Apply overage factor at configurable percentage

**Confidence Scorer:**

- Score each cost based on source, age, and verification
- Aggregate component confidence into dish confidence
- Aggregate dish confidence into menu confidence
- Flag low-confidence items for review

**Variance Calculator:**

- Compare estimated vs actual at every level (ingredient, recipe, dish, menu, event)
- Calculate percentage and dollar variance
- Identify top variance drivers
- Suggest corrections for future estimates

### Workflow Requirements

**"Use this past dinner as a starting point" workflow:**

1. Chef searches past events by date, client, menu style, guest count, or ingredients
2. Chef selects an event to fork
3. System creates a new event with all menu data copied
4. System flags all costs for freshness check
5. Chef adjusts guest count, swaps dishes, updates prices
6. System recalculates everything
7. Chef sees comparison to original event
8. Chef generates new quote

**"Fork this recipe" workflow:**

1. Chef selects a recipe
2. Chef chooses: create variation (minor changes) or create fork (significant changes)
3. System copies recipe, preserving lineage link
4. For variation: inherited fields are locked; only changed fields are editable
5. For fork: all fields are editable; lineage is recorded but no inheritance lock
6. System tracks cost delta, method delta, yield delta from parent
7. Both parent and child remain independently maintainable

**"Swap this component" workflow:**

1. Chef views a dish's component breakdown
2. Chef selects a component to swap (e.g., swap sunchoke puree for celery root puree)
3. System replaces that component's recipe, cost, yield, and notes
4. System recalculates dish cost
5. System flags if the swap changes allergens, dietary classification, or scaling behavior

**"This cost is stale" workflow:**

1. System detects ingredient prices older than 30/60/90 days
2. System flags stale prices on dashboard and in recipe/menu views
3. Chef can update price inline or bulk-update from a new vendor sheet
4. System recalculates all affected recipes, dishes, menus, and events

**Post-event debrief workflow:**

1. After event date, system prompts chef for actuals
2. Chef enters or uploads receipts/invoices
3. System compares actual vs estimated
4. Chef adds notes: what worked, what failed, what to change
5. System stores variance analysis with the event
6. Variance data feeds into future pricing intelligence

**Similar menu lookup:**

1. Chef describes a new inquiry (guest count, style, season, budget)
2. System finds 3-5 most similar past events
3. Chef sees those events' actual costs, margins, notes
4. Chef can fork any of them as a starting point

### Output Requirements

**Client-Facing:**

- Beautifully formatted menu (course titles, dish descriptions)
- No costs, no weights, no production notes
- Allergen notes where appropriate
- Professional appearance

**Chef-Facing:**

- Full production menu with batch quantities
- Prep list with timing
- Shopping list organized by vendor or store section
- Pack list for transport
- Fire order for service
- Plating guide with component placement

**Financial:**

- Cost breakdown by component, dish, course, guest, event
- Margin analysis
- Confidence indicators
- Historical comparison
- Variance report (post-event)

---

## 20. Summary: What ChefFlow Must Become

ChefFlow should not be a recipe calculator. It should be the chef's operational memory.

### What Gets Smarter Over Time

Every time the chef:

- **Costs a recipe:** the system learns ingredient prices, yields, and batch economics
- **Builds a menu:** the system learns menu structures, course patterns, and cross-utilization opportunities
- **Forks a recipe:** the system learns variation patterns and which modifications work
- **Runs an event:** the system learns actual costs, labor, and operational reality
- **Uploads a receipt:** the system learns real prices from real purchases
- **Receives a vendor sheet:** the system learns vendor pricing trends
- **Records waste:** the system learns yield accuracy and loss patterns
- **Adjusts a portion:** the system learns serving size preferences by context
- **Revises a quote:** the system learns pricing strategy and client responses
- **Logs actual profit:** the system learns true profitability by event type
- **Writes post-event notes:** the system captures operational wisdom

### The End State

A chef using ChefFlow for two years should be able to:

1. Receive a new inquiry
2. Search for similar past events in seconds
3. Fork a proven menu
4. See which prices are current and which need updating
5. Swap seasonal ingredients with known costs
6. Adjust for guest count with automatic batch scaling
7. See a confidence-rated cost estimate
8. Generate a client-facing menu and a chef quote
9. After the event, reconcile actuals against estimates
10. Watch their pricing accuracy improve with every event

This is how experienced chefs have always worked, except they did it with notebooks, spreadsheets, phone calls, and memory. ChefFlow should do it systematically, transparently, and cumulatively.

The recipes are not the product. The menus are not the product. The accumulated operational intelligence is the product.

---

## Appendix A: Common Mistakes by Inexperienced Chefs

1. Pricing food cost only, ignoring labor, travel, communication, and cleanup
2. Using purchase weight instead of usable weight for costing
3. Ignoring cooked shrinkage when calculating portions
4. Quoting before defining scope
5. Not accounting for minimum purchases (buying a case when you need 2 lb)
6. Using stale prices from months-old recipe cards
7. Not building overage into batch calculations
8. Treating every menu as brand new instead of building from proven templates
9. Not tracking actual vs estimated after events
10. Underpricing to win clients, then losing money on every event
11. Not factoring in the time cost of menu changes and client communication
12. Assuming a home kitchen has the same capacity as a professional kitchen
13. Not testing recipes at scale before committing to a large event
14. Treating food cost percentage as the primary metric (dollar margin matters more)
15. Not building a buffer for high-risk events, difficult clients, or new menus

## Appendix B: Common Mistakes by Software

1. No yield tracking (cost based on purchase weight, not usable weight)
2. No recipe relationships (every recipe is an island)
3. No temporal awareness (prices are permanent, never stale)
4. No confidence levels (all prices look equally reliable)
5. No post-event loop (estimate forward, never look back)
6. No distinction between service styles (same portions for plated and buffet)
7. No menu forking (every menu starts from scratch)
8. No component-level dish modeling (dish is a text block, not a structured assembly)
9. No scaling intelligence (everything is linear)
10. No labor integration (food cost exists in a vacuum)
11. No vendor tracking (prices without sources)
12. No client-facing vs chef-facing distinction (one output for everyone)
13. No event memory (no learning from past events)
14. No operational context (ignores travel, setup, cleanup, communication)
15. No uncertainty communication (false precision everywhere)

## Appendix C: Key Formulas

```
UNIT COST
  = Purchase Price / Number of Usable Units

EDIBLE YIELD %
  = Usable Weight / As-Purchased Weight x 100

COST PER USABLE UNIT
  = Purchase Price per Unit / (Yield % / 100)

TRUE COST PER COOKED PORTION
  = (Purchase Price / Trim Yield) / Cooked Yield x Portion Size

AS-PURCHASED QUANTITY NEEDED
  = (Portions x Raw Portion Size) / Trim Yield / (1 - Waste Factor)

FOOD COST %
  = Total Food Cost / Total Revenue x 100

EFFECTIVE HOURLY RATE
  = (Revenue - All Costs) / Total Chef Hours

BATCH COST PER PORTION
  = Total Batch Ingredient Cost / Number of Portions

TOTAL EVENT FOOD COST
  = Sum of (Per-Plate Cost x Guest Count) + Pantry Overhead + Overage

COST DELTA (variation from parent)
  = Variation Cost per Plate - Parent Cost per Plate

PRICE FRESHNESS
  = Days since price was last confirmed from vendor source
  Green: < 30 days
  Yellow: 30-60 days
  Orange: 60-90 days
  Red: > 90 days
```

---

_This document is a product-design reference. It does not describe current ChefFlow features. It describes how chefs actually work and what ChefFlow should support. Every product decision in the costing, recipe, and menu systems should reference this document._
