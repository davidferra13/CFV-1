# Research: Food Ingredient Pricing Databases and APIs (United States)

> **Date:** 2026-03-30
> **Question:** What pre-built food ingredient pricing databases and APIs exist that could provide nationwide grocery/wholesale pricing data for the US, and could any replace building our own scraping infrastructure?
> **Status:** complete

## Summary

There is no single source that provides comprehensive, current, item-level food pricing data in a format you can just import into PostgreSQL. The landscape splits into three tiers: (1) free government data that covers ~70-90 categories with monthly/annual averages (useful for benchmarks, not recipe costing), (2) commercial APIs that either scrape retailers or aggregate estimates (Spoonacular has rough estimates, MealMe has real SKU data but enterprise pricing), and (3) enterprise intelligence platforms (Datasembly, Circana) that cost five-to-six figures annually. The Kroger public API is the closest thing to a free, real-time, item-level pricing source for a single major retailer. **Bottom line: OpenClaw + your existing 10-tier resolution chain is the right architecture. No shortcut replaces it, but several free sources can supplement it as fallback tiers.**

---

## 1. Free Government Databases

### USDA Food-at-Home Monthly Area Prices (F-MAP)

| Field                       | Detail                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | 90 food-at-home categories (not individual items), 15 geographic areas                                          |
| **Cost**                    | Free                                                                                                            |
| **Format**                  | Excel (XLSX) download, ZIP archives                                                                             |
| **Currency**                | Monthly average unit prices + price indexes                                                                     |
| **Time range**              | 2012-2018 (last updated July 2024)                                                                              |
| **Update frequency**        | Periodic (not regular)                                                                                          |
| **PostgreSQL import**       | Yes, via CSV conversion from Excel. Straightforward ETL                                                         |
| **Usefulness for ChefFlow** | Low for recipe costing (too aggregated). Useful as a regional price index baseline for your tier chain fallback |

