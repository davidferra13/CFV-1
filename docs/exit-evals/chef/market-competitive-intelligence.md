# Exit Eval: Chef / MARKET & COMPETITIVE INTELLIGENCE

> **Wave 1 | 2 scenarios | Batch 17**
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)
> **Evaluator:** Claude (exit-eval rubric v1)

---

## Scenario #91: Research trending cuisines/food trends in area

**Original classification:** Permanent exit. Trend-watching is cultural, not operational.
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to decide what to offer next season, what to pitch to a new client, or how to stay relevant in their market. The operational question is: "What are clients in my area asking for that I'm not offering?" This drives menu development, marketing messaging, and pricing strategy. The chef browses Instagram, Eater, TikTok, and food blogs to absorb cultural signals and translate them into bookable menus.

**Context ChefFlow has:**

- Chef's geographic region (home_state, zip, service area)
- All historical inquiry data with occasion types, cuisine requests, dietary tags
- All past event menus with cuisine_type fields
- Seasonal palettes with micro-windows (spring asparagus, summer stone fruit, etc.) already built in `lib/seasonal/helpers.ts` and `lib/public/public-seasonal-market-pulse.ts`
- Seasonal menu builder (`lib/intelligence/seasonal-menu.ts`) that suggests recipes by what is in-season
- Client dietary preferences and taste profiles (CP-Engine)
- Inquiry channel data showing which platforms generate what kinds of requests
- Menu intelligence with 11 toggleable sections in the editor context dock
- Directory listings table with `cuisine_types` array showing what cuisines are present in each market
- Recipe library with cuisine tags per recipe
- Booking event types table tracking what event types the chef offers

**Data source?** Partially yes. ChefFlow already has first-party demand data (what clients actually ask for). The gap is third-party cultural trend data (what food media is buzzing about). Sources:

- First-party: ChefFlow inquiry/event history, seasonal calendars, directory listing cuisine distribution (already in DB)
- Third-party: No free, reliable "food trend" API exists. Google Trends has an API but it measures search volume, not culinary trend depth. Instagram/TikTok trends are not API-accessible in any useful way.

**Client-collaborative angle:** Limited for trend research specifically. However, clients indirectly signal trends through their inquiry requests. A Dinner Circle survey asking "What cuisines are you excited about?" or "Any food trends you've been wanting to try?" could surface demand signals before the chef hunts externally. The inquiry pipeline already captures occasion type and sometimes cuisine preferences.

**Physical reality:** This is a screen/browsing activity, not a kitchen-hands scenario. The chef does this during planning time, not mid-cook. No print or voice interface needed. A dashboard or weekly digest email is the natural format.

**Compounding:** High. Trend intelligence compounds across the entire business:

- Inquiry demand patterns build over months/years ("Mediterranean requests up 40% this spring")
- Seasonal ingredient data already compounds via PIE seasonal patterns
- A chef who tracks what clients ask for vs. what they offer can spot gaps early
- Regional cuisine distribution data from the directory compounds as listings grow
- Menu performance data (which cuisine types get booked vs. declined) compounds per event

**Solution design:**

- **Demand Signal Dashboard:** Aggregate inquiry and event data to show "What clients in your area are asking for" by cuisine type, occasion, and season. Pull from existing inquiry records, event cuisine_type fields, and booking_event_types. This is entirely first-party data ChefFlow already captures.
- **Seasonal Market Pulse (chef-facing):** The public seasonal market pulse (`lib/public/public-seasonal-market-pulse.ts`) already exists for the public site. Surface a chef-facing version on the dashboard that says "What's in season now, what's coming, what's ending" tied to the chef's region and recipes. This is already built; it just needs a chef-side consumer.
- **Cuisine Gap Analysis:** Compare the chef's recipe library cuisine tags against what clients are requesting. "You've had 8 Mediterranean inquiries this quarter but only 2 Mediterranean recipes. Build your Mediterranean menu."
- **Weekly Trend Briefing:** A digest (dashboard card or email) summarizing: top requested cuisines this month, seasonal ingredient windows opening/closing, and any inquiry patterns that differ from last quarter. This uses existing data, no external API needed.

**Where it appears:**

- Dashboard: "Market Pulse" or "Demand Signals" card showing top requested cuisines and seasonal highlights
- Menu Builder: intelligence panel could show "This cuisine is trending in your inquiries"
- Weekly dashboard briefing (already has a price briefing; add a demand briefing)

