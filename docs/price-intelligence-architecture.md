# Price Intelligence Architecture

## Core Principle

No single data source. No brute force. Every price is triangulated from multiple independent sources. If any source goes down, the system continues with degraded confidence, not zero data.

## Data Acquisition Strategies (ranked by reliability)

### Tier 1: Official APIs (highest reliability, no blocking risk)

| Source                            | Chains Covered                    | Cost              | Status               |
| --------------------------------- | --------------------------------- | ----------------- | -------------------- |
| Kroger API (developer.kroger.com) | 18 Kroger banners (2,700+ stores) | Free (5K req/day) | NOT BUILT            |
| USDA BLS Average Prices           | ~60 food items, 5 US regions      | Free              | LIVE (416 baselines) |
| USDA FoodData Central             | Nutrition + some pricing          | Free              | NOT BUILT            |

### Tier 2: Structured APIs (no browser, low blocking risk)

| Source                   | Chains Covered                | Cost | Status         |
| ------------------------ | ----------------------------- | ---- | -------------- |
| Flipp API                | 44+ chains (weekly ad prices) | Free | LIVE (working) |
| Whole Foods / Amazon ALM | Whole Foods (21 regions)      | Free | LIVE (working) |
| Google Shopping API      | Multiple retailers            | Paid | NOT BUILT      |

### Tier 3: Website Scraping (browser required, moderate blocking risk)

| Source                  | Chains Covered | Cost | Status            |
| ----------------------- | -------------- | ---- | ----------------- |
| Instacart (Puppeteer)   | 130 chains     | Free | BLOCKED (captcha) |
| Chain websites (direct) | Varies         | Free | NOT BUILT         |

### Tier 4: User-Contributed (zero blocking risk, sparse)

| Source             | Coverage  | Cost | Status               |
| ------------------ | --------- | ---- | -------------------- |
| Receipt uploads    | Any store | Free | SCHEMA EXISTS, no UI |
| Manual price entry | Any store | Free | EXISTS               |

## The Right Order

1. **Kroger API** - Free, official, 18 banners, real in-store prices. No captcha, no blocking, no Instacart markup. This covers the #1 grocery company in America. BUILD THIS FIRST.

2. **Flipp expansion** - Already working. Expand to more zip codes and merchants. Validate all merchant IDs.

3. **Chain-specific APIs/feeds** - Many chains publish weekly circulars as structured data. Publix, H-E-B, Safeway all have digital circular APIs.

4. **Instacart (when unblocked)** - Keep the scraper, but use it surgically: targeted chains that have no other source. Not as the primary strategy for everything.

5. **Receipt processing** - Build the upload flow. Every chef receipt is real verified pricing data.

## Daemon Architecture

One process on the Pi. Runs 24/7. Picks the highest-priority task from a queue. Self-heals on failure.

```
while true:
  task = pick_highest_priority_task()

  if task.strategy == 'api':
    result = call_official_api(task)
  elif task.strategy == 'flipp':
    result = search_flipp(task)
  elif task.strategy == 'scrape':
    result = puppeteer_scrape(task)

  if result.success:
    store_prices(result)
    update_task_schedule(task, success=True)
  else:
    log_failure(task)
    try_fallback_strategy(task)
    update_task_schedule(task, success=False, backoff=True)

  sleep(adaptive_delay(task))
```

## Monitoring

- Heartbeat: Pi pings PC every 5 minutes
- Coverage dashboard: what percentage of chains have fresh data (<7 days)
- Alert on: scraper crash, coverage drop >10%, no new data in 24h
- Status endpoint: /api/openclaw/status (for app.cheflowhq.com)
