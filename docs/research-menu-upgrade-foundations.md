# Menu System Upgrade: Foundational Research

> Research covering all 10 categories required before coding the menu system upgrade.
> Status: 3 fully researched, 4 partial (now completed), 3 new (now completed).

---

## 1. Unit Conversion System for Recipe Ingredients

### The Problem

ChefFlow recipes use free-text units (cups, oz, lbs, "bunch", "to taste"). Scaling math breaks when units don't match across ingredients or between recipe yield and component portions.

### Industry Standard Conversion Factors

**Volume Conversions (US Customary)**

| From         | To                | Factor         |
| ------------ | ----------------- | -------------- |
| 1 gallon     | quarts            | 4              |
| 1 quart      | pints             | 2              |
| 1 pint       | cups              | 2              |
| 1 cup        | fluid ounces      | 8              |
| 1 cup        | tablespoons       | 16             |
| 1 tablespoon | teaspoons         | 3              |
| 1/4 cup      | tablespoons       | 4              |
| 1/3 cup      | tablespoons + tsp | 5 tbsp + 1 tsp |

**Metric Equivalents**

| US               | Metric    |
| ---------------- | --------- |
| 1 teaspoon       | 4.93 ml   |
| 1 tablespoon     | 14.79 ml  |
| 1 fluid ounce    | 29.57 ml  |
| 1 cup            | 236.59 ml |
| 1 ounce (weight) | 28.35 g   |
| 1 pound          | 453.59 g  |
| 1 kilogram       | 2.205 lbs |

**Density-Aware Conversions (Critical)**

A cup of flour does not weigh the same as a cup of sugar. Volume-to-weight conversions require ingredient density lookup.

| Ingredient             | 1 cup (grams) |
| ---------------------- | ------------- |
| All-purpose flour      | 120g          |
| Granulated sugar       | 200g          |
| Brown sugar (packed)   | 220g          |
| Butter                 | 227g          |
| Water/milk             | 240g          |
| Heavy cream            | 238g          |
| Honey                  | 340g          |
| Rice (uncooked)        | 185g          |
| Salt (table)           | 288g          |
| Salt (kosher, Morton)  | 241g          |
| Salt (kosher, Diamond) | 136g          |
| Cocoa powder           | 85g           |
| Rolled oats            | 90g           |

### Design Recommendation

**Phase 1: Deterministic unit normalization layer**

- Map all recognized units to a base unit category: VOLUME (ml), WEIGHT (g), COUNT (each)
- Store a `normalized_quantity` and `normalized_unit` alongside the chef's original entry
- Convert within categories (cups to ml, oz to g) automatically
- Flag cross-category conversions (cups to grams) as "needs density" and prompt chef to confirm

**Phase 2: Density-aware conversion (lookup table)**

- Build a static ingredient density table (~200 common ingredients)
- When a recipe uses volume units and costing needs weight, look up density
- Fall back to chef's original unit if no density data exists (never guess)

**What NOT to do:**

- Don't force chefs to use specific units (they won't)
- Don't silently convert without showing the chef what happened
- Don't use AI for unit conversion (Formula > AI, always)

Sources:

- [WebstaurantStore Measurements Guide](https://www.webstaurantstore.com/guide/582/measurements-and-conversions-guide.html)
- [Menubly Recipe Converter](https://www.menubly.com/tools/recipe-converter/)

---

## 2. Equipment Inference from Menu Content

### Staffing Data (Informs Equipment Needs)

Equipment needs correlate directly with service style and guest count. From industry sources:

**Front-of-House Equipment by Service Style**

| Service Style | Equipment Pattern                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Plated        | Dinner plates = guest_count _ courses, charger plates = guest_count, flatware sets = guest_count _ 1.1 (buffer)           |
| Buffet        | Chafing dishes = hot_component_count, platters = cold_component_count, serving utensils = 2 per dish                      |
| Cocktail      | Small plates = guest_count _ 1.5 (rotation), cocktail napkins = guest_count _ 3, passed trays = ceil(server_count \* 1.5) |
| Family Style  | Serving bowls/platters = dish_count _ ceil(guest_count / 8), serving utensils = dish_count _ 2                            |

**Kitchen Equipment (Deterministic from Menu)**

| Menu Content      | Equipment Needed              |
| ----------------- | ----------------------------- |
| Any hot dish      | Transport containers (hot)    |
| Any cold dish     | Coolers/cold transport        |
| Dessert course    | Dessert plates + forks        |
| Soup course       | Soup bowls + spoons           |
| Salad course      | Salad plates + forks          |
| Bread service     | Bread baskets + butter dishes |
| Raw/tartare items | Plate covers (temp control)   |

### Design Recommendation

Build deterministic inference rules (not AI):

1. Read service_style + guest_count + dish list from menu
2. Apply lookup table for plate/utensil counts
3. Apply component transport_category for transport equipment
4. Output checklist with quantities
5. Chef can edit/add/remove items (not locked)

Sources:

- [Elev8 Waitstaff Calculator](https://elev8.la/blog/waitstaff-calculator)
- [Qwick Catering Calculations Guide](https://www.qwick.com/blog/catering-calculations-guide/)

---

## 3. Cross-Event Grocery Consolidation

**Status: EXISTS** - Fully researched in `docs/research-UX5-grocery-consolidation.md`

Key finding: 4-8 hours/week saved per chef. Auto-trigger when events are confirmed in the same week. Implementation needs wiring to event confirmation FSM transition.

---

## 4. Prep Timeline Automation

**Status: EXISTS** - Implemented in `lib/scaling/prep-timeline.ts`

Backwards-planned from serve time, groups by day and station. Requires component metadata (`prep_day_offset`, `prep_time_of_day`, `prep_station`).

---

## 5. Food Cost Benchmarks by Service Type

### Industry Benchmarks

**Overall Target Ranges**

| Category                      | Food Cost % | Source                               |
| ----------------------------- | ----------- | ------------------------------------ |
| Catering/banquet standard     | 28-35%      | Industry consensus                   |
| High-end/fine dining catering | 20-25%      | Premium pricing covers cost          |
| Volume/casual catering        | 35-40%      | Offset by high quantities            |
| Private chef (custom menu)    | 25-35%      | Lower volume, higher per-cover price |
| Restaurant (sit-down)         | 30-35%      | NRA benchmark                        |

**By Service Style**

| Service Style        | Typical Per-Person Price | Implied Food Cost %                              |
| -------------------- | ------------------------ | ------------------------------------------------ |
| Plated dinner        | $90-150/person           | 22-28% (high price absorbs premium ingredients)  |
| Buffet/family style  | $25-65/person            | 30-38% (volume dishes, lower labor per guest)    |
| Cocktail/passed apps | $24-60/person            | 28-35% (small portions, high variety)            |
| Tasting menu         | $100-200/person          | 20-28% (premium experience, controlled portions) |

**By Cuisine Type (Approximate)**

| Cuisine               | Food Cost Tendency | Why                                        |
| --------------------- | ------------------ | ------------------------------------------ |
| Italian/Mediterranean | 28-32%             | Pasta/bread base is cheap, proteins vary   |
| French/fine dining    | 22-28%             | Technique-driven, premium pricing          |
| Mexican/Latin         | 25-30%             | Affordable proteins, produce-heavy         |
| Japanese/sushi        | 30-38%             | Premium fish, import costs                 |
| Comfort/American      | 28-35%             | Protein-heavy, familiar ingredients        |
| Plant-based/vegan     | 22-28%             | No premium proteins, produce is affordable |

**Markup Formulas**

- **Cost-Plus:** Selling Price = Total Cost + (Total Cost \* Markup%)
- **Margin-Based:** Price = Total Cost / (1 - Desired Margin)
- **Standard catering markup:** 3x food cost (33% food cost target)
- **High-end markup:** 4-5x food cost (20-25% food cost target)

**Menu Component Allocation (Per-Person)**

| Component               | % of Total Price         |
| ----------------------- | ------------------------ |
| Appetizers              | 15-20%                   |
| Main courses            | 40-50%                   |
| Desserts                | 10-15%                   |
| Non-alcoholic beverages | ~10%                     |
| Alcoholic bar service   | 20-30% (200-300% markup) |

### Design Recommendation for ChefFlow Alerts

| Food Cost % | Alert Level      | Message                                                       |
| ----------- | ---------------- | ------------------------------------------------------------- |
| < 20%       | Info (blue)      | "Strong margin. Premium pricing or low-cost menu."            |
| 20-30%      | Good (green)     | "Healthy food cost range."                                    |
| 30-35%      | Watch (yellow)   | "Food cost above 30%. Review portions or pricing."            |
| 35-45%      | Warning (orange) | "High food cost. Consider substitutions or price adjustment." |
| > 45%       | Critical (red)   | "Food cost over 45%. You may be losing money on this event."  |

Sources:

- [Galley Solutions - Catering Pricing](https://www.galleysolutions.com/blog/how-to-price-a-catering-menu-for-profitability)
- [Toast - How to Price Catering](https://pos.toasttab.com/blog/on-the-line/how-to-price-catering)
- [Best Food Trucks - Catering Costs 2025](https://www.bestfoodtrucks.com/blog/how-much-does-catering-cost)
- [FreshBooks - Charge for Catering](https://www.freshbooks.com/hub/estimates/estimate-catering-jobs)

---

## 6. Allergen/Dietary Compliance

**Status: EXISTS** - Fully researched in `docs/food-safety-compliance-system.md` and `docs/research-D8-constraint-profiles.md`

85+ million Americans with dietary constraints. Allergen propagation already implemented (ingredient > recipe > component > dish > menu). Event ops kit includes disclosure language templates.

---

## 7. Menu Versioning and Revision Tracking

### Industry Patterns

**Typical Revision Workflow (Wedding/Corporate Catering)**

1. Chef proposes initial menu (based on consultation)
2. Client reviews, provides feedback (1-2 weeks)
3. Chef revises and re-sends (often with tasting option)
4. Client approves or requests another round
5. Menu locked (typically 2-4 weeks before event)

**Average Revision Rounds by Event Type**

| Event Type             | Typical Rounds       | Lock Lead Time   |
| ---------------------- | -------------------- | ---------------- |
| Intimate dinner (2-12) | 1-2                  | 3-7 days before  |
| Corporate event        | 1-2                  | 1-2 weeks before |
| Wedding                | 2-4                  | 2-4 weeks before |
| Recurring client       | 0-1 (template-based) | Same week        |
| Tasting menu           | 1-2                  | 1 week before    |

**Best Practices from Approval Software**

- Track every comment, revision, and approval status (transparent audit trail)
- Allow side-by-side version comparison (old vs. new)
- Auto-notify reviewer when it's their turn
- Escalate overdue approvals
- Freeze snapshot at send time (JSONB, not live reference)

### ChefFlow Current State

ChefFlow already has:

- `menu_approval_requests` table with JSONB snapshot
- Multi-round revision support (sent > approved/revision_requested cycle)
- `menu_state_transitions` immutable audit trail

### What's Missing

1. **Side-by-side diff view** - client should see what changed between revision rounds
2. **Revision counter** - show "Revision 3 of Menu X" in the approval UI
3. **Time-to-approval tracking** - how long did the client take to respond?
4. **Approval analytics** - which clients take longest, which menus get most revisions

### Design Recommendation

- Add `revision_number` to `menu_approval_requests` (auto-increment per event)
- Store both current and previous snapshot in approval request for diff rendering
- Add `avg_approval_hours` computed metric to client profile
- Build a simple diff view: highlight added/removed/changed dishes between snapshots

---

## 8. Seasonal Ingredient Availability (Northeast US)

### Month-by-Month Produce Calendar

**January-February (Deep Winter)**

- Vegetables: potatoes, onions, turnips, parsnips, sweet potatoes, winter squash, kale, Brussels sprouts, cabbage, beets, carrots, leeks, sunchokes, rutabagas, Swiss chard
- Fruits: stored apples, pears (early winter only)
- Citrus (imported): lemons, limes, oranges, grapefruits, blood oranges, kumquats
- Herbs: rosemary, thyme, sage

**March-April (Early Spring)**

- Vegetables: asparagus, ramps, fiddlehead ferns, dandelion greens, nettles, garlic scapes, spring onions, radishes, turnips, carrots, spinach, kale, collard greens, broccoli, cabbage, lettuce, Swiss chard
- Fruits: rhubarb (late April)
- Mushrooms: morels (April-May)

**May (Late Spring)**

- Vegetables: peas, pea shoots, fava beans, artichokes, squash flowers
- Fruits: strawberries, rhubarb
- Herbs: most fresh herbs begin

**June-July (Early Summer)**

- Vegetables: corn (late June), green beans, cucumbers, zucchini, yellow squash
- Fruits: strawberries, raspberries, blueberries, cherries, elderberry
- Stone fruit begins: peaches, plums, nectarines, apricots

**August (Peak Summer)**

- Vegetables: tomatoes, peppers, eggplant, corn, fennel, okra, tomatillos, lima beans
- Fruits: melons (cantaloupe, honeydew, watermelon), peaches, plums, blueberries
- Herbs: basil, thyme, rosemary, dill, mint (peak)

**September-October (Early Fall)**

- Vegetables: tomatoes (early), eggplant, cauliflower, broccoli rabe, Brussels sprouts, kale, cabbage, winter squash (butternut, acorn), sweet potatoes
- Fruits: apples, pears, grapes, cranberries, quince
- Wild mushrooms, chestnuts

**November-December (Late Fall/Early Winter)**

- Vegetables: root vegetables (parsnips, turnips, rutabagas, celery root), potatoes, leeks, kale, cabbage, Brussels sprouts, winter squash
- Fruits: apples (stored), cranberries, pomegranates
- Herbs: rosemary, thyme, sage (hardy herbs)

### Design Recommendation

Build a static lookup table (`lib/menus/seasonal-produce.ts`):

```typescript
type Season = 'spring' | 'summer' | 'fall' | 'winter'
type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const SEASONAL_PRODUCE: Record<string, Month[]> = {
  asparagus: [3, 4, 5, 6],
  tomatoes: [7, 8, 9, 10],
  strawberries: [5, 6, 7],
  corn: [7, 8, 9],
  'butternut squash': [9, 10, 11, 12, 1, 2],
  // ... ~100 common ingredients
}

function isInSeason(ingredient: string, eventMonth: Month): boolean
function getSeasonalProduce(month: Month): string[]
function getOutOfSeasonIngredients(ingredientNames: string[], eventMonth: Month): string[]
```

Use this to:

1. Surface "in-season now" suggestions in menu editor sidebar
2. Flag out-of-season ingredients (yellow warning, not blocking)
3. Suggest seasonal substitutions (deterministic, not AI)

Sources:

- [Nerds with Knives - NE Seasonal Guide](https://nerdswithknives.com/seasonal-produce-guide/)
- [SNAP-Ed Seasonal Produce Guide](https://snaped.fns.usda.gov/resources/nutrition-education-materials/seasonal-produce-guide)
- [FRESHFARM What's in Season](https://www.freshfarm.org/whats-in-season)
- [Farm Flavor - All 50 States](https://farmflavor.com/lifestyle/garden/season-produce-calendars-50-states/)

---

## 9. Staffing Ratios by Service Style

### Server-to-Guest Ratios

| Service Style        | Standard Ratio                     | Notes                                            |
| -------------------- | ---------------------------------- | ------------------------------------------------ |
| Plated dinner        | 1 server : 8 guests                | Must deliver hot plates within 30 seconds        |
| Family style         | 1 server : 15-20 guests            | Manages 4-5 platters per table with rotation     |
| Buffet               | 1 server : 20-40 guests            | Stocks/cleans buffet, beverage service, clearing |
| Cocktail/passed      | 3 staff : first 50, then 1 per 50  | Combined food + beverage tray pass               |
| Cocktail (food only) | 2 staff : first 50, then 1 per 100 | Food tray pass only                              |

### Kitchen Staff Ratios

| Scale           | Kitchen Staff     | Head Chef/Lead       |
| --------------- | ----------------- | -------------------- |
| Up to 50 guests | 2-3 kitchen staff | Chef handles lead    |
| 50-75 guests    | 3 kitchen staff   | 1 dedicated lead     |
| 75-150 guests   | 4-6 kitchen staff | 1 lead per 75 guests |
| 150+ guests     | Scale linearly    | Add leads as needed  |

### Bar Service

| Service          | Ratio                   |
| ---------------- | ----------------------- |
| Beer & wine only | 1 bartender : 50 guests |
| Craft cocktails  | 1 bartender : 35 guests |
| Bar backs        | 1 per 2-3 bartenders    |

### Captains / Leads

| Threshold   | Captain Ratio               |
| ----------- | --------------------------- |
| 5+ servers  | 1 captain                   |
| 15+ servers | 1 additional captain per 15 |

### Complexity Adjustments

| Factor                    | Adjustment                    |
| ------------------------- | ----------------------------- |
| Multi-level venue         | +15% staff                    |
| Wine pairing service      | +1 server per 50 guests       |
| Complex menu (5+ courses) | +1 server per 75 guests       |
| Events 6+ hours           | +30% staff (fatigue rotation) |
| VIP/high-touch            | Reduce ratio to 1:6           |

### Private Chef Context

For private chef events (typical 2-30 guests):

| Guest Count         | Typical Setup                 |
| ------------------- | ----------------------------- |
| 2-8 (intimate)      | Chef only (cooks + serves)    |
| 9-16 (small dinner) | Chef + 1 server               |
| 17-30 (medium)      | Chef + 1 sous + 1-2 servers   |
| 31-50 (large)       | Chef + 1-2 sous + 2-3 servers |

### Design Recommendation

Build `lib/events/staffing-calculator.ts`:

```typescript
function calculateStaffing(input: {
  guestCount: number
  serviceStyle: 'plated' | 'buffet' | 'cocktail' | 'family_style' | 'tasting_menu'
  courseCount: number
  eventDurationHours: number
  hasBarService: boolean
  barType?: 'beer_wine' | 'cocktails'
  isMultiLevel?: boolean
}): StaffingRecommendation

interface StaffingRecommendation {
  servers: number
  kitchenStaff: number
  bartenders: number
  barBacks: number
  captains: number
  totalStaff: number
  notes: string[] // adjustment explanations
  estimatedLaborCostCents?: number // if hourly rates configured
}
```

Deterministic. No AI. Display as suggestion on event detail page when menu is linked.

Sources:

- [Elev8 Event Staffing Calculator](https://elev8.la/blog/waitstaff-calculator)
- [Qwick Catering Calculations Guide](https://www.qwick.com/blog/catering-calculations-guide/)
- [On The Fly Tapsters Staffing Guide](https://www.ontheflytapsters.com/staffing-guide)
- [Event Staff - Wedding Ratios](https://eventstaff.com/blog/staff-to-guest-ratios-for-weddings-what-planners-dont-tell-you)
- [Cvent Banquet Service Ratios](https://www.cvent.com/en/blog/events/banquet-service-ratios)
- [Premier Staff Event Ratios](https://premierstaff.com/blog/shorts/12-event-staffing-ratios-every-planner-should-know/)

---

## 10. Document Generation Templates

### What Chefs Actually Use During Service (BOH)

Based on existing research and industry practice:

**Prep Sheet (Day-Before)**

- Organized by station or by time block (morning/afternoon/evening)
- Each task: recipe name, quantity, special notes
- Checkbox format (mark as done)
- Must show make-ahead window (e.g., "Can be done up to 2 days ahead")

**Service Execution Sheet (Day-Of, BOH)**

- Organized by course, sequential
- Each component: numbered, with cooking method and timing
- Plating instructions per dish
- Allergen flags per dish (for front-of-house communication)
- Fire order timing (when to start each course relative to service time)

**Grocery List (Shopping)**

- Grouped by store section (produce, protein, dairy, pantry, specialty)
- Consolidated across all components (not per-dish)
- Shows quantity needed, unit, and whether it's a staple (already have) or needs buying
- Price estimate per item (if ingredient pricing exists)

**Equipment Checklist (Packing)**

- Grouped by category (cookware, serviceware, transport, disposables)
- Checkbox format with quantities
- Separate "rental" section for items not owned

**Front-of-House Menu (Client-Facing)**

- Clean, elegant layout (no technical notes)
- Course names with descriptions
- Dietary tags (GF, DF, V, VG, NF)
- No prices visible to guests

### ChefFlow Current State

Already implemented:

- FOH menu PDF (`lib/documents/generate-front-of-house-menu.ts`)
- Grocery list generator (`lib/documents/generate-grocery-list.ts`)
- Menu sheet with BOH section (`docs/menu-sheet-revision.md`)
- Equipment checklist UI (recipe scaling engine, Tab 5)

### What's Missing

1. **Auto-trigger on event state transition** (confirmed > generate pack)
2. **Prep sheet as standalone document** (currently tab in scaling UI, not exportable)
3. **Service execution sheet** (fire order timing, sequential by course)
4. **Document pack bundle** (single download of all documents for an event)

### Design Recommendation

No new research needed. Implementation is ready based on existing generators + the auto-trigger design in `docs/menu-system-upgrade-design.md` Phase 3.

---

## Summary: Research Readiness

| Category                 | Status              | Ready to Code?                          |
| ------------------------ | ------------------- | --------------------------------------- |
| 1. Unit conversion       | NOW COMPLETE        | Yes, Phase 1 (deterministic mapping)    |
| 2. Equipment inference   | NOW COMPLETE        | Yes, deterministic lookup               |
| 3. Grocery consolidation | Already complete    | Yes, wire to FSM                        |
| 4. Prep timeline         | Already implemented | Yes, already built                      |
| 5. Food cost benchmarks  | NOW COMPLETE        | Yes, update alert thresholds            |
| 6. Allergen compliance   | Already complete    | Yes, add disclosure auto-identification |
| 7. Menu versioning       | NOW COMPLETE        | Yes, add revision counter + diff view   |
| 8. Seasonal availability | NOW COMPLETE        | Yes, build static lookup table          |
| 9. Staffing ratios       | NOW COMPLETE        | Yes, build deterministic calculator     |
| 10. Document templates   | NOW COMPLETE        | Yes, add auto-triggers + bundle export  |

**All 10 categories are now fully researched. The foundational work is complete. Ready to code.**
