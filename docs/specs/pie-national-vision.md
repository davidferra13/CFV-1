# PIE National Vision: America's Food Pricing Truth Layer

> From "every ingredient has a price" to "every food professional in America
> makes better decisions because PIE exists."

Ratified: 2026-05-04

---

## The Mission

PIE becomes the authoritative, real-time pricing intelligence layer for food
in the United States. Every chef, cook, caterer, restaurant operator, food
truck owner, and meal planner trusts PIE the way drivers trust Waze for
traffic. Accurate. Local. Real-time. Actionable.

---

## Scale Target

- **Users:** Millions across all 50 states + territories
- **Ingredients:** 200,000+ in the Census
- **Price cells:** 80,000,000+ (ingredients x pricing regions)
- **Freshness SLA:** No volatile ingredient older than 72 hours in any active market
- **Geographic SLA:** 95%+ coverage in any ZIP with 50K+ population
- **Accuracy SLA:** Within 15% of actual shelf price, 90% of the time
- **Uptime:** Pricing resolution works offline (cached local tier)

---

## Beyond Price Data: The Intelligence Layers

### Layer 1: Price Resolution (BUILT - current PIE)

What it does: returns a price for any ingredient in any region.
This is table stakes. The foundation everything else builds on.

### Layer 2: Trend Intelligence

- **Volatility scoring:** flag ingredients with unstable pricing so chefs avoid menu risk
- **Trend detection:** "chicken thighs up 12% this month in your region"
- **Seasonal windows:** "this ingredient is cheapest in 3 weeks, plan around it"
- **Cost forecasting:** "this menu will cost $X today but likely $Y next month"
- **Inflation tracking:** YoY food cost changes by category and region
- **Market event detection:** bird flu, hurricane, recall, seasonal glut

Detection within hours, not weeks. Alerts pushed, not pulled.

### Layer 3: Menu Economics

- **Automatic food cost %** per dish, per menu, per event
- **Margin alerts:** "this dinner is below your 30% target"
- **Substitution engine:** maintain quality, improve margin
- **What-if modeling:** swap one protein, see cost delta instantly
- **Break-even analysis:** "you need 8 guests at $150/head to clear costs"
- **Historical menu tracking:** same menu 6 months ago vs today

No chef does food cost math manually. PIE does it continuously.

### Layer 4: Purchasing Intelligence

- **Optimal store split:** "buy X at Store A, Y at Store B, save $47"
- **Bulk break-even:** "10lb case saves $X over 3 events at your volume"
- **Vendor comparison:** which supplier gives best value for YOUR menu style
- **Par level suggestions:** based on upcoming event calendar
- **Purchase timing:** "price drops Tuesdays at this chain historically"
- **Waste reduction:** "you over-purchased salmon by 2lb last 3 events"

### Layer 5: Market Positioning

- **Regional benchmarks:** "chefs in your market charge $X/head for similar menus"
- **Pricing power detection:** "you're 15% below market for this service level"
- **Auto-adjust triggers:** ingredient costs shift, suggest quote adjustment with justification
- **Win/loss correlation:** price too high or too low? Data answers this.
- **Confidence scores on quotes:** "this quote covers costs + 35% margin with HIGH confidence"

### Layer 6: Predictive Supply Chain

- **Origin intelligence:** know WHERE ingredients come from by season
- **Shortage prediction:** if California drought worsens, these 47 ingredients get hit
- **Carbon/miles scoring:** sustainability-conscious chefs see environmental cost
- **Lead time awareness:** some ingredients need advance ordering in certain regions
- **Seasonal availability calendars:** per growing region, not just national averages

---

## Multi-Tier User Intelligence

PIE serves different users differently. Same engine, different surfaces:

| Tier | User                  | What PIE gives them                            |
| ---- | --------------------- | ---------------------------------------------- |
| 1    | Home cook             | "Is this recipe affordable this week?"         |
| 2    | Private chef          | Full cost/margin/quote engine, event economics |
| 3    | Restaurant operator   | Par levels, waste tracking, menu engineering   |
| 4    | Caterer               | Event-scale bulk pricing, timeline purchasing  |
| 5    | Food truck            | Daily menu optimization based on today's costs |
| 6    | Meal prep service     | Weekly batch cost optimization                 |
| 7    | Recipe platform (API) | Ingredient cost enrichment for any recipe      |

---

## Data Acquisition at Scale (No Crowdsourcing of Core Data)

OpenClaw remains the engine. Users never build the database. But:

- **Receipt OCR (opt-in):** user scans receipt, PIE learns local prices passively. Zero labor from user.
- **Loyalty card integration:** actual purchase prices, not shelf prices. Higher accuracy.
- **Wholesale club data:** Costco, Restaurant Depot, US Foods pricing tiers
- **Government feeds:** USDA, BLS CPI food indices, commodity futures
- **Wholesale catalog ingestion:** Sysco, US Foods price sheets (where accessible)
- **API partnerships:** grocery delivery platforms expose pricing via API