**What remains as permanent exit:**
Cultural trend-watching (browsing Instagram reels of trending dishes, reading Eater longform, watching TikTok food content) is inherently external and creative. ChefFlow can tell the chef what their clients are asking for, but cannot replace the cultural osmosis of following food media. The chef will always browse food content for inspiration. That is permanent and healthy.

**Priority:** Medium frequency (monthly/seasonal planning) x Low-medium effort (mostly first-party data aggregation, no external APIs) = Medium-high rank signal. The demand signal dashboard is high-value because it uses data ChefFlow already collects but does not yet surface in aggregate.

**Spec needed?** Yes, for the Demand Signal Dashboard and Cuisine Gap Analysis. The seasonal market pulse chef-facing view is mostly a wiring task (consumer already exists, needs chef-side route).

---

## Scenario #92: Validate own pricing against market rates

**Original classification:** PIE market rate context; external validation is permanent exit.
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef is about to send a quote and needs confidence that their number is right for the market. The operational question is: "Am I leaving money on the table or pricing myself out of the job?" They go to Thumbtack to see what other chefs charge for similar events, check competitor websites for published rates, or ask in chef forums. The pain is uncertainty: quoting too low means lost revenue on every future event of that type; quoting too high means lost bookings.

**Context ChefFlow has:**

- **Market Positioning engine** (`lib/pricing/market-positioning.ts`): Already computes the chef's price tier (budget/value/mid_market/premium/luxury), percentile position, and difference from regional market average. Uses regional multipliers for 16 states.
- **Event Pricing Benchmarks**: Per-event-type benchmarks (dinner_party, cocktail_party, wedding, corporate, etc.) with p25/p50/p75/p90 percentiles, adjusted by region. Already stored in `openclaw.market_benchmarks` table.
- **Dish Price Positioning** (`getDishPositions`): Analyzes each recipe's price vs. market average, flags underpriced dishes, and calculates revenue potential if priced at market.
- **Revenue Optimization Summary** (`getRevenuePotential`): Shows total revenue left on the table across all underpriced dishes.
- **Industry Benchmarks by Archetype** (`lib/pricing/benchmarks.ts`): Detailed pricing benchmarks for 6 chef archetypes (private-chef, caterer, meal-prep, restaurant, food-truck, bakery) covering per-person rates, weekly rates, deposits, premiums, travel, and policies with low/mid/high ranges.
- **Pricing Intelligence Formula** (`lib/formulas/pricing-intelligence.ts`): Deterministic percentile math on historical data producing suggested min/max pricing, market position, and underbidding warnings.
- **Pricing Insights server action** (`lib/pricing/insights-actions.ts`): Chef-facing action that takes event parameters and returns pricing intelligence with confidence level.
- **Trend Intelligence** (`lib/pricing/trend-intelligence.ts`): Price trend forecasting, seasonal patterns, and volatility alerts for ingredients.
- **Food cost % benchmarks** by dish category (appetizer 28%, seafood entree 38%, etc.)
- Chef's complete event history with quoted prices, actual payments, guest counts, event types
- Chef's home state for regional adjustment

**Data source?** Yes, and ChefFlow already drinks from it. The market positioning engine uses industry benchmark data (BLS, marketplace surveys) stored as constants and adjusted by regional multipliers. The chef's own historical pricing feeds the percentile model. No external API call is needed at quote time because the benchmarks are pre-computed and stored in `openclaw.market_benchmarks`.

The only external data ChefFlow does not have is real-time competitor pricing from platforms like Thumbtack or Take a Chef. However:

- Thumbtack pricing is not API-accessible and changes constantly
- Competitor website rates are manually published and rarely updated
- Chef forum pricing discussions are anecdotal, not systematic
- The industry benchmark data ChefFlow already has (p25-p90 percentiles by event type by region) is more reliable than any of these external sources

