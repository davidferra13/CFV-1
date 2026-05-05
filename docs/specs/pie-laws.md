# PIE Laws: The 10 Immutable Laws of the Pricing Intelligence Engine

> These are not goals. These are laws. Violations are catastrophic failures.
> Every architectural decision, every cron job, every fallback, every UI element
> in PIE must satisfy ALL 10 laws simultaneously. No tradeoffs. No exceptions.

Ratified: 2026-05-03

---

## Law 1: Total Autonomy

Pi is self-reliant. It generates prices 24/7 without human input. No chef ever
types a price into this system. No human curates data. Pi acquires, validates,
estimates, and serves prices entirely on its own. It self-repairs when pipelines
break. It self-improves as it learns better acquisition strategies. It discovers
new data sources and adapts to old ones dying. Pi at 3am with nobody watching
performs identically to Pi at 3pm with someone watching.

**Violation:** Any price that requires human input to exist or update.

---

## Law 2: Universal Coverage

If any chef in any zip code in any US state or territory searches for any
reasonable food ingredient and gets nothing, or gets a number they cannot
trust enough to make a purchasing decision, that is a catastrophic failure.

100% ingredient coverage. 100% geographic coverage. No dead zones.
No "data not available." No blank fields.

**Violation:** A chef searches for a common ingredient and sees nothing.

---

## Law 3: Honesty Over Silence

Every price carries a confidence score and source attribution. Estimated
prices are clearly marked as estimates, but they are NEVER withheld. A chef
sees "$4.50/lb (regional estimate, medium confidence)" rather than nothing.

Transparency builds trust. Silence destroys it. Chefs are professionals;
they can handle knowing a number is an estimate. What they cannot handle
is having no number at all.

**Violation:** Withholding a price because confidence is low.

---

## Law 4: Freshness Guarantee

No price older than its freshness threshold is served without re-estimation.
Stale data is worse than estimated data because it masquerades as real.

Freshness tiers:

- **Volatile** (produce, dairy, meat, seafood): 7 days max
- **Moderate** (bakery, deli, frozen): 14 days max
- **Stable** (dry goods, spices, canned, oils): 30 days max

When a price crosses its freshness threshold, Pi either refreshes it from
source or re-estimates it. The chef never sees a stale price without knowing
it was re-estimated.

**Violation:** Serving a 45-day-old produce price as current.

---

## Law 5: Self-Healing

When Pi detects anomalies (price doubled overnight, store went dark, scraper
broke, API changed, data source disappeared), it:

1. Quarantines bad data immediately
2. Falls back to next source in the fallback chain
3. Auto-repairs the pipeline if possible
4. Logs the incident for trend analysis
5. Continues serving prices without interruption

A broken scraper at 3am does not mean broken prices at 9am. No human
intervention is needed for recovery. Pi heals itself.

**Violation:** A broken data source causing blank or bad prices for any chef.

---

## Law 6: Geographic Intelligence

Pi does not just know prices; it knows WHERE prices are. Every chef gets
prices contextualized to their region, their nearby stores, their local
market conditions.

The resolution order:

1. Chef's specific nearby stores (if scraped)
2. Chef's metro area / pricing region
3. Chef's state average
4. Chef's multi-state region (e.g., New England, Southeast)
5. National average

National averages are the floor, not the ceiling. A chef in rural Montana
and a chef in Manhattan get different prices because their markets are
different.

**Violation:** Showing a New York City chef Iowa prices as their local market.

---

## Law 7: Compound Learning

Every day Pi runs, it gets smarter. This is not aspirational; it is
architectural. The system must be designed so that:

- Seasonal patterns sharpen with each year of data
- Store reliability scores improve with each scrape cycle
- Estimation models calibrate against real prices as they arrive
- Price history deepens, making trends more accurate
- Anomaly detection gets more precise as baselines solidify
- Synthetic pricing accuracy improves as more real prices validate estimates

Pi at 6 months is dramatically better than Pi at launch. Pi at 2 years is
dramatically better than Pi at 6 months. Without anyone touching it.

**Violation:** Estimation accuracy plateauing because models are static.

---

## Law 8: The Census

Before Pi can find a single price, it must know exactly how many prices
it NEEDS to find. Pi maintains a master manifest (the Census) of every
food ingredient that exists in American commerce.

Coverage is measured against the Census, not against "what we happen to
have." If the Census says 200,000 ingredients exist across 400 pricing
regions, that is 80,000,000 price cells. If Pi has filled 20,000,000 of
them (real + synthetic), coverage is 25%.

The Census itself is continuously refined:

- New ingredients discovered via scraping are added
- Discontinued items are marked inactive
- Seasonal items are flagged with availability windows
- Regional specialties are tagged by geography

The Census number is always known, always published, always growing.

**Violation:** Not knowing what 100% coverage means.

---

## Law 9: Synthetic Pricing

When Pi cannot obtain a real observed price through any acquisition channel
(scraping, government data, wholesale catalogs, APIs), it MUST generate a
synthetic price using every available signal:

- Regional averages for that ingredient category
- Category baselines (protein per lb, produce per lb, etc.)
- USDA baseline prices
- Seasonal adjustment factors
- Weight/unit extrapolation from known pack sizes
- Brand-tier modeling (premium vs store brand vs bulk)
- Nearby-state interpolation
- Historical trend projection
- Commodity index correlation

A synthetic price is never as good as a real one. But it is infinitely
better than nothing. Synthetic prices are clearly attributed as synthetic
and carry appropriate confidence scores. They are replaced by real prices
the moment real data arrives.

**Every ingredient in the Census has a price. Always. No exceptions.**

**Violation:** An ingredient in the Census with no price (real or synthetic).

---

## Law 10: No Unprotected Price

Every single price in the system, real or synthetic, must have a fallback
chain. If the primary source dies, the next source activates. If that dies,
the next. The chain runs all the way to the bottom.

The fallback waterfall (in priority order):

1. Chef receipt / override
2. Direct store scrape (current)
3. Third-party API (Instacart, flyer data)
4. Wholesale catalog price
5. Regional average (same ingredient, nearby stores)
6. State average
7. Multi-state regional average
8. National average
9. USDA baseline
10. Category baseline (avg protein/lb, avg produce/lb)
11. Synthetic estimate (derived from all available signals)

If ANY ingredient for ANY chef in ANY American state or territory falls
through the entire chain and produces nothing, that is a catastrophic
failure.

**The Apple Test:** A chef in any state searches "apple." They get a price
accurate enough to drive a purchasing decision. Not a guess. Not "data
unavailable." A real, usable, trustworthy number.

**Violation:** Any ingredient reaching the bottom of the fallback chain
with no price.

---

## Law 11: Actionable Intelligence

A price without context is just a number. PIE must deliver intelligence,
not data. Every price exists within a context: trend (up/down/stable),
volatility (risky/safe), seasonality (peak/trough/window), and alternatives
(substitutions that save money without sacrificing quality).

At scale, the value of PIE is not "here's a price" but "here's what to DO
with this price." A chef sees "$8.50/lb (up 12% this month, high volatility,
consider pork loin at $4.20/lb for similar application)" and makes a better
business decision than a chef who just sees "$8.50/lb."

Intelligence layers activate progressively as data depth allows. But the
architecture must support them from day one. A price without trend data is
acceptable at launch. A price that CAN NEVER have trend data is a design
failure.

**Violation:** Serving millions of prices with no path to contextual intelligence.

---

## Law 12: Scale Without Degradation

PIE must serve one user and one million users with identical quality. No
"works great for the first 100 chefs but breaks at scale" architectures.
No designs that assume low traffic. No single-threaded bottlenecks in the
serving path.

Price resolution latency must remain under 100ms p99 regardless of
concurrent users. Batch pricing (full menu cost) under 200ms. Geographic
resolution must not require round-trips to a single central database when
users are distributed across the country.

Offline capability is mandatory. A chef in a kitchen with bad WiFi or at
a farmers market with no signal must still access their pricing data.
Cached, timestamped, with freshness indicators.

**Violation:** A user experiencing slower or worse pricing because other users exist.

---

## Law 13: Network Effect Architecture

The system must be designed so that each additional user makes PIE better
for ALL users, without requiring labor from any user. Passive signals
(receipt scans, purchase confirmations, location data) feed back into the
model. No user is ever asked to contribute data as a chore.

More users in a region = better local price accuracy = more useful to the
next user in that region. This flywheel must be architectural, not
aspirational. Data pipelines, confidence scoring, and regional models must
be designed to ingest passive user signals from day one.

But: the system must work PERFECTLY with zero user contributions. OpenClaw
is the floor. User signals are the ceiling. If all users disappeared
tomorrow, PIE still serves accurate prices from OpenClaw alone.

**Violation:** Core pricing quality depending on user participation.

---

## Measuring Compliance

| Law | Metric                                               | Target   |
| --- | ---------------------------------------------------- | -------- |
| 1   | Human data inputs required per day                   | 0        |
| 2   | Ingredients with zero price in any region            | 0        |
| 3   | Prices served without confidence score               | 0        |
| 4   | Prices served past freshness threshold               | 0        |
| 5   | Mean time to recover from source failure             | < 1 hour |
| 6   | Chefs receiving non-local prices as primary          | 0        |
| 7   | Month-over-month estimation accuracy delta           | Positive |
| 8   | Census completeness (% of USDA FDC covered)          | > 95%    |
| 9   | Census ingredients with no price (real or synthetic) | 0        |
| 10  | Ingredients with no fallback chain                   | 0        |
| 11  | Prices with no path to trend/context data            | 0        |
| 12  | Price resolution p99 latency                         | < 100ms  |
| 13  | Core quality dependent on user contributions         | 0%       |

---

## What This Means for Architecture

Pi is not a scraper with a database. Pi is an autonomous pricing agent that:

- Runs 24/7 on dedicated hardware
- Maintains the Census of all American food ingredients
- Acquires real prices through every channel available
- Generates synthetic prices where real ones don't exist
- Serves every chef in every region with localized, fresh, attributed prices
- Self-heals when things break
- Self-improves as data accumulates
- Never asks a human to do its job