All acquisition is autonomous. Receipt OCR improves the model; it doesn't
depend on it. If zero users ever scan a receipt, PIE still works at full
capability from OpenClaw data alone.

### Receipt OCR: The Passive Signal Engine

The highest-value passive signal. A chef photographs a grocery receipt after
shopping. PIE extracts: store, date, item names, quantities, prices, location.
Zero labor from the chef beyond taking a photo they'd take anyway for expense tracking.

**Why this is powerful:**

- Ground truth at the store/item/date/location level (best possible accuracy validation)
- Discovers items and prices OpenClaw scraping misses (specialty stores, farmers markets)
- Scales with user count (more users = more receipts = better prices for everyone)
- Captures actual PURCHASE prices (after coupons, sales, loyalty discounts)
- Geographic signal: reveals which stores a chef actually uses

**Architecture:**

```
[Photo] -> Local AI (Gemma 4) OCR -> Structured data -> PIE ingestion
```

Processing happens locally (on-device or on Pi). No cloud dependency.
Structured output: `{ store, date, zip, items: [{ name, qty, unit, price }] }`

**Privacy guarantees:**

- Receipt data stored per-chef, never shared with other users
- Aggregate signals (price averages) are anonymized before feeding PIE
- Chef can delete all their receipt data at any time
- No receipt data leaves the self-hosted infrastructure

**What it feeds:**

- Accuracy validation (receipt price vs PIE served price = ground truth)
- Regional price discovery (stores not in scraping pipeline)
- Seasonal pattern detection (what chefs buy when)
- Purchasing behavior (for future purchasing intelligence features)
- Census expansion (items on receipts not in Census = new ingredients)

---

## Price Confidence Scoring (User-Visible)

Every price the user sees carries visible confidence:

```
HIGH    - 3+ sources, updated within freshness tier, verified
MEDIUM  - 1-2 sources, or synthetic validated against real data
LOW     - synthetic only, or approaching staleness
STALE   - past freshness threshold, re-estimation in progress
```

UX implications:

- HIGH confidence: auto-fill in quotes, no friction
- MEDIUM: show price, subtle indicator
- LOW: show price with "estimate" badge, suggest verification
- STALE: never shown. System re-estimates before serving.

Confidence drives trust. Trust drives adoption. Adoption drives network effect.

---

## Regional Accuracy: ZIP-Code Granularity

National averages are useless for purchasing decisions.

- **Pricing regions:** ~400 metro/micro statistical areas
- **Micro-market detection:** college towns, food deserts, tourist areas price differently
- **Delivery radius awareness:** same ingredient costs different across town
- **Local chain knowledge:** Publix (FL), HEB (TX), Wegmans (NE), Market Basket (NH/MA)
- **ZIP-level resolution:** when store-level data exists, use it

A chef in Haverhill, MA and a chef in Austin, TX see completely different
price landscapes. PIE knows both.

---

## Reliability at Millions of Users

### Graceful Degradation (never $0, never blank)

```
Real price (local store) > Regional real average > State average >
Multi-state average > Synthetic (regional) > Synthetic (national) >
Category baseline > "Price unavailable - estimating"
```

The last state ("estimating") triggers an async job. Within minutes, a
synthetic materializes. The user is never permanently stuck.

### Offline Capability

Mobile users in markets, kitchens with bad WiFi. PIE caches:

- Full price set for user's top 200 ingredients (locally)
- Regional averages for their area
- Last-known prices with freshness timestamps

Works offline. Syncs when connected.

### Scale Architecture (future)

- Read replicas per region (edge-cached pricing)
- Price resolution < 50ms p99
- Batch pricing (full menu cost) < 200ms
- No single point of failure in serving path

---

## The Network Effect Moat

```
More users -> more receipt data -> better prices ->
more users -> better geographic density ->
hyperlocal accuracy -> indispensable ->
more users
```

**First-mover advantage:** No one tracks INGREDIENTS across products, brands,
sizes, units at scale. Grocery apps track SKUs. Recipe apps guess at costs.
Nobody does what PIE does: resolve "2 lbs chicken thighs" into a real,
local, current, trustworthy dollar amount.

---

## Monetization Path

| Tier       | Price       | What                                                    |
| ---------- | ----------- | ------------------------------------------------------- |
| Free       | $0          | 10 lookups/day, basic pricing, no analytics             |
| Pro        | TBD         | Unlimited, full analytics, trend alerts, menu economics |
| API        | Usage-based | Third-party apps query PIE for pricing enrichment       |
| Enterprise | Custom      | Restaurant groups, food service companies, meal kit ops |

The API tier is the long game. Become the pricing truth layer that every
food app depends on. The Zillow Zestimate of food.

