# Exit Eval: Chef / COSTING & PRICING (Highest Frequency Exit)

> **Wave 1** | 7 scenarios | Category: Costing & Pricing
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)
> **Evaluator:** Claude (exit-eval rubric, 7-question protocol)

---

## Scenario #1: Cost out a menu using real retail prices

**Original classification:** Reducible (PIE data incomplete or stale for their region/items)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef needs to verify that the total ingredient cost for a proposed menu is accurate enough to quote a client. They open Amazon, Whole Foods, Instacart, or store apps to spot-check prices PIE is reporting, or to find prices PIE does not have. The operational decision is: "Can I serve this menu to 12 people for under $X food cost and still hit my margin target?" If PIE's coverage or freshness is weak for their specific ingredients and region, they cannot trust the number, so they manually price-check externally.

**Context ChefFlow has:**

- Full menu structure (courses, dishes, recipes, ingredients with quantities)
- Guest count for the event
- Chef's region/ZIP code
- PIE's 13-tier price resolution chain (chef overrides, receipts, API quotes, wholesale, scrapes, flyers, Instacart, regional averages, resolved national, government, historical, category baselines, synthetic)
- Recipe scaling engine
- Live menu cost resolution (`resolveEventMenuCostLive`)
- Menu economics engine with what-if scenarios, margin mapping, and optimization suggestions
- Food cost % targets by archetype (14 operation types with dynamic thresholds)
- Price confidence scores and resolution tier transparency per ingredient
- Yield-adjusted pricing (raw price / yield = true usable cost)

**Data source?** Yes. Store prices come from APIs (Kroger, Spoonacular, MealMe), scraped store websites (OpenClaw), Instacart proxy data, USDA government data, and wholesale distributor data. PIE already drinks from 27+ sources across a 15-tier resolution chain. The gap is coverage freshness and regional depth, not architecture.

**Client-collaborative angle:** Limited. The client does not typically know ingredient prices. However, if the client specifies a budget constraint ("I want to spend $80/person"), that target is already captured in ChefFlow's event/quote data and can drive the menu cost modeler. If the client has a preferred store or supplier, that could be collected via Dinner Circle and used to weight PIE's store preference.

**Physical reality:** Menu costing happens at a desk or on a couch during planning, not in the kitchen. Screen-based. The chef toggles between ChefFlow's menu editor and store apps on a phone or laptop. No messy-hands concern. The ideal interface is a live cost sidebar that updates as the chef adds/removes dishes, which ChefFlow's menu editor already has.

**Compounding:** High. Every menu costed builds the chef's price history. Receipt scans after shopping confirm or correct PIE estimates, training the system. Over time, PIE's confidence for that chef's typical ingredients in their region increases. The 50th menu should cost itself with near-zero external checks.

**Solution design:**

