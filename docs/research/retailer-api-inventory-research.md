# Research: Retailer APIs for New England Store Inventory System

> **Date:** 2026-03-29
> **Question:** What retailer APIs are available for building a complete store inventory/pricing system covering New England (MA, NH, ME)?
> **Status:** complete

## Summary

Only one retailer (Kroger) offers a proper public API with product search, pricing, and store-level data. Walmart has a consumer-facing affiliate API at walmart.io but it covers online catalog only (no in-store availability). Target has an undocumented Redsky API that works but aggressively blocks IPs. Trader Joe's has an undocumented GraphQL endpoint. Market Basket and Aldi have zero public APIs. For the retailers without APIs, scraping is the only path, and OpenClaw is the right tool for that.

---

## 1. Kroger API (developer.kroger.com)

**Verdict: Best option. Real public API with pricing and store-level product data.**

### Authentication

- **OAuth 2.0** (client credentials flow for public data, authorization code flow for user-specific data like cart)
- Register at developer.kroger.com, get `client_id` and `client_secret`
- Base64 encode `CLIENT_ID:CLIENT_SECRET`, POST to token endpoint
- Bearer token in all subsequent requests
- Scopes: `product.compact` (product info), `cart.basic:write` (cart), `profile.compact` (user profiles)

### Base URL

```
https://api.kroger.com/v1/
```

### Endpoints