---

## Success Metrics (compound over time, only go up)

| Metric                          | Current (measured 2026-05-04)                 | 6 Month | 1 Year | 3 Year |
| ------------------------------- | --------------------------------------------- | ------- | ------ | ------ |
| Census size                     | 141,553                                       | 175K    | 200K   | 250K+  |
| Norm-linked (has product match) | 87.1% (123K/141K)                             | 93%     | 97%    | 99%+   |
| Real price coverage             | TBD (freshness unknown, sync stale)           | 60%     | 75%    | 85%+   |
| Priced store_products           | 39,012,269                                    | 50M     | 75M    | 100M+  |
| States/territories with data    | 62 (all)                                      | 62      | 62     | 62     |
| Active stores                   | 196,964                                       | 220K    | 250K   | 300K+  |
| Active chains                   | 15,089                                        | 16K     | 18K    | 20K+   |
| Norm map entries                | 180,644                                       | 220K    | 280K   | 400K+  |
| Freshness (7-day volatile)      | 0% (Pi down 26d; 92% within 30d when syncing) | 70%     | 90%    | 99%    |
| Multi-source ingredients        | 42.9% (52K/123K)                              | 55%     | 65%    | 80%+   |
| Accuracy (within 15% of shelf)  | unmeasured                                    | 75%     | 85%    | 92%+   |
| Price resolution latency        | ~500ms                                        | 200ms   | 100ms  | 50ms   |

---

## Accuracy Validation Framework

PIE is useless if prices are wrong. Accuracy must be measured, tracked,
and continuously improved. This is not optional at scale.

### Validation Methodology

**Ground Truth Sources:**

- Fresh store scrapes (< 24 hours old) serve as ground truth
- USDA weekly commodity reports (proteins, produce)
- BLS CPI food component data (monthly)
- Receipt OCR data from users (passive, opt-in)

**Validation Process (automated, weekly):**

1. Select 200 random ingredients across all active regions
2. For each: compare PIE's served price vs latest ground truth
3. Compute accuracy: `|served - actual| / actual * 100`
4. Pass threshold: within 15% = accurate
5. Track: % of sample within 15%, mean absolute error, worst offenders

**Accuracy Tiers:**

- **Excellent:** > 92% within 15% (3-year target)
- **Good:** 85-92% within 15% (1-year target)
- **Acceptable:** 75-85% within 15% (6-month target)
- **Failing:** < 75% (current state: unmeasured)

**Regression Detection:**

- If weekly accuracy drops > 5 points: automatic investigation
- If specific region drops: likely source failure (trigger Law 5)
- If specific category drops: likely seasonal shift unaccounted for

**Accuracy by Confidence Level:**