- Increase PIE coverage and freshness via Hermes queue expansion (more stores, more frequent scraping in chef's region)
- Surface per-ingredient confidence badges in the menu cost sidebar: green (receipt/API, high confidence), yellow (regional/national, moderate), red (synthetic/baseline, low). Chef knows exactly which prices to spot-check externally instead of checking everything.
- Add a "Verify prices" action that opens a targeted shopping-list view showing only low-confidence ingredients with direct links to store apps/websites for those specific items
- Receipt-to-price bridge feedback loop: after the chef shops, scanning the receipt auto-corrects PIE estimates for every ingredient on that receipt, compounding accuracy for future menus

**Where it appears:**

- Menu editor cost sidebar (`/culinary/menus/[id]`)
- Menu cost page (`/culinary/costing/menu`)
- Event detail cost panel (live menu cost resolution)
- Shopping list page (`/culinary/prep/shopping`)

**What remains as permanent exit:**
Even at 95%+ PIE coverage, chefs will occasionally spot-check a high-value ingredient (lobster tail, wagyu) at a specific store they plan to visit. The exit shrinks from "check everything" to "verify 1-2 items." That residual check is permanent.

**Priority:** Daily, multiple times x Medium effort = HIGH
**Spec needed?** No. The architecture exists. This is PIE coverage expansion + confidence badge UI, both incremental improvements.

---

## Scenario #2: Check current price of a specific ingredient

**Original classification:** Reducible (need today's price, not a synthetic estimate)
**Reclassified to:** Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef is pricing a quote, adjusting a recipe, or deciding whether to buy now vs. wait. They need to know: "What does a pound of king crab legs cost today at my local stores?" They open Google, a store app, or a vendor portal because they want a confirmed, current price, not a stale or synthetic estimate.

**Context ChefFlow has:**

- The ingredient (name, category, aliases via `system_ingredients` and `canonical_ingredients`)
- Chef's ZIP code and home state
- Universal price lookup (`lookupPrice`) with ZIP-aware store proximity (Haversine on 150K+ stores)
- 162K+ products in OpenClaw catalog with FTS + trigram matching
- Price history per ingredient (seasonal patterns, trend data)
- Confidence scoring and resolution tier transparency
- Real-time API quotes from Kroger, Spoonacular, MealMe
- Buyable price contract (tells the caller if the price is trustworthy enough to act on)

**Data source?** Yes. The external tools (Google, store apps) are just data sources. ChefFlow already has the architecture to drink from them via APIs and scraping. The gap is freshness: PIE data may be days or weeks old for some items, while the chef wants "right now" pricing.

**Client-collaborative angle:** None. Ingredient pricing is purely chef-side operational knowledge.

**Physical reality:** Screen-based lookup, typically on phone during planning or while browsing a store aisle. Quick glance needed: price, unit, store, confidence. Large text, minimal UI. Could benefit from Remy voice: "Hey Remy, what's king crab going for?" with a spoken response.

**Compounding:** Medium. Individual price checks do not compound directly, but they feed back into PIE's price history. If the chef pins a price after checking, that data improves future lookups. Seasonal pattern detection compounds across months of checks.

**Solution design:**

- Surface the universal price lookup (`lookupPrice`) as a prominent, always-accessible search bar in the culinary section (and via Remy voice)
- Show resolution tier honestly: "Kroger (2 mi away), seen yesterday" vs. "National median, 47 data points" vs. "Estimated from USDA baseline"
- For low-confidence results, show a "Check live" button that triggers a fresh API quote from Kroger/Spoonacular for that specific ingredient at the chef's ZIP
- Add a quick-pin action: after checking externally, one tap to set the confirmed price in PIE
- Remy voice integration: "What's the price of saffron?" returns the PIE lookup result spoken aloud

**Where it appears:**

- Price catalog browser (`/culinary/price-catalog`)
- Ingredient detail page
- Remy chat (text and voice)
- Recipe ingredient list (inline price display)
- Global search / command palette

**What remains as permanent exit:**
If PIE has fresh, local data with high confidence, this exit disappears entirely. The chef trusts the number without leaving. The only permanent residual is checking a vendor portal with login-gated pricing that PIE cannot access (specialty importers, ethnic market wholesalers).

**Priority:** Daily, multiple times x Low effort (infrastructure exists) = HIGHEST
**Spec needed?** No. The `lookupPrice` and `comparePrices` functions already exist. This is UI surfacing and freshness improvement.

---

## Scenario #3: Compare prices across multiple stores

**Original classification:** Reducible (finding cheapest source for a shopping list)
**Reclassified to:** Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef has a shopping list for an event and wants to know: "Should I go to Whole Foods, Market Basket, or Restaurant Depot for this order?" They open 3-4 store apps simultaneously, searching the same items in each, comparing prices and mentally calculating which store wins overall. The operational decision is route optimization: which single stop (or combination of stops) minimizes total cost.

**Context ChefFlow has:**

- The full shopping list (derived from event menu, recipes, guest count)
- Chef's ZIP code and nearby stores (150K+ stores with lat/lng, Haversine distance)
- Price comparison engine (`comparePrices`) that returns per-store pricing ranked by price
- Cross-store averaging (`cross-store-average.ts`) with store scorecards
- Product-level pricing across multiple chains per ingredient
- Wholesale vs. retail comparison engine with savings analysis
- Store reliability weighting (chain-level `reliability_weight`)

**Data source?** Yes. Store apps are just siloed views of product databases. ChefFlow already aggregates this data cross-store via OpenClaw. The gap is completeness: not every item at every local store has a price in the database.

**Client-collaborative angle:** Minimal. If the client has a Costco membership or wholesale account the chef could use, that could be collected. Otherwise, this is chef-side procurement intelligence.

**Physical reality:** Done at a desk or on a couch during planning. Screen-based, possibly multi-device (laptop + phone). The ideal interface is a shopping list with a store comparison matrix: rows = ingredients, columns = stores, cells = prices, with a total row showing which store wins.

**Compounding:** High. Store preferences and price patterns compound over time. After 10 events, PIE knows that Market Basket is consistently 15% cheaper for produce but Restaurant Depot wins on proteins. This intelligence auto-surfaces on future shopping lists.

**Solution design:**

- Build a shopping list store comparison view: given a shopping list (from event or manual), show a matrix of ingredients x nearby stores with prices, totals, and a "best store" recommendation
- Use existing `comparePrices` engine as the backend, batched across the full list
- Show a split-shopping recommendation: "Buy produce at Store A ($47), proteins at Store B ($82), total savings: $23 vs. single-store"
- Persist store preference data per chef for future recommendations
- Add "On Sale This Week" overlay: highlight items currently on sale at nearby stores (flyer data already in PIE)

**Where it appears:**

- Shopping list page (`/culinary/prep/shopping`)
- Event prep view
- Price catalog (`/culinary/price-catalog`) with store filter
- Bulk buy page (`/shopping/bulk`)

**What remains as permanent exit:**
The chef may still open a store app to check real-time stock availability (PIE tracks prices, not inventory levels). Checking "is this item actually on the shelf right now?" remains a permanent exit until stores expose inventory APIs.

**Priority:** Weekly, per event x Medium effort = HIGH
**Spec needed?** Yes, for the shopping list store comparison matrix view. The backend exists (`comparePrices`, `cross-store-average`), but the UI aggregation across a full shopping list is new.

---

## Scenario #4: Check specialty ingredient availability

**Original classification:** Partially Reducible (long-tail items PIE will never cover)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef is building a menu that calls for saffron threads, yuzu kosho, high-quality fish sauce, or dried hibiscus flowers. These are long-tail ingredients from specialty vendors (spice importers, Asian grocery stores, ethnic markets, online specialty retailers). The chef needs to know: "Can I get this? How much? How fast?" PIE's coverage of mainstream grocery chains does not extend to these vendors.

**Context ChefFlow has:**

- The ingredient name and category
- Chef's region/ZIP
- Subcategory-aware synthetic floors (e.g., saffron != cumin in the pricing model via `inferSubcategory` and `SUBCATEGORY_FLOOR_CENTS`)
- Price pinning (`pinIngredientPrice`) so the chef can manually record a specialty price
- Vendor notes page (`/culinary/ingredients/vendor-notes`)
- Ingredient sourcing actions (`lib/ingredients/sourcing-actions.ts`)
- Universal price lookup with trigram matching (can match unusual ingredient names)

**Data source?** Partially. Some specialty vendors have websites with prices that could be scraped (Kalustyan's, The Spice House, Penzeys). But many are login-gated, phone-order-only, or priced on request. The long tail is genuinely harder to source programmatically.

**Client-collaborative angle:** Occasionally relevant. If the client requests a specialty dish ("I want an authentic Thai green curry"), the chef may ask the client to confirm they are comfortable with the premium cost. The Dinner Circle could collect budget flexibility signals.

**Physical reality:** Desk-based research. The chef may spend 15-30 minutes browsing specialty vendor websites, comparing options, checking shipping times. Not time-critical, not kitchen-adjacent.

**Compounding:** High. Once a chef finds a source for yuzu kosho, that vendor, price, and lead time should be captured permanently. The 10th time they need yuzu kosho, the answer is instant. Vendor notes and pinned prices already support this pattern.

**Solution design:**

- Enhance the price pinning flow: when the chef finds a specialty price externally, make it one-tap to pin with vendor name, URL, lead time, and notes
- Build a "specialty sourcing" section per ingredient: shows pinned prices, vendor notes, and links to known specialty vendor websites
- For high-value specialty categories (spices, imported items, fermented products), pre-populate vendor directory links (Kalustyan's for Middle Eastern, H Mart for Korean, etc.) as starting points
- Surface "last sourced from" data on ingredient detail pages so the chef sees their own history
- Remy integration: "Where did I last buy saffron?" pulls from pinned prices and vendor notes

**Where it appears:**

- Ingredient detail page
- Recipe ingredient list (inline sourcing badge)
- Vendor notes page (`/culinary/ingredients/vendor-notes`)
- Sourcing page (`/culinary/sourcing`)
- Remy chat

**What remains as permanent exit:**
Browsing specialty vendor catalogs for new discoveries. The chef will always explore new suppliers. ChefFlow's job is to remember what they found and make the repeat purchase frictionless.

**Priority:** Per menu creation (occasional) x Low effort = MEDIUM
**Spec needed?** No. Price pinning, vendor notes, and sourcing infrastructure already exist. This is UI polish and pre-populated vendor links.

---

## Scenario #5: Verify seasonal availability

**Original classification:** Partially Reducible ("Can I even get ramps in May in my area?")
**Reclassified to:** Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef is planning a spring menu and wants to feature ramps, fiddlehead ferns, or soft-shell crab. They need to know: "Is this ingredient available in my region right now, or am I a week too early/late?" They check farmer websites, market schedules, and wholesaler portals. The operational decision is menu composition: swap the ingredient or adjust timing.

**Context ChefFlow has:**

- Seasonal calendar page (`/culinary/seasonal-calendar`) with per-ingredient monthly price indices
- `getSeasonalCalendar` action pulling from chef's recipe ingredients with 12-month price index data
- Seasonal analysis engine (`seasonal-analysis.ts`) with monthly price patterns, cheapest/most expensive month detection, and swing percentage
- Farmers market seasonal awareness (`farmers-market-seasonal.ts`) with in-season confidence boosters
- Seasonal availability page (`/culinary/ingredients/seasonal-availability`)
- Menu intelligence panel with seasonal warnings ("butternut squash out of season in July")
- 4-season flags on ingredients (year-round, spring, summer, fall, winter)

**Data source?** Yes. Seasonal availability is fundamentally a data problem: which months does this ingredient appear in local store/market data at reasonable prices? PIE's historical price data already contains this signal. When strawberries appear in flyer/scrape data in June but disappear in December, that IS availability data. Farmer market schedules and USDA seasonal guides are static reference data that can be ingested.

**Client-collaborative angle:** Minimal. The client does not know seasonal availability. However, if the client insists on an out-of-season ingredient, the chef needs to communicate the cost premium. ChefFlow's seasonal warnings already support this ("butternut squash out of season in July: expect 40% price premium").

**Physical reality:** Planning phase, desk-based. The seasonal calendar is a reference tool. Large, visual, calendar-style display is ideal. The chef glances at it while building a menu.

**Compounding:** Very high. Seasonal patterns are stable year over year. Once PIE has 2-3 years of price data for a region, the seasonal calendar becomes highly accurate. This is one of the highest-compounding data assets in the system.

**Solution design:**

- Strengthen the seasonal calendar with regional specificity: ramps appear in Vermont markets 2 weeks before Massachusetts. Use the chef's ZIP to adjust season windows.
- Add an "availability confidence" indicator per ingredient per month: green (confirmed in local data), yellow (appears in regional data), gray (no data, inferred from national patterns)
- Integrate seasonal warnings directly into the menu editor: when the chef adds a dish with an out-of-season ingredient, show an inline alert with the price premium and suggested substitutes
- Add "Coming soon" and "Season ending" indicators: "Ramps: 2 weeks until peak in your area" based on historical first-appearance dates
- Ingest USDA seasonal produce guides as a static reference layer to fill gaps where price data is sparse

**Where it appears:**

- Seasonal calendar (`/culinary/seasonal-calendar`)
- Menu editor intelligence panel (seasonal warnings already exist)
- Recipe ingredient list (inline seasonal badge)
- Ingredient detail page (seasonal pattern chart)
- Seasonal availability page (`/culinary/ingredients/seasonal-availability`)

**What remains as permanent exit:**
Checking specific farmer's market schedules for hyperlocal availability (e.g., "Is the guy at Haverhill Farmers Market bringing ramps this Saturday?"). This is real-time, person-specific information that cannot be sourced programmatically.

**Priority:** Per menu creation x Low effort (infrastructure exists) = MEDIUM
**Spec needed?** No. The seasonal calendar, seasonal analysis, and menu intelligence panels already exist. This is data enrichment and inline integration.

---

## Scenario #6: Look up bulk/wholesale pricing

**Original classification:** Partially Reducible (wholesale pricing is login-gated, not public)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef is prepping for a large event (40+ guests) or running a recurring meal prep operation. Retail prices are too high. They log into Restaurant Depot, US Foods, or Sysco portals to check case prices, minimum orders, and bulk discounts. The operational decision is: "Is the wholesale savings worth the larger quantity and the trip to a warehouse?"

**Context ChefFlow has:**

- Wholesale intelligence engine (`wholesale-intelligence.ts`) with 6 known distributors (Sysco, US Foods, Restaurant Depot, Performance Food Group, Costco Business Center, Chef's Warehouse)
- Wholesale vs. retail comparison engine with savings %, break-even quantity calculation
- Distributor coverage by state (Restaurant Depot available in MA, Chef's Warehouse in MA, etc.)
- Wholesale pricing tier in the 13-tier resolution chain (Tier 2.5: `openclaw_wholesale`)
- `getWholesaleSavings` and `calculateTotalSavings` query APIs
- Bulk buy page (`/shopping/bulk`)
- Estimated wholesale prices (markup model: retail price x distributor-specific discount factor)

**Data source?** Partially. Wholesale pricing is the hardest data to source because:

1. Login-gated portals (requires business account)
2. Custom pricing per customer (volume tiers, negotiated rates)
3. Frequent price changes (weekly or daily)
4. Pack sizes vary (50 lb case vs. 25 lb case)

PIE has a wholesale estimation model (apply distributor markup models to retail prices), but these are estimates, not confirmed wholesale prices. Real wholesale data requires either API partnerships with distributors or manual price entry by the chef.

**Client-collaborative angle:** None. Wholesale procurement is purely chef-side.

**Physical reality:** Desk-based, planning phase. The chef logs into portals on a laptop. Some chefs physically visit Restaurant Depot and check prices on the floor. For in-store scenarios, a mobile comparison view ("Is this case price better than what PIE estimates?") would be useful.

**Compounding:** High. Wholesale prices and vendor relationships are stable. Once a chef pins their Restaurant Depot prices for top-50 ingredients, that data serves every future large event. Vendor account details, preferred pack sizes, and delivery schedules all compound.

**Solution design:**

- Enhance the price pinning flow for wholesale: add pack size, case quantity, and distributor fields. When a chef pins "$42 for a 50 lb case of chicken breast from Restaurant Depot," PIE should auto-calculate per-unit wholesale price and show the retail vs. wholesale savings.
- Build a wholesale comparison view on the bulk buy page: given a shopping list, show estimated savings from switching to wholesale by distributor, with break-even quantities
- Allow manual wholesale price import: CSV or manual entry of wholesale price sheets. Some chefs get weekly price lists from their distributors via email.
- Surface the wholesale intelligence on event pages for large events: "This event has 45 guests. Wholesale from Restaurant Depot could save $180 on proteins."
- Show distributor availability by chef's state (already computed in `getDistributorsForState`)

**Where it appears:**

- Bulk buy page (`/shopping/bulk`)
- Event detail page (large event wholesale suggestion)
- Ingredient detail page (wholesale vs. retail comparison)
- Shopping list page (wholesale savings overlay)
- Vendor directory (`/culinary/vendors`)

**What remains as permanent exit:**
Logging into wholesale portals to check actual account-specific pricing and place orders. ChefFlow is not an ordering system. The chef will always visit Sysco.com or Restaurant Depot to transact. ChefFlow's job is to tell them WHEN wholesale is worth it and HOW MUCH they save, not to replace the purchase.

**Priority:** Weekly (for large events), per event x Medium effort = HIGH
**Spec needed?** No. Wholesale intelligence engine exists. The gap is UI surfacing (bulk buy page integration) and manual wholesale price import flow.

---

## Scenario #7: Calculate food cost % against a target

**Original classification:** Reducible (need to model "what if I swap this protein" scenarios)
**Reclassified to:** Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef opens a spreadsheet (Google Sheets or Excel) to model menu economics. They input ingredient costs, portion sizes, and sale prices, then calculate food cost percentage. They run what-if scenarios: "What if I swap the filet mignon for NY strip?" or "What happens to my margin if chicken goes up 15%?" The operational decision is pricing strategy: set the right price for the client while maintaining target margins.

**Context ChefFlow has:**

- Food cost % page (`/culinary/costing/food-cost`) with actual food cost % against revenue
- Menu cost page (`/culinary/costing/menu`) with per-menu cost analysis
- Recipe cost page (`/culinary/costing/recipe`) with per-recipe cost breakdown
- Menu economics engine (`menu-economics.ts`) with:
  - Dish cost analysis (true food cost per serving)
  - Margin mapping (profit margin per dish at current pricing)
  - What-if scenarios ("What if ingredient X goes up 20%?")
  - Menu optimization suggestions (swap ingredient, adjust portion, seasonal rotation, reprice)
  - Seasonal menu intelligence (best dishes per season by margin)
- Food cost rating by archetype (14 operation types with dynamic thresholds via `getFoodCostRating`)
- Food cost targets: `getTargetsForArchetype` returns `foodCostPctHigh` and `foodCostPctLow`
- Suggested price calculation from food cost (`calculateSuggestedPriceFromFoodCost`)
- Margin analysis per menu/event (actual vs. target, alerts)
- Price cascade (change ingredient price -> preview impact across all recipes/menus)
- Sales costing page (`/culinary/costing/sales`)

**Data source?** No. This is pure computation on data ChefFlow already has. There is no external data source. The spreadsheet is a worse version of what the menu economics engine already does.

**Client-collaborative angle:** Indirect. The client sets the budget constraint ("I want to spend $75/person"). The chef uses food cost % to determine if the proposed menu is profitable at that price point. Budget constraints are already captured in ChefFlow's quote/event data.

**Physical reality:** Desk-based planning. Spreadsheet work on a laptop. The ideal replacement is an interactive cost modeler in the menu editor with sliders: adjust guest count, swap ingredients, see margin impact in real time.

**Compounding:** High. Every menu modeled adds to the chef's understanding of their cost structure. Historical food cost % by event type, season, and client type compounds into pricing intelligence. Over time, ChefFlow can say: "Your average food cost % for 12-person dinner parties is 28%. This menu is at 34%, which is above your target."

**Solution design:**

- Ensure the menu economics engine is fully surfaced in the menu editor UI with interactive what-if controls:
  - Ingredient swap simulator: "Replace filet with NY strip" -> instant cost/margin recalculation
  - Guest count slider: see per-person cost change in real time
  - Margin target line: visual indicator showing where current menu falls against target food cost %
  - Price sensitivity: "If you charge $X/person, your food cost % is Y%"
- Add a "Menu Profitability Score" badge on menu cards: at-a-glance green/yellow/red based on food cost % vs. target
- Historical food cost % trend chart: show the chef how their food cost % has changed over time, by event type
- Pre-event margin check: when the chef finalizes a menu for an event, auto-run the food cost % check and warn if above target

**Where it appears:**

- Menu editor (inline cost/margin sidebar, already partially exists)
- Food cost page (`/culinary/costing/food-cost`)
- Menu cost page (`/culinary/costing/menu`)
- Event detail page (pre-event margin check)
- Dashboard (food cost % trend widget)

**What remains as permanent exit:**
Nothing. This exit is fully eliminable. The spreadsheet offers nothing that ChefFlow's menu economics engine cannot do better with live data. The only reason a chef opens a spreadsheet today is because they do not know the in-app tool exists, or the in-app tool's UX is not yet intuitive enough.

**Priority:** Per menu creation x Low effort (engine exists, needs UI polish) = HIGH
**Spec needed?** No. The menu economics engine (`menu-economics.ts`) and food cost calculation infrastructure are built. This is UI surfacing: making the what-if modeler interactive and prominent in the menu editor.

---

## Batch Summary

| #   | Title                                        | Original Classification | Reclassified To     | Spec Needed?                                |
| --- | -------------------------------------------- | ----------------------- | ------------------- | ------------------------------------------- |
| 1   | Cost out a menu using real retail prices     | Reducible               | Partially Reducible | No                                          |
| 2   | Check current price of a specific ingredient | Reducible               | Reducible           | No                                          |
| 3   | Compare prices across multiple stores        | Reducible               | Reducible           | Yes (shopping list store comparison matrix) |
| 4   | Check specialty ingredient availability      | Partially Reducible     | Partially Reducible | No                                          |
| 5   | Verify seasonal availability                 | Partially Reducible     | Reducible           | No                                          |
| 6   | Look up bulk/wholesale pricing               | Partially Reducible     | Partially Reducible | No                                          |
| 7   | Calculate food cost % against a target       | Reducible               | Reducible           | No                                          |

**Summary stats for this batch:**

- Reducible: 3 (#2, #5, #7)
- Partially Reducible: 3 (#1, #4, #6)
- Reducible (spec needed): 1 (#3)
- Bridgeable: 0
- Permanent: 0

**Key finding:** ChefFlow's PIE infrastructure is remarkably deep. The 13-tier price resolution chain, wholesale intelligence, seasonal analysis, menu economics engine, and price comparison engine collectively address the architecture needed for all 7 scenarios. The gaps are primarily: (1) data freshness and regional coverage in PIE, (2) UI surfacing of existing backend capabilities, and (3) confidence transparency so chefs know exactly which prices to trust and which to verify externally. No major new systems need to be built; this is coverage expansion and UX polish on existing engines.