| Endpoint                      | Purpose                | Key Parameters                                                                                                          |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET /products`               | Search product catalog | `filter.term`, `filter.brand`, `filter.locationId`, `filter.limit`                                                      |
| `GET /products/{productId}`   | Single product details | Product ID                                                                                                              |
| `GET /locations`              | Store locations        | `filter.chain`, `filter.department`, `filter.locationId`, `filter.zipCode.near`, `filter.radiusInMiles`, `filter.limit` |
| `GET /locations/{locationId}` | Single store details   | Location ID                                                                                                             |
| `GET /cart`                   | View customer cart     | Requires user auth                                                                                                      |
| `POST /cart`                  | Add to cart            | Requires user auth                                                                                                      |

### Rate Limits (Free Tier)

| API       | Daily Limit      |
| --------- | ---------------- |
| Products  | 10,000 calls/day |
| Locations | 1,600 calls/day  |
| Cart      | 5,000 calls/day  |
| Identity  | 5,000 calls/day  |

### Response Format

- JSON
- Product responses include: UPC, product name, brand, description, images, categories
- **Pricing data available** when querying with `filter.locationId` (store-specific pricing)
- Product availability is per-store when location is specified

### Banners/Chains Covered

Kroger operates ~2,750 stores under these banners (all queryable via `filter.chain`):

- Kroger, Ralphs, Fred Meyer, Fry's, King Soopers, Smith's, QFC, Dillons, Baker's, City Market, Gerbes, Jay C, Mariano's, Metro Market, Pay Less, Pick 'n Save, Ruler, Food 4 Less, Foods Co, Harris Teeter

**CRITICAL: Stop & Shop and Hannaford are NOT Kroger banners.** They belong to Ahold Delhaize (along with Food Lion, Giant, The Giant Company). Ahold Delhaize has NO public developer API. Their digital platform (formerly Peapod Digital Labs) is proprietary and internal only.

### Data Usage Restrictions

- Terms at developer.kroger.com govern usage
- Product catalog data intended for building shopping experiences
- Full catalog dump per store is possible by paginating product search with `filter.locationId`

### New England Coverage

Kroger has **minimal direct presence** in New England. Harris Teeter is the closest banner but operates in the mid-Atlantic/Southeast. For MA/NH/ME specifically, Kroger API coverage is **poor** unless the Kroger-Albertsons merger (which was blocked) changes things.

---

## 2. Walmart (walmart.io / developer.walmart.com)

**Verdict: Two separate APIs exist. Marketplace API is seller-only. Affiliate API has consumer product search but no in-store inventory.**

### API Landscape

| API                                                  | Access                          | Purpose                                              |
| ---------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| **Marketplace API** (developer.walmart.com)          | Sellers/partners only           | Manage listings, orders, inventory for YOUR products |
| **Affiliate API** (walmart.io)                       | Open registration               | Search Walmart.com catalog, store locator            |
| **WalmartLabs Open API** (developer.walmartlabs.com) | **Closed to new registrations** | Legacy; migrated to walmart.io                       |

### Affiliate API (walmart.io) - The Relevant One

**Authentication:**

- RSA key-pair based. Generate with OpenSSL, submit public key to get a ConsumerID
- Sign requests with private key + ConsumerID + key version
- More complex than simple API key or OAuth

**Endpoints:**

| Endpoint                             | Purpose                                |
| ------------------------------------ | -------------------------------------- |
| `GET /v1/search`                     | Text search across Walmart.com catalog |
| `GET /v1/items/{id}`                 | Product details by item ID             |
| `GET /v1/items?upc={upc}`            | Product lookup by UPC                  |
| `GET /v2/stores?zip={zip}`           | Store locator by zip code              |
| `GET /v2/stores?lon={lon}&lat={lat}` | Store locator by coordinates           |

**Base URL:** `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/`

**Rate Limits:** Not explicitly documented for affiliate tier. General Walmart API guidance: respect `x-current-token-count` and `x-next-replenish-time` headers. Marketplace API has 10 requests/hour on some inventory endpoints, but affiliate API limits are less restrictive.

**Key Limitation: No in-store availability.** The affiliate API searches Walmart.com (online catalog). You cannot query "is this item in stock at store #1234 right now?" There is no public API for real-time in-store inventory. The Marketplace inventory API is for sellers managing their own stock.

### New England Coverage

Walmart has strong physical presence in MA, NH, ME. But without in-store availability data via API, you only get online catalog and pricing (which may differ from in-store).

---

## 3. Target Redsky API

**Verdict: Undocumented, works, but aggressive IP blocking makes it unreliable for production.**

### Current State (2025-2026)

- Still accessible as of latest reports
- NOT an official public API; Target has acknowledged it exists and considers the data "publicly available"
- No official documentation, no developer portal, no registration
- IP blocking has become more aggressive; low request volumes trigger blocks

### Endpoint

```
https://redsky.target.com/redsky_aggregations/v1/web/pdp_fulfillment_v1
```

### Query Parameters

| Parameter                      | Purpose                                  | Example                                    |
| ------------------------------ | ---------------------------------------- | ------------------------------------------ |
| `key`                          | Static API key (same for everyone)       | `ff457966e64d5e877fdbad070f276d18ecec4a01` |
| `tcin`                         | Target product ID (from URL: `A-{tcin}`) | `14758453`                                 |
| `store_id`                     | Store location ID                        | `1859`                                     |
| `pricing_store_id`             | Store for pricing                        | `1859`                                     |
| `zip`                          | ZIP code                                 | `01830`                                    |
| `state`                        | State abbreviation                       | `MA`                                       |
| `latitude` / `longitude`       | Coordinates                              | `42.776`, `-71.077`                        |
| `has_store_positions_store_id` | Include aisle info                       | `true`                                     |
| `has_pricing_store_id`         | Include pricing                          | `true`                                     |
| `is_bot`                       | Bot flag (ignored)                       | `false`                                    |

### Response Data

- Stock availability per store
- "Quantity available to promise" per location
- Order pickup and in-store availability status
- Shipping options
- Aisle and block positioning data (where in the store)
- Fulfillment options (pickup, delivery, ship)

### Authentication

- Static API key in query string (hardcoded, same across all clients)
- No registration required
- No OAuth, no tokens

### Rate Limits

- **No documented limits** (it is undocumented)
- IP blocking occurs after relatively few requests (reports vary: some say dozens, some say hundreds)
- No rate limit headers returned

### Risks

- Target can change or block at any time with zero notice
- IP rotation/proxy required for any meaningful volume
- No SLA, no support, no terms of service (because it is not a public API)

### New England Coverage

Target has strong presence in MA, NH, and some ME locations. The fulfillment endpoint gives per-store data, so you CAN get "is this in stock at Target Haverhill?"

---

## 4. Market Basket (Demoulas)

**Verdict: Zero API. Minimal digital presence. Instacart is the only digital channel.**

### Digital Presence

- Website: shopmarketbasket.com (basic; weekly circular, store locator)
- Mobile app: basic shopping companion (coupons, digital circular)
- **No online ordering through their own platform**
- **No developer API of any kind**
- **No product catalog on their website** (just the weekly flyer)

### Instacart Partnership

- Market Basket is available on Instacart for same-day delivery
- Instacart has its own product catalog data for Market Basket stores
- **Instacart does NOT offer a public API** for accessing partner store catalogs
- Instacart's API is partner/enterprise only

### Data Access Options

The only paths to Market Basket product/pricing data:

1. **Scrape the weekly circular** from shopmarketbasket.com (PDF/image format, limited to sale items)
2. **Scrape Instacart** for Market Basket product listings (against Instacart ToS, requires browser automation)
3. **In-store data collection** (manual or receipt scanning)

### Coverage

90 stores across MA, NH, ME, RI. Dominant in the Merrimack Valley (Haverhill, Lowell, Lawrence area). They are the most important retailer for your region and the hardest to get data from.

### Leadership Note (2025)

Market Basket underwent significant leadership upheaval in 2025 (CEO Arthur T. Demoulas removed). Digital strategy may shift under new leadership but nothing has materialized yet.

---

## 5. Trader Joe's

**Verdict: Undocumented GraphQL API exists. No official API. Works for now.**

### API Endpoint

```
https://www.traderjoes.com/api/graphql
```

### Technical Details

- **GraphQL endpoint** (not REST)
- No authentication required (public, unauthenticated)
- Returns JSON
- Supports product catalog queries, search, store locations, active offers

### Available Data (via GraphQL queries)

- Product name, SKU, brand
- Current price
- Product description, categories, tags
- Store location lookup
- Active deals/offers/promotions
- Product images

### Rate Limits

- Undocumented
- No known aggressive blocking (less restrictive than Target)
- Used by multiple open-source projects (cmoog/traderjoes on GitHub runs daily price tracking)

### Risks

- Undocumented, could change or require auth at any time
- Trader Joe's has not officially acknowledged or endorsed third-party use
- HN discussion (2024) noted concern that TJ's might lock it down
- No per-store pricing (TJ's has mostly uniform national pricing, so this is less of an issue)

### Known Implementations

- [github.com/cmoog/traderjoes](https://github.com/cmoog/traderjoes) - Haskell-based daily price tracker using the GraphQL API
- [github.com/jackgisel/traderjoeapi](https://github.com/jackgisel/traderjoeapi) - Python scraper + API wrapper
- Apify has a Trader Joe's scraper actor

### New England Coverage

Trader Joe's has stores in MA and NH (none in ME). Uniform national pricing means store-level queries are less critical.

---

## 6. Aldi

**Verdict: No official API. Website has internal endpoints that can be scraped.**

### Official API

- **None.** No developer portal, no public API, no documentation.
- ALDI DX GitHub organization was **archived January 6, 2026** and is no longer maintained.

### Internal Website Endpoints

- Aldi US website (new.aldi.us / aldi.us) has internal API endpoints that power their product pages
- Product catalog and weekly "ALDI Finds" data is accessible through these endpoints
- No authentication required for browsing
- Response format: JSON

### Available Data (via scraping)

- SKU, product name, brand
- Price, description, categories
- Country of origin
- SNAP eligibility
- California health warnings (Prop 65)
- Image URLs
- Weekly "ALDI Finds" rotation (new products every Wednesday)

### Known Implementations

- [github.com/stiles/aldi](https://github.com/stiles/aldi) - Python scripts (`fetch_all_products.py`, `fetch_aisle_products.py`) with GitHub Actions automation (runs Sundays)
- Apify Ultimate ALDI Scraper
- Multiple commercial scraping services

### Rate Limits

- Undocumented (no official API)
- Standard anti-bot measures on the website
- GitHub Actions-based scrapers run weekly without issues

### New England Coverage

Aldi has growing presence in MA and NH (limited in ME). Expanding rapidly. Weekly Finds rotation makes freshness of data important.

---

## Comparative Summary

| Retailer          | API Type                  | Auth         | Pricing Data         | In-Store Avail. | Rate Limit       | NE Coverage          | Reliability |
| ----------------- | ------------------------- | ------------ | -------------------- | --------------- | ---------------- | -------------------- | ----------- |
| **Kroger**        | Official public           | OAuth 2.0    | Yes (per store)      | Yes             | 10K/day          | Poor (no NE banners) | High        |
| **Walmart**       | Affiliate (walmart.io)    | RSA key-pair | Online only          | No              | Undocumented     | Good                 | Medium      |
| **Target**        | Undocumented (Redsky)     | Static key   | Yes (per store)      | Yes + aisle     | None (IP blocks) | Good                 | Low         |
| **Trader Joe's**  | Undocumented (GraphQL)    | None         | Yes (national)       | No              | Undocumented     | Good (MA/NH)         | Medium      |
| **Market Basket** | None                      | N/A          | Weekly circular only | No              | N/A              | Excellent            | N/A         |
| **Aldi**          | None (internal endpoints) | None         | Yes                  | No              | Undocumented     | Growing              | Medium      |

---

## Recommendations

### Tier 1: Build Official Integrations

- **Kroger API** - register, implement OAuth, use as the reference integration even though NE coverage is weak. Clean API, good docs, stable. If Kroger expands into NE (post-merger landscape), you are ready.

### Tier 2: OpenClaw Scraper Targets (price-intel cartridge)

These belong in the OpenClaw `price-intel` cartridge because there is no stable API:

- **Market Basket** - scrape Instacart listings and/or weekly circular. Highest priority for NE.
- **Aldi** - scrape aldi.us internal endpoints (follow the stiles/aldi pattern). Weekly ALDI Finds rotation makes Sunday scrapes ideal.
- **Target** - scrape Redsky with IP rotation through OpenClaw. Too unreliable for direct ChefFlow integration but fine for periodic OpenClaw batch scraping.

### Tier 3: Opportunistic Undocumented APIs

- **Trader Joe's GraphQL** - lightweight, works today. Could integrate directly into ChefFlow or route through OpenClaw. Risk: could break without notice.
- **Walmart affiliate API** - worth registering for online pricing data, but the RSA auth complexity and lack of in-store data make it lower priority than scraping alternatives.

### Key Insight for New England

The most important retailers for MA/NH/ME are, in order: **Market Basket, Stop & Shop, Hannaford, Walmart, Target, Trader Joe's, Aldi.** Of these, the top three (Market Basket, Stop & Shop, Hannaford) have ZERO public APIs. Stop & Shop and Hannaford are Ahold Delhaize, which has no developer program. **Scraping via OpenClaw is the only viable path for the most critical retailers in your region.**

---

## Sources

- [Kroger Developer Portal](https://developer.kroger.com/)
- [Kroger Public APIs (Postman)](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/documentation/ki6utqb/kroger-public-apis)
- [Kroger API Python Client (CupOfOwls)](https://github.com/CupOfOwls/kroger-api)
- [Kroger Family of Companies](https://www.kroger.com/i/kroger-family-of-companies)
- [Walmart Affiliate API (walmart.io)](https://walmart.io/docs/affiliates/v1/affiliate-marketing-api)
- [Walmart Marketplace Developer Portal](https://developer.walmart.com/)
- [Target Redsky API Gist](https://gist.github.com/LumaDevelopment/f2a34a202fed6ab5a7f3a31282834943)
- [Target Redsky Scraping Guide (Unwrangle)](https://www.unwrangle.com/blog/how-to-scrape-target-com/)
- [Market Basket (Instacart)](https://www.instacart.com/store/market-basket/storefront)
- [Market Basket Website](https://www.shopmarketbasket.com/)
- [Trader Joe's Daily Price Tracker (HN)](https://news.ycombinator.com/item?id=39304068)
- [Trader Joe's GraphQL Discovery (HN)](https://news.ycombinator.com/item?id=39309166)
- [Aldi Scraper (stiles/aldi)](https://github.com/stiles/aldi)
- [Ahold Delhaize / Peapod Digital Labs](https://www.peapoddigitallabs.com/who-we-are)
- [Kroger API (publicapis.io)](https://publicapis.io/kroger-api)