**Client-collaborative angle:** Minimal for pricing validation. The client does not know market rates (that is the chef's expertise). However, the client's budget expectations (captured in inquiry data) are a demand-side signal. ChefFlow already captures quoted_price_cents and can compare against what clients in the area typically accept.

**Physical reality:** This is a planning/quoting activity done at a desk or on a phone during business hours. Screen-based. The natural surface is the quote builder or event pricing page where the chef is already setting prices. Pricing intelligence should appear contextually where the chef makes the decision, not in a separate tool.

**Compounding:** High. Every event the chef completes enriches the pricing model:

- More historical events improve the percentile calculations
- Regional benchmark accuracy improves as more chefs in a region use the system (multi-tenant future)
- Seasonal pricing patterns compound over years of data
- The chef's own pricing evolution is tracked (are they moving upmarket?)
- Underbidding detection gets more accurate with more data points

**Solution design:**

- **Surface existing Market Positioning in the quote flow:** `analyzeMarketPosition()`, `getEventBenchmarks()`, `getDishPositions()`, and `getRevenuePotential()` are all built but may not be wired into the quote builder UI. The chef should see "You're pricing this at p45 for a dinner party in MA. Market median is $125/head. Your quote is $108/head." right where they set the price.
- **Quote-time benchmark overlay:** When the chef enters a price on the event/quote page, show a visual band (p25-p75 shaded, p50 line) with the chef's price plotted on it. This is a pure UI task; the data layer is complete.
- **Underbidding warning integration:** `getRevenuePotential()` already flags underpriced dishes. Surface this as a toast or inline warning: "Your seafood entree is 22% below market. Potential gain: $8.50/serving."
- **Archetype benchmark comparison:** During pricing setup or settings, show the chef how their rates compare to `getBenchmarksForArchetype()` data. This is already built in the benchmarks system but may need better in-flow visibility.
- **Historical pricing confidence:** Show the chef "Based on your 23 completed dinner parties, your typical per-head is $X. The market range for your region is $Y-$Z." This uses existing `calculatePricingFormula()`.

**Where it appears:**

- Event detail / quote builder: benchmark overlay showing market position for this specific event type
- Pricing settings: archetype benchmark comparison during guided setup
- Dashboard: market position summary card ("You're in the Premium tier, p75")
- Menu editor: per-dish price position indicators (already computed by `getDishPositions`)
- Post-event review: "This event was priced at p62 for its type. Revenue potential if at p75: +$X"

**What remains as permanent exit:**
Very little. The chef might still occasionally browse Thumbtack to see specific competitor profiles or read chef forums for anecdotal pricing discussions. But for the core operational question ("Is my price right for this event?"), ChefFlow already has all the data needed. The exit becomes recreational/curiosity rather than operational.

**Priority:** High frequency (every quote/event) x Low effort (data layer is built, needs UI wiring) = **Highest rank signal in this batch.** This is a classic "feature is built in the backend but not surfaced where the chef makes the decision" gap.

**Spec needed?** No standalone spec. This is a wiring task: surface existing `market-positioning.ts`, `benchmarks.ts`, and `insights-actions.ts` data in the quote builder and event pricing UI. Could be a line item in the unified build queue rather than a full spec.

---

## Batch Summary

| #   | Title                                          | Reclassified To     | Spec Needed?                                         |
| --- | ---------------------------------------------- | ------------------- | ---------------------------------------------------- |
| 91  | Research trending cuisines/food trends in area | Partially Reducible | Yes (Demand Signal Dashboard + Cuisine Gap Analysis) |
| 92  | Validate own pricing against market rates      | Reducible           | No (UI wiring of existing backend)                   |

---

## Key Findings

**Scenario #92 is the standout.** ChefFlow has a complete market positioning backend (`market-positioning.ts` with tier analysis, event benchmarks by type/region, dish-level price positioning, revenue potential calculations) plus industry benchmarks for 6 chef archetypes and deterministic pricing intelligence formulas. The gap is purely presentation: this data needs to appear in the quote builder and event pricing flow where the chef actually makes pricing decisions. Zero new data sources or APIs required.

**Scenario #91 is partially addressable.** ChefFlow cannot replace cultural trend-watching (Instagram, Eater, TikTok), but it already captures first-party demand signals (inquiry cuisine requests, event types, seasonal patterns) that are not aggregated for the chef. A demand signal dashboard using existing inquiry and event data would reduce the operational need to browse external platforms for "what should I be cooking."

**Existing codebase assets discovered:**

- `lib/pricing/market-positioning.ts`: Full market position analysis (tier, percentile, event benchmarks, dish positioning, revenue potential)
- `lib/pricing/benchmarks.ts`: Industry benchmarks for 6 archetypes with per-person rates, policies, premiums
- `lib/formulas/pricing-intelligence.ts`: Deterministic pricing formula with market position and underbidding detection
- `lib/pricing/trend-intelligence.ts`: Price trend forecasting, seasonal patterns, volatility alerts
- `lib/pricing/menu-economics.ts`: Per-dish margin analysis and menu optimization
- `lib/public/public-seasonal-market-pulse.ts`: Seasonal market pulse (public-facing, needs chef-facing consumer)
- `lib/intelligence/seasonal-menu.ts`: Seasonal menu builder with recipe matching
- `lib/pricing/insights-actions.ts`: Chef-facing pricing insights server action