- HIGH confidence prices must be > 95% accurate (or confidence is a lie)
- MEDIUM must be > 80% accurate
- LOW can be > 60% accurate (the user knows it's uncertain)
- If any tier consistently misses: recalibrate confidence scoring

**Feedback Loop (Law 7: Compound Learning):**

- Every validation run generates calibration data
- Synthetic models retrain against validated ground truth
- Regional multipliers adjust based on observed vs predicted
- Seasonal factors sharpen with each year of validated data
- Accuracy improvements are permanent (ratchet)

### Accuracy Logging

Weekly accuracy reports append to `docs/pie-accuracy-log.md`:

```markdown
## [ISO date]

Sample: 200 ingredients, 15 regions
Accuracy (within 15%): 78.5%
Mean absolute error: 11.2%
Worst category: seafood (62% accurate, seasonal shift)
Worst region: Alaska (54% accurate, sparse data)
Action taken: [what was fixed]
```

---

## Relationship to PIE Laws

The 10 Laws remain immutable. This vision spec describes WHERE PIE is going.
The Laws describe HOW it behaves at any scale. The Laws are the constitution;
this is the strategic plan.

New laws may be added as scale demands. Existing laws never weaken.

---

## Relationship to /pie-ratchet

The ratchet is the daily mechanism that moves PIE toward this vision.
Every ratchet cycle should reference these metrics and targets. The ratchet
doesn't need to know the full vision; it just needs to make the numbers go up.
But its priority ranking should be informed by what matters most at current scale.

---

## API-First Architecture

PIE at scale is not a feature inside ChefFlow. It's an independent service
that ChefFlow consumes. Other apps consume it too.

### Public API Surface

```
GET /api/pie/v1/price?ingredient=chicken+thighs&zip=01835
GET /api/pie/v1/price/batch          (POST body: ingredient[], zip)
GET /api/pie/v1/menu-cost            (POST body: recipe[], servings, zip)
GET /api/pie/v1/trend?ingredient=salmon&region=new-england
GET /api/pie/v1/forecast?ingredient=asparagus&zip=01835&days=30
GET /api/pie/v1/substitutes?ingredient=salmon&max=5
GET /api/pie/v1/volatility?ingredient=chicken+thighs
GET /api/pie/v1/seasonal?ingredient=asparagus
GET /api/pie/v1/coverage?state=MA
GET /api/pie/v1/health
```

### Response Shape (single price)

```json
{
  "ingredient": "chicken thighs",
  "price_cents": 499,
  "unit": "lb",
  "confidence": "high",
  "source_type": "store_scrape",
  "region": "new-england",
  "zip": "01835",
  "freshness": "2d",
  "trend_7d": "+3.2%",
  "trend_30d": "+8.1%",
  "volatility": "moderate",
  "seasonal_index": 1.05,
  "alternatives": [{ "ingredient": "chicken drumsticks", "price_cents": 299, "savings_pct": 40 }],
  "updated_at": "2026-05-04T02:00:00Z"
}
```

### Rate Limiting and Tiers

| Tier       | Requests/day | Features                                | Price  |
| ---------- | ------------ | --------------------------------------- | ------ |
| Free       | 50           | Single price lookup, basic confidence   | $0     |
| Pro        | 5,000        | Batch, trends, forecasts, substitutions | TBD    |
| Business   | 50,000       | Full API, webhooks, custom regions      | TBD    |
| Enterprise | Unlimited    | SLA, dedicated support, raw data access | Custom |

### Webhook Events (Pro+)

```
price.spike       - ingredient price jumped > 20% in 7 days
price.drop        - ingredient price dropped > 15% in 7 days
seasonal.entering - ingredient entering cheap season
seasonal.leaving  - ingredient leaving cheap season
source.failure    - data source went dark (affects confidence)
coverage.new      - new region/ingredient now covered
```

### Self-Hosted Option

For enterprise/privacy-conscious users: full PIE runs on their hardware.
Same architecture as current Pi setup, just larger. Docker image + SQLite

- sync service. $0 ongoing cost, full data ownership.

---

## Competitive Moat (Why This Is Hard to Replicate)

1. **Ingredient-level, not SKU-level.** Grocery apps track "Tyson Boneless
   Skinless Chicken Breast 3lb" (SKU). PIE tracks "chicken breast" across
   every brand, package size, and store. Normalization is the hard problem.
   Our normalization_map with 245K+ entries is years of compound data.

2. **Geographic depth.** 150K+ stores from OSM. 50 states. ZIP-code resolution.
   Building this from scratch takes years of scraping infrastructure.

3. **Temporal depth.** Every day of price history makes seasonal models,
   trend detection, and forecasting more accurate. A competitor starting
   today has zero history. We have months already compounding.

4. **Synthesis intelligence.** When real data doesn't exist, PIE generates
   defensible estimates from category baselines, regional multipliers,
   seasonal factors, and cross-store inference. This is trained on real data.
   More real data = better synthetics. Feedback loop.

5. **Domain specificity.** Built BY a chef, FOR chefs. Every decision
   (what's volatile, what substitutes for what, what "accuracy" means for
   a purchasing decision) is informed by 10+ years of professional cooking.
   Generic pricing tools don't understand food.

6. **Self-hosted economics.** Running on a Raspberry Pi. $0/month infrastructure.
   Competitors need cloud spend. We can offer the same quality at a fraction
   of the cost, or free.

7. **Compound learning (Law 7).** Every day PIE runs, it gets better
   automatically. Models calibrate, patterns sharpen, anomaly detection
   improves. A competitor must match not just today's quality but the
   accumulated learning of every day since launch.

---

## What This Changes About ChefFlow

ChefFlow stops being "a tool David built for himself" and becomes the
interface through which millions of food professionals access PIE. ChefFlow
is the application layer. PIE is the intelligence layer. They are separable.

Other apps can consume PIE via API without ever touching ChefFlow. ChefFlow
is PIE's first and best client, not its only one.

---

## Phased Execution

| Phase   | Timeline   | Focus                                                | Gate to next                      |
| ------- | ---------- | ---------------------------------------------------- | --------------------------------- |
| 0 (NOW) | Current    | Layer 1: coverage, freshness, accuracy               | > 80% coverage, accuracy measured |
| 1       | +3 months  | Layer 2: trends, volatility, seasonality             | Forecast accuracy > 70%           |
| 2       | +6 months  | API alpha: free tier, rate-limited                   | 100 external users                |
| 3       | +9 months  | Menu economics, purchasing intelligence              | Used by 10 paying chefs           |
| 4       | +12 months | Public API, pro tier, network effect passive signals | 1000+ users                       |
| 5       | +18 months | Scale: edge caching, offline, enterprise             | Serving 50K+ queries/day          |
| 6       | +24 months | Market positioning, competitive intelligence         | Revenue-positive                  |

Each phase builds on the previous. No skipping. The ratchet keeps turning.