Source: [USDA ERS F-MAP](https://www.ers.usda.gov/data-products/food-at-home-monthly-area-prices)

### BLS Consumer Price Index - Average Price Data

| Field                       | Detail                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | ~70 food items at the US level (e.g., "white bread, per lb", "eggs, grade A, per dozen")                                                     |
| **Cost**                    | Free                                                                                                                                         |
| **Format**                  | JSON API, CSV/XLSX bulk download                                                                                                             |
| **Currency**                | Monthly average retail prices in USD, since 1980                                                                                             |
| **Update frequency**        | Monthly (released with CPI)                                                                                                                  |
| **API limits**              | 500 queries/day, 50 series per request, 20 years max per request                                                                             |
| **PostgreSQL import**       | Yes. JSON API responses or CSV downloads parse cleanly                                                                                       |
| **Usefulness for ChefFlow** | Medium as a national benchmark fallback tier. Good for "eggs cost roughly $X/dozen nationally." Too coarse for per-ingredient recipe costing |

Source: [BLS Average Prices](https://www.bls.gov/charts/consumer-price-index/consumer-price-index-average-price-data.htm), [BLS Data API](https://www.bls.gov/bls/api_features.htm)

### USDA FoodData Central

| Field                       | Detail                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| **Coverage**                | 300,000+ foods across Foundation Foods, SR Legacy, Branded Food Products                       |
| **Cost**                    | Free                                                                                           |
| **Format**                  | REST API (JSON), bulk CSV + JSON downloads                                                     |
| **Data type**               | Nutrition data only. **No pricing data.**                                                      |
| **API limits**              | 1,000 requests/hour per IP                                                                     |
| **PostgreSQL import**       | Yes. Bulk downloads are well-structured CSV/JSON                                               |
| **Usefulness for ChefFlow** | High for nutrition, zero for pricing. Already the standard reference for food composition data |

Source: [FoodData Central](https://fdc.nal.usda.gov/), [API Guide](https://fdc.nal.usda.gov/api-guide/), [Bulk Downloads](https://fdc.nal.usda.gov/download-datasets/)

### FRED (Federal Reserve Economic Data)

| Field                       | Detail                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| **Coverage**                | CPI food sub-indexes from BLS, aggregated                                 |
| **Cost**                    | Free                                                                      |
| **Format**                  | API (JSON/XML), CSV, Excel                                                |
| **Usefulness for ChefFlow** | Same as BLS but with easier API access. Index-level only, not item prices |

Source: [FRED Food CPI Series](https://fred.stlouisfed.org/tags/series?t=bls%3Bcpi%3Bfood)

---

## 2. Commercial Food/Recipe APIs

### Spoonacular

| Field                       | Detail                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | 365,000+ recipes, 86,000+ grocery products, 2,600+ ingredients with estimated pricing                                                       |
| **Cost**                    | Free: 50 calls/day (credit card required). Paid: starts $10/month (academic), scales up based on points system                              |
| **Format**                  | REST API (JSON)                                                                                                                             |
| **Pricing data quality**    | Estimated from "average aggregated supermarket data." Not real-time, not regional, not sourced from actual retailers. Rough ballpark only   |
| **Update frequency**        | Unknown/irregular for price estimates                                                                                                       |
| **PostgreSQL import**       | Possible via API pagination, but no bulk download. Would need to crawl their API                                                            |
| **Usefulness for ChefFlow** | Medium-low. Good enough for a "rough national average" fallback tier when OpenClaw has no data. Not accurate enough for actual food costing |

Source: [Spoonacular Pricing](https://spoonacular.com/food-api/pricing)

### Edamam

| Field                       | Detail                                                               |
| --------------------------- | -------------------------------------------------------------------- |
| **Coverage**                | 615,000+ UPC codes, nutrition data                                   |
| **Cost**                    | Free tier available. Paid: $49-$999/month depending on API           |
| **Format**                  | REST API (JSON)                                                      |
| **Pricing data**            | **None.** Nutrition only. Does not provide ingredient cost data      |
| **Usefulness for ChefFlow** | Zero for pricing. Nutrition data competitor to USDA FoodData Central |

Source: [Edamam Developer](https://developer.edamam.com/food-database-api)

### FatSecret Platform

| Field                       | Detail                                                         |
| --------------------------- | -------------------------------------------------------------- |
| **Coverage**                | 2.3 million+ unique foods/products, 56 countries, 26 languages |
| **Cost**                    | Free: 5,000 calls/day. Premier: custom pricing                 |
| **Format**                  | REST API (JSON/XML)                                            |
| **Pricing data**            | **None.** Nutrition and dietary data only                      |
| **Usefulness for ChefFlow** | Zero for pricing                                               |

Source: [FatSecret Platform](https://platform.fatsecret.com/platform-api)

### MealMe

| Field                       | Detail                                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | 200 million+ SKUs, 100,000+ store locations, top 100 North American retailers (Walmart, Target, Costco, Kroger, Safeway, Whole Foods, Aldi, etc.)                                      |
| **Cost**                    | Enterprise pricing, not publicly listed. Likely $$$$                                                                                                                                   |
| **Format**                  | REST API (JSON)                                                                                                                                                                        |
| **Pricing data quality**    | Real-time, SKU-level, from actual retailers. The real deal                                                                                                                             |
| **Update frequency**        | Real-time                                                                                                                                                                              |
| **PostgreSQL import**       | Via API. No bulk download mentioned                                                                                                                                                    |
| **Usefulness for ChefFlow** | Potentially high if affordable. This is the closest thing to "buy the data instead of scraping it." But pricing is likely enterprise-level and prohibitive for a bootstrapped platform |

Source: [MealMe Data](https://data.mealme.ai/), [MealMe API](https://www.mealme.ai/)

---

## 3. Retailer APIs (Direct from Stores)

### Kroger Public API

| Field                       | Detail                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | All Kroger-family stores (Kroger, Ralphs, Fred Meyer, Harris Teeter, etc.). ~2,800 stores across 35 states                                                                                           |
| **Cost**                    | **Free** (client credentials OAuth2)                                                                                                                                                                 |
| **Format**                  | REST API (JSON)                                                                                                                                                                                      |
| **Pricing data**            | Product search returns pricing, availability, and promotional data per store location                                                                                                                |
| **Update frequency**        | Real-time                                                                                                                                                                                            |
| **Rate limits**             | Not publicly documented, likely standard OAuth rate limits                                                                                                                                           |
| **PostgreSQL import**       | Yes, via API calls. Would need to build an ingestion pipeline                                                                                                                                        |
| **Usefulness for ChefFlow** | **HIGH.** This is the single best free source of real, current, item-level grocery pricing. Covers a major national chain. Could be a primary data source in your tier chain for Kroger-region users |

Source: [Kroger Developers](https://developer.kroger.com/), [Products API](https://developer.kroger.com/reference/api/product-api-public)

### Walmart API

| Field                       | Detail                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coverage**                | Marketplace/seller API only                                                                                                                       |
| **Cost**                    | Free for marketplace sellers                                                                                                                      |
| **Format**                  | REST API                                                                                                                                          |
| **Pricing data**            | **Not available for public product price lookups.** The API is for sellers managing their own listings, not for consumers querying product prices |
| **Usefulness for ChefFlow** | Zero. No public pricing API                                                                                                                       |

Source: [Walmart Developers](https://developer.walmart.com/)

### Instacart Developer Platform

| Field                       | Detail                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------- |
| **Coverage**                | Multi-retailer (Costco, Aldi, Sprouts, etc. through Instacart)                         |
| **Cost**                    | Partner program (not self-service)                                                     |
| **Format**                  | REST API                                                                               |
| **Pricing data**            | Item availability and inventory. Pricing data access depends on partnership level      |
| **Usefulness for ChefFlow** | Low-medium. Partnership-gated. You already have OpenClaw's Instacart scraping research |

Source: [Instacart Docs](https://docs.instacart.com/developer_platform_api/)

---

## 4. Open/Crowdsourced Datasets

### Open Prices (Open Food Facts)

| Field                       | Detail                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **Coverage**                | 125,000+ crowdsourced price records (as of Aug 2025). Primarily European, growing US presence    |
| **Cost**                    | Free (ODbL license, must attribute)                                                              |
| **Format**                  | REST API (Django/Python), PostgreSQL backend                                                     |
| **Pricing data quality**    | Real receipts/price tags submitted by users. Authentic but sparse and inconsistent coverage      |
| **Update frequency**        | Continuous crowdsourced contributions                                                            |
| **PostgreSQL import**       | Natively PostgreSQL. API available. HuggingFace dataset dump also exists                         |
| **Usefulness for ChefFlow** | Low for US coverage today. Interesting long-term. 125K records is tiny compared to what you need |

Source: [Open Prices](https://prices.openfoodfacts.org/), [GitHub](https://github.com/openfoodfacts/open-prices), [HuggingFace Dataset](https://huggingface.co/datasets/openfoodfacts/open-prices)

### Kaggle Datasets

| Dataset                                       | Records                        | Usefulness               |
| --------------------------------------------- | ------------------------------ | ------------------------ |
| Global Food Prices                            | WFP data, developing countries | Zero for US retail       |
| Grocery Prices Data (Explore Shopping Trends) | Community dataset              | Snapshot, not maintained |
| Grocery Store Dataset                         | Product catalog                | No ongoing price updates |

**Usefulness for ChefFlow:** Near zero. These are academic/toy datasets, not production data sources.

### Grocerybear

| Field                       | Detail                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| **Coverage**                | 7 food categories (eggs, bread, milk, steak, OJ, rice, butter), 10 US cities                       |
| **Cost**                    | Free API (requires registration)                                                                   |
| **Format**                  | REST API (JSON)                                                                                    |
| **Update frequency**        | Daily                                                                                              |
| **PostgreSQL import**       | Yes, simple JSON API                                                                               |
| **Usefulness for ChefFlow** | Very low. Only 7 items. Interesting as a validation/sanity-check source, not a primary data source |

Source: [Grocerybear](https://www.grocerybear.com/)

---

## 5. Enterprise Price Intelligence Platforms

These are the "real" data companies. They have everything but charge accordingly.

### Datasembly

| Field                       | Detail                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| **Coverage**                | 12+ billion weekly price observations, 200+ retail banners, 150,000+ stores, 30,000+ zip codes |
| **Cost**                    | Enterprise custom pricing. Based on # of retailers and UPCs. Likely $50K-$500K+/year           |
| **Format**                  | Dashboard, API, data feeds                                                                     |
| **Free option**             | "Snapshot" preview and Grocery Price Index (free, aggregated)                                  |
| **Usefulness for ChefFlow** | The data is exactly what you need. The price is not. Way beyond bootstrapped budget            |

Source: [Datasembly](https://datasembly.com/)

### Circana (formerly IRI)

| Field                       | Detail                                                                            |
| --------------------------- | --------------------------------------------------------------------------------- |
| **Coverage**                | Retail scanner data from 50,000-60,000 stores. Weekly UPC-level sales and pricing |
| **Cost**                    | Enterprise only. Six figures annually                                             |
| **Format**                  | Proprietary data platform                                                         |
| **Usefulness for ChefFlow** | Same story. Perfect data, impossible price. This is what USDA uses to build F-MAP |

Source: [Circana](https://www.circana.com/)

### DataWeave

| Field                       | Detail                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Coverage**                | 117,000+ products, 15 categories, 16 retailers                                  |
| **Cost**                    | Enterprise custom pricing                                                       |
| **Usefulness for ChefFlow** | Enterprise-tier pricing intelligence, not accessible for bootstrapped platforms |

Source: [DataWeave](https://dataweave.com/)

---

## 6. Food Service Industry Costing Tools

These are restaurant software platforms, not data providers. They don't sell pricing data; they help restaurants track their own costs.

| Tool              | What It Does                                  | Pricing                 | Data Export                             | Could Feed ChefFlow?         |
| ----------------- | --------------------------------------------- | ----------------------- | --------------------------------------- | ---------------------------- |
| **ChefTec Ultra** | Desktop recipe costing, inventory, purchasing | $995 one-time + modules | Proprietary DB                          | No API. Closed system        |
| **MarginEdge**    | Invoice OCR, real-time food costs             | $330/month              | Integrations                            | No public API for price data |
| **MarketMan**     | Inventory, recipe costing, purchasing         | $199/month              | Integrations                            | No public pricing API        |
| **meez**          | Recipe writing, food costing, team training   | ~$100-300/month         | Integrations with MarginEdge, MarketMan | No public pricing API        |
| **ReciProfity**   | Cloud recipe costing                          | Varies                  | Limited                                 | No public API                |
| **CostGuard**     | Recipe costing, menu pricing                  | Varies                  | Limited                                 | No public API                |

**Key insight:** None of these tools provide a food price database. They all require the chef/restaurant to enter their own vendor pricing (from invoices, purchase orders, distributor price lists). They're consumers of price data, not providers.

---

## 7. Wholesale/Broadline Distributors

### Sysco

| Field                       | Detail                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Public pricing API**      | **No.** Pricing is account-specific and negotiated                                                                             |
| **What exists**             | EDI integration for existing customers, data warehouse connectors (via Portable.io), internal API for customer data extraction |
| **Usefulness for ChefFlow** | Zero without being a Sysco customer. Even then, prices are per-account and not generalizable                                   |

### US Foods

| Field                       | Detail                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| **Public pricing API**      | **No.** Same model as Sysco: account-specific, negotiated pricing |
| **Usefulness for ChefFlow** | Zero for a general-purpose database                               |

### Restaurant Depot

| Field                       | Detail                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Public pricing API**      | **No.** Membership-only (requires business license). No public developer tools |
| **EDI**                     | Available for suppliers via third-party connectors (Pipe17)                    |
| **Usefulness for ChefFlow** | Zero. Walk-in pricing only, no digital access                                  |

**Key insight:** Broadline distributors do not publish pricing. Their business model is built on negotiated, account-specific pricing. Every customer pays a different price. There is no "Sysco price" for chicken breast; there are thousands of Sysco prices depending on your account, volume, and contract. This data cannot be scraped meaningfully because the prices you'd see as one customer don't apply to another.

---

## Recommendations

### The verdict: No shortcut exists

No existing source provides what ChefFlow needs: comprehensive, current, item-level food ingredient pricing across multiple retailers and wholesalers, available via API or bulk download, at a price point that works for a bootstrapped platform.

### What DOES make sense to integrate (ranked by value)

1. **Kroger Public API** (FREE, real-time, item-level) - Add as a primary data source in the OpenClaw tier chain. Covers ~2,800 stores across 35 states. This is the single highest-value free source.

2. **BLS Average Prices** (FREE, monthly, ~70 items) - Add as a national benchmark fallback tier. When you have zero data for an item, "eggs cost $3.89/dozen nationally" is better than nothing.

3. **USDA F-MAP** (FREE, 90 categories, regional) - Import as a regional price index layer. Useful for adjusting national averages to local markets.

4. **Spoonacular estimates** (FREE tier: 50 calls/day) - Low-quality but wide-coverage fallback. When OpenClaw has no data and BLS doesn't cover the item, Spoonacular's rough estimate beats zero.

5. **Open Prices** (FREE, crowdsourced) - Monitor for US growth. Not useful today (too sparse) but the project is growing.

### What to skip

- **Datasembly, Circana, DataWeave** - Perfect data, enterprise pricing. Not viable.
- **MealMe** - Perfect data, unknown but likely expensive pricing. Worth a pricing inquiry if you want to validate whether it's accessible.
- **Edamam, FatSecret** - No pricing data at all.
- **ChefTec, MarginEdge, MarketMan, meez** - Not data providers. They consume price data, they don't sell it.
- **Sysco, US Foods, Restaurant Depot** - No public pricing. Account-specific and negotiated.
- **Kaggle datasets** - Academic toys, not production data.

### The architecture stays the same

Your existing 10-tier price resolution chain with OpenClaw scraping is the correct architecture. The research confirms that everyone who has real grocery pricing data either (a) scraped it themselves or (b) pays enterprise rates for it. There is no middle-ground "just import a database" option.

The free government sources (BLS, USDA F-MAP) and Kroger's API should be added as additional tiers in your resolution chain, giving you better fallback coverage without replacing the core scraping infrastructure.

---

## Gaps and Unknowns

1. **MealMe pricing** - Could be worth a sales inquiry. If they have a startup tier under $500/month, it might be cost-effective vs. scraping.
2. **Kroger API rate limits** - Not publicly documented. Need to register and test to determine practical throughput for bulk ingestion.
3. **Instacart partnership requirements** - Your existing Instacart research via OpenClaw may already exceed what their official API offers, but the official route would be more stable.
4. **Open Prices US growth trajectory** - Unknown if/when their US coverage will become useful.
