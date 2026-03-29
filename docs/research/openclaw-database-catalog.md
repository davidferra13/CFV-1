# Research: OpenClaw Database Catalog (Complete)

> **Date:** 2026-03-29
> **Question:** What is every possible database OpenClaw could build to give ChefFlow ground truth reference data?
> **Status:** complete

## Summary

30 databases identified across 5 tiers. These are NOT 30 separate OpenClaw cartridges. They are scraper jobs organized into a small number of cartridges (profiles), just like price-intel already runs 14 scrapers inside one profile. The grouping into cartridges is defined below.

## How This Maps to OpenClaw Cartridges

OpenClaw runs one profile at a time on the Pi. Each profile is a full environment (files, services, cron, Docker). Swapping profiles is manual and takes the previous one offline. So we group related scrapers into as few profiles as possible.

### Proposed Cartridge Organization

| Cartridge (Profile)          | Databases It Builds                                                                                                                                                                                          | Infrastructure                                        | Notes                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`price-intel`** (existing) | #1 Market Rates, #6 Equipment Pricing, #12 Wine/Beverage Pricing, #20 Utility Costs, #24 Specialty Sourcing, #27 Seasonal Forecast, #30 Delivery Platform Pricing                                            | SQLite + cron + HTTP scrapers                         | Extends existing price scraping infra. Same pattern: hit APIs/sites, store prices, sync to ChefFlow. Already running 14 scrapers; these add ~7 more.                                    |
| **`market-intel`** (new)     | #2 Supplier Directory, #4 Rental Kitchen Directory, #5 Health Inspections, #8 Local Farm/CSA, #9 Permits/Licenses, #25 Pop-Up Venues                                                                         | SQLite + cron + Google Places API + gov site scrapers | Directory-style data: locations, contacts, ratings, requirements. Scrape once/week, not daily.                                                                                          |
| **`lead-engine`** (new)      | #3 Venue Kitchen Intel, #10 Event Demand Heatmap, #11 Catering Lead Monitor, #13 Restaurant Closure Monitor, #17 Corporate RFP Monitor, #19 Vendor Network, #23 Wedding Cost Index, #29 Cooking Class Market | SQLite + Puppeteer + cron                             | Prospecting-focused. Requires browser automation for wedding sites, job boards, RFP portals. Feeds ChefFlow's prospecting module.                                                       |
| **`trend-watch`** (new)      | #7 Staffing Rates, #14 Allergen Recalls, #15 Menu Trend Index, #16 Insurance Rates, #18 Dietary Trend Forecasting, #22 Competitor Menus, #26 Wealth Proxy, #28 Food Media Tracker                            | SQLite + cron + RSS + light scraping                  | Trend and intelligence data. Mix of RSS feeds (FDA recalls), periodic scrapes (job boards, insurance sites), and public data downloads (Census, IRS). Lower frequency, higher analysis. |
| **`claw-swarm`** (existing)  | Could assist any cartridge with AI-powered extraction                                                                                                                                                        | Docker sandboxes + Ollama                             | The 4-agent swarm can be dispatched to help with complex extraction tasks that simple scrapers can't handle.                                                                            |

**Key insight:** You don't need all cartridges running simultaneously. Build them, run each one to populate its databases, then swap back. The databases persist on the Pi (or sync to ChefFlow) regardless of which cartridge is active. Cron jobs only run while that cartridge is loaded, so you'd rotate based on what needs refreshing.

**Rotation strategy example:**

