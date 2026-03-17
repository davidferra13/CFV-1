# Directory Crawler Agent

Autonomous crawler that populates the ChefFlow `/discover` directory from OpenStreetMap.

## How it works

1. **Crawl**: Queries OSM Overpass API for food businesses within configured bounding boxes
2. **Classify**: Deterministic mapping of OSM tags to ChefFlow categories (no LLM needed)
3. **Insert**: Writes to `directory_listings` table with `status: 'discovered'`, `source: 'openstreetmap'`

All inserted listings follow the consent boundary: public facts only (name, city, cuisine, website). No email, phone, or address from scraping.

## Usage

```bash
cd scripts/crawler
npm install

# Dry run (preview, no database writes)
DRY_RUN=1 node index.mjs

# Crawl a specific region
SUPABASE_SERVICE_ROLE_KEY=xxx node index.mjs --region "Austin"

# Crawl all regions
SUPABASE_SERVICE_ROLE_KEY=xxx node index.mjs
```

## Running on a Raspberry Pi

```bash
# Cron job: crawl all regions at 3am daily
0 3 * * * cd /home/pi/crawler && SUPABASE_SERVICE_ROLE_KEY=xxx node index.mjs >> crawl.log 2>&1
```

Requirements: Node.js 18+, internet access, `SUPABASE_SERVICE_ROLE_KEY` env var.

## Configuration

Edit `scripts/crawler/config.json`:

- **regions**: Array of `{ name, bbox: [south, west, north, east], state }`. Keep bboxes small (0.05-0.10 degree span) to avoid Overpass timeouts.
- **overpass.rateLimitMs**: Minimum ms between API calls (default 5000). Respect the API.
- **crawl.maxPerRegion**: Cap per region (default 500).

## Classification

`classify.mjs` maps OSM tags deterministically:

- `amenity=restaurant` -> `restaurant`
- `shop=bakery` -> `bakery`
- `cuisine=mexican` -> cuisine type `mexican`
- 60+ cuisine mappings covering all 21 ChefFlow categories

No LLM involved. Formula > AI applies here because OSM data is already structured.

## Adding a new region

Add an entry to `config.json` `regions` array. Use [bboxfinder.com](http://bboxfinder.com) to get coordinates. Keep the bbox under ~0.1 degrees on each axis to avoid Overpass 504 timeouts.

## Files

| File                           | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `scripts/crawler/index.mjs`    | Main orchestrator, CLI argument parsing                       |
| `scripts/crawler/osm.mjs`      | Overpass API queries with rate limiting and endpoint fallback |
| `scripts/crawler/classify.mjs` | Deterministic OSM tag to ChefFlow category mapping            |
| `scripts/crawler/insert.mjs`   | Supabase insertion with slug generation and deduplication     |
| `scripts/crawler/config.json`  | Regions, API settings, crawl parameters                       |