- `price-intel` active Mon-Fri (daily price data matters most)
- `lead-engine` active Sat (scrape weekend leads, wedding sites update Fridays)
- `market-intel` swap in monthly (directories don't change fast)
- `trend-watch` swap in bi-weekly (trends are slower-moving)

---

## The Full Database List

### Already Proposed and Confirmed

| #   | Database                       | What It Answers                                                     | Sources                                                                      | Cartridge      |
| --- | ------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| 1   | **Market Rates**               | What do chefs/caterers charge per head, per event type, per region? | Thumbtack, Bark, GigSalad, The Knot, WeddingWire, Yelp quotes                | `price-intel`  |
| 2   | **Supplier Directory**         | Who sells food near me, at what prices, with what minimums?         | Google Places, Yelp, Restaurant Depot, US Foods, Sysco, local distributors   | `market-intel` |
| 3   | **Venue Kitchen Intelligence** | What equipment/layout does this venue have?                         | Wedding venue sites, event space listings, Google reviews mentioning kitchen | `lead-engine`  |

### Tier A: High Value, Proven Scraping Patterns

| #   | Database                       | What It Answers                                                                      | Sources                                                                                                       | Cartridge      |
| --- | ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------- |
| 4   | **Rental Kitchen Directory**   | Where can I prep if the venue has no kitchen? Rates, hours, equipment?               | The Kitchen Door, commercial kitchen listings, Peerspace, Craigslist commercial, state health dept registries | `market-intel` |
| 5   | **Health Inspection Scores**   | Is this venue/partner/kitchen compliant? What violations were flagged?               | City/county health department public databases (most publish online)                                          | `market-intel` |
| 6   | **Equipment Pricing Index**    | What does a 6-burner range cost new vs used? Depreciation curves?                    | WebstaurantStore, KaTom, eBay commercial kitchen, Facebook Marketplace, Craigslist                            | `price-intel`  |
| 7   | **Staffing Rate Intelligence** | What do sous chefs, servers, bartenders, dishwashers charge per hour by region?      | Indeed, ZipRecruiter, Poached Jobs, Culinary Agents, Craigslist gigs                                          | `trend-watch`  |
| 8   | **Local Farm & CSA Directory** | Who grows what near me? When? Contact info? Delivery/pickup?                         | USDA Local Food Directory, LocalHarvest, state agriculture dept listings, farmers market schedules            | `market-intel` |
| 9   | **Permit & License Matrix**    | What food service permits do I need in this city/county/state? Costs? Renewal dates? | State health departments, city clerk offices, SBA.gov, cottage food law databases                             | `market-intel` |

### Tier B: High Value, Harder Scraping

| #   | Database                            | What It Answers                                                               | Sources                                                                                                                     | Cartridge     |
| --- | ----------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 10  | **Event Demand Heatmap**            | When/where is demand highest? What event types peak when?                     | The Knot (wedding season data), Eventbrite (corporate events), Google Trends (catering + city), social media event hashtags | `lead-engine` |
| 11  | **Catering Lead Monitor**           | Who just posted looking for a chef/caterer right now?                         | Thumbtack requests, Bark leads, Craigslist services wanted, Facebook group posts, Reddit (r/weddingplanning, r/catering)    | `lead-engine` |
| 12  | **Wine & Beverage Pricing**         | What does this wine cost retail? Pairing suggestions by dish?                 | Wine.com, Vivino, Total Wine, Drizly, local liquor store sites                                                              | `price-intel` |
| 13  | **Restaurant Closure Monitor**      | Which restaurants just closed near me?                                        | Yelp (newly closed flag), Google Maps (permanently closed), local news, health dept permit lapses                           | `lead-engine` |
| 14  | **Allergen Recall & Safety Alerts** | Was any ingredient I use just recalled? Active FDA alerts?                    | FDA Recalls RSS, USDA FSIS alerts, state agriculture dept notices                                                           | `trend-watch` |
| 15  | **Menu Trend Index**                | What dishes/cuisines/dietary styles are trending up or down?                  | Yelp trending restaurants, DoorDash/UberEats popular items, food blog aggregation, Instagram food hashtag velocity          | `trend-watch` |
| 16  | **Insurance Rate Intelligence**     | What does food service liability insurance cost by coverage level and region? | The Hartford, FLIP, Next Insurance, Hiscox, state insurance commission filings                                              | `trend-watch` |

### Tier C: Aggressive/Creative

| #   | Database                               | What It Answers                                                                                      | Sources                                                                                                    | Cartridge                         |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 17  | **Corporate Catering RFP Monitor**     | Which companies/orgs just posted catering RFPs?                                                      | SAM.gov (federal), state procurement portals, university dining RFPs, hospital/corporate facility postings | `lead-engine`                     |
| 18  | **Dietary Trend Forecasting**          | Which dietary restrictions are growing in my market?                                                 | Google Trends (keto/vegan/halal + region), health food store openings, restaurant menu keyword analysis    | `trend-watch`                     |
| 19  | **Event Photographer/Vendor Network**  | Who are the other vendors at events in my area?                                                      | The Knot vendor lists, WeddingWire, venue preferred vendor pages                                           | `lead-engine`                     |
| 20  | **Utility Cost Index**                 | What does it cost to run a commercial kitchen in this area? Gas, electric, water rates?              | Utility company rate schedules (public), EIA state energy data                                             | `price-intel`                     |
| 21  | **Food Truck Regulation Map**          | Where can I operate a mobile kitchen? Permit zones, fees, restricted areas?                          | City permit offices, municipal code databases, food truck association directories                          | `market-intel` (or `trend-watch`) |
| 22  | **Competitor Menu Scraper**            | What are other caterers in my area serving and at what price points?                                 | Catering company websites, their PDF menus, Yelp menu pages                                                | `trend-watch`                     |
| 23  | **Wedding Cost Index**                 | What's the average wedding budget breakdown in this zip code?                                        | The Knot Real Weddings study data, WeddingWire cost estimator, Zola budget tools                           | `lead-engine`                     |
| 24  | **Specialty Ingredient Sourcing**      | Where can I get high-grade saffron, A5 wagyu, high-end truffles, high-end mushrooms? Price per unit? | Specialty importers, D'Artagnan, Mikuni, truffle suppliers, specialty spice vendors                        | `price-intel`                     |
| 25  | **Pop-Up & Supper Club Venue Monitor** | Which spaces are available for pop-up dining events?                                                 | Peerspace, Splacer, EventUp, restaurant off-hours rental listings                                          | `lead-engine` (or `market-intel`) |

### Tier D: Long-Game Intelligence

| #   | Database                            | What It Answers                                                         | Sources                                                                                      | Cartridge     |
| --- | ----------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------- |
| 26  | **Client Wealth Proxy Index**       | What's the economic profile of this zip code/neighborhood?              | Census ACS data, Zillow median home values, IRS SOI tax stats (all public)                   | `trend-watch` |
| 27  | **Seasonal Ingredient Forecast**    | What will be in season 2-4 weeks from now, and at what expected price?  | Historical price-intel data (already collected) + NOAA weather data + USDA crop reports      | `price-intel` |
| 28  | **Food Media Mention Tracker**      | Which chefs/restaurants/trends are getting press coverage in my market? | Local food blogs, Eater city pages, local newspaper food sections, James Beard announcements | `trend-watch` |
| 29  | **Cooking Class & Workshop Market** | What are other chefs charging for cooking classes? What formats sell?   | Cozymeal, Airbnb Experiences, Sur La Table, local cooking school listings                    | `lead-engine` |
| 30  | **Food Delivery Platform Pricing**  | What are DoorDash/UberEats restaurants charging for similar dishes?     | DoorDash, UberEats, Grubhub menu scraping (by cuisine type and area)                         | `price-intel` |

---

## Cartridge Summary

| Cartridge      | Status                    | Database Count                 | Scraper Complexity                           | Update Frequency  |
| -------------- | ------------------------- | ------------------------------ | -------------------------------------------- | ----------------- |
| `price-intel`  | **Exists** (extend it)    | 7 new + 14 existing = 21 total | Medium (APIs + HTTP)                         | Daily             |
| `market-intel` | **New build**             | 6 databases                    | Medium (Google Places, gov sites)            | Weekly to monthly |
| `lead-engine`  | **New build**             | 9 databases                    | Hard (Puppeteer, wedding sites, RFP portals) | Daily to weekly   |
| `trend-watch`  | **New build**             | 8 databases                    | Mixed (RSS, light scraping, public data)     | Bi-weekly         |
| `claw-swarm`   | **Exists** (support role) | 0 (assists others)             | N/A                                          | On-demand         |

## Architecture Rules (Same as All Ground Truth Data)

1. **One-way pipeline.** OpenClaw builds databases, pushes to ChefFlow. ChefFlow never sends client data to OpenClaw. Ever.
2. **Formula over AI.** ChefFlow lookups against these databases are deterministic keyword matching or math. No LLM calls for reference data queries.
3. **Free only.** OpenClaw runs on free models and free/public data sources. `model_config: free_only` is permanent.
4. **Honest about gaps.** If a lookup returns no match, the UI shows "unknown" or "verify manually." Never fabricates data.
5. **Pi constraints respected.** Pi 5 with 8GB RAM, ~78GB free storage. All cartridges must fit within these limits.
6. **Rotation-friendly.** Databases persist after a cartridge swap. Only the cron jobs stop. Data stays until the next run refreshes it.

## Pipeline to ChefFlow

Each cartridge syncs its databases to ChefFlow the same way price-intel does today:

- SQLite database on the Pi (one per cartridge or shared)
- HTTP sync API (like port 8081 for prices)
- ChefFlow pulls on schedule or on-demand
- Data lands as TypeScript constants in `lib/constants/` or as structured JSON in a known location
- Lookup functions in `lib/formulas/` provide deterministic access

## What to Build First

Recommended priority based on immediate value to a working ChefFlow instance:

1. **Extend `price-intel`** with Market Rates (#1), Equipment Pricing (#6), and Specialty Sourcing (#24) - least effort, highest immediate value, same infrastructure
2. **Build `market-intel`** - Supplier Directory (#2) and Rental Kitchen Directory (#4) fill the biggest operational gaps
3. **Build `lead-engine`** - Catering Lead Monitor (#11) and Venue Kitchen Intel (#3) feed the prospecting module that already exists but has no live data
4. **Build `trend-watch`** last - intelligence data is valuable but not urgent
