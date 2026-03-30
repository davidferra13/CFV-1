# Spec: OpenCLAW Mission Control Dashboard

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** not started

---

## What This Does (Plain English)

A lightweight real-time dashboard running on the Raspberry Pi that shows exactly what OpenCLAW is doing at any given moment. Open `http://10.0.0.177:8090` in a browser tab, leave it there, and watch everything happen in real time. No interaction needed. No SSHing into the Pi. No asking agents for status updates. Just a live, auto-refreshing view of every job, every scraper, every database stat, every error, and every upcoming task.

---

## Why It Matters

The developer has zero visibility into what OpenCLAW is doing. The Pi runs 24/7 with 20+ cron jobs and the developer can't tell if it's working at 10% capacity or broken. This dashboard eliminates every "what is OpenCLAW doing right now?" question forever.

---

## Architecture

**Pi-side only.** This is a standalone Express server on the Pi (port 8090). It has zero dependencies on ChefFlow. It reads from:

- SQLite databases (scrape_runs, catalog data, price stats)
- System commands (`ps aux`, `free`, `df`, `uptime`)
- Crontab (`crontab -l`)
- Log files (stdout/stderr from scraper processes)

It serves a single HTML page with embedded JS that auto-refreshes every 10 seconds via fetch polling.

---

## Files to Create (on Pi)

| File                                              | Purpose                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `~/openclaw-dashboard/server.mjs`                 | Express server (~250 lines), serves API + static HTML |
| `~/openclaw-dashboard/index.html`                 | Single-page dashboard with embedded CSS/JS            |
| `~/openclaw-dashboard/package.json`               | Dependencies: express, better-sqlite3                 |
| `~/openclaw-dashboard/openclaw-dashboard.service` | systemd unit file for auto-start                      |

---

## Dashboard Sections

### 1. Live Job Status (Top Banner)

Shows what's running RIGHT NOW. Reads `ps aux | grep openclaw` and parses process names.

```text
ACTIVE JOBS (2 running)
  [=====>    ] instacart-department-walker  --region haverhill-ma  (12 min, 14/22 departments)
  [===>      ] flipp-scraper               --zip 01835            (3 min, 45 items)

IDLE - Next job: openclaw-enricher-openfoodfacts in 2h 14m
```

**Data source:** `ps aux` filtered to openclaw processes + `scrape_runs` table for progress tracking.

### 2. Job History (Last 24 Hours)

Chronological list of completed jobs with pass/fail, duration, and item counts.

```text
LAST 24 HOURS
  [PASS] 11:00 PM  price-sync-to-chefflow       42s    matched: 8,421  updated: 312
  [PASS] 10:45 PM  instacart-walker-haverhill    18m    products: 9,842  new: 23
  [PASS] 10:00 PM  flipp-flyer-scrape            3m     items: 847      sales: 212
  [FAIL] 06:00 PM  instacart-walker-portland     0s     ERROR: session expired
  [PASS] 04:00 PM  openfoodfacts-enricher        45m    enriched: 1,204  skipped: 9,880
```

**Data source:** `scrape_runs` table, ordered by `started_at DESC`, limit 50.

### 3. Database Pulse

Live stats from SQLite. The heartbeat of the system.

```text
DATABASE PULSE
  Canonical ingredients:  11,084
  Current prices:          8,745   (79% coverage)
  Price changes (7d):        312
  Freshest price:         2 hours ago  (Instacart - Whole Foods)
  Stalest active price:   47 days      (Government - USDA baseline)
  Catalog products:      512,847
  Stores tracked:            127
  Flyer archive:          12,480 snapshots
```

**Data source:** `SELECT count(*) FROM ...` queries on canonical_ingredients, current_prices, catalog_products, catalog_stores. `MAX/MIN(last_confirmed_at)` for freshness.

### 4. Scraper Health Grid

Each scraper as a colored status cell. Green = ran successfully in last 24h. Yellow = ran but had errors. Red = hasn't run in 48h+. Gray = disabled.

```text
SCRAPER HEALTH
  [GREEN]  Instacart Haverhill    last: 2h ago     items: 9,842
  [GREEN]  Instacart Portland     last: 3h ago     items: 8,201
  [GREEN]  Flipp Flyers           last: 5h ago     items: 847
  [GREEN]  OpenFoodFacts          last: 18h ago    enriched: 1,204
  [YELLOW] Whole Foods Direct     last: 22h ago    errors: 3
  [RED]    Target Redsky          last: 3 days     NOT RUNNING
  [GRAY]   Hannaford              disabled
```

**Data source:** `scrape_runs` grouped by `scraper_name`, `MAX(started_at)`, error counts.

### 5. System Resources

Pi hardware utilization.

```text
SYSTEM
  CPU:     12%  [==          ]
  RAM:     2.1 / 8.0 GB  [=====       ]  (26%)
  Disk:    14.2 / 128 GB [==          ]  (11%)
  Uptime:  47 days
  Temp:    42C
```

**Data source:** Node.js `os` module (`os.loadavg()`, `os.freemem()`, `os.totalmem()`), `df -h`, `/sys/class/thermal/thermal_zone0/temp`.

### 6. Cron Schedule (Next 12 Hours)

What's coming up.

```text
UPCOMING (next 12 hours)
  In 2h 14m   openclaw-enricher-openfoodfacts
  In 4h 30m   flipp-flyer-scrape
  In 6h 00m   instacart-walker-haverhill
  In 6h 15m   instacart-walker-portland
  In 8h 00m   price-sync-to-chefflow
  In 11h 00m  nightly-full-catalog-sync
```

**Data source:** Parse `crontab -l`, compute next execution time for each entry, sort ascending.

### 7. Error Log (Last 50)

Most recent errors with timestamps and source.

```text
RECENT ERRORS
  [06:00 PM] instacart-walker-portland: Session token expired (HTTP 401)
  [04:12 PM] openfoodfacts-enricher: Rate limited on "truffle oil" (HTTP 429, retrying)
  [02:30 AM] flipp-scraper: No flyers found for Hannaford this week
```

**Data source:** `scrape_runs WHERE errors > 0`, plus `error_details` column, ordered by `started_at DESC`.

---

## Server API Endpoints

| Endpoint                    | Returns                                       |
| --------------------------- | --------------------------------------------- |
| `GET /`                     | Serves index.html                             |
| `GET /api/status`           | Full dashboard JSON (all 7 sections combined) |
| `GET /api/jobs/active`      | Currently running processes                   |
| `GET /api/jobs/history`     | Last 50 completed jobs                        |
| `GET /api/database/pulse`   | Database stats                                |
| `GET /api/scrapers/health`  | Per-scraper health grid                       |
| `GET /api/system/resources` | CPU, RAM, disk, temp                          |
| `GET /api/cron/schedule`    | Next 12 hours of scheduled jobs               |
| `GET /api/errors/recent`    | Last 50 errors                                |

All endpoints return JSON. No auth (local network only, Pi is not exposed to internet).

---

## HTML Dashboard Design

**Style:** Dark background (#1a1a2e), monospace font (JetBrains Mono or system mono), green/yellow/red status colors. Clean, terminal-inspired. No frameworks, no build step, no external dependencies. Embedded CSS + vanilla JS.

**Layout:** Single column, sections stacked vertically. Each section is a card with a header and content area. The page fits on a single screen at 1080p with scrolling for history/errors.

**Auto-refresh:** `setInterval(() => fetch('/api/status').then(render), 10000)` - every 10 seconds.

**No interaction needed.** This is a read-only monitoring page. No buttons, no forms, no inputs. Just data.

---

## Deployment

```bash
# On the Pi:
cd ~/openclaw-dashboard
npm install
sudo cp openclaw-dashboard.service /etc/systemd/system/
sudo systemctl enable openclaw-dashboard
sudo systemctl start openclaw-dashboard

# Verify:
curl http://localhost:8090/api/status
```

**systemd unit file:**

```ini
[Unit]
Description=OpenCLAW Mission Control Dashboard
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/openclaw-dashboard
ExecStart=/usr/bin/node server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Edge Cases and Error Handling

| Scenario                                    | Correct Behavior                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| SQLite database is locked (scraper writing) | Retry read after 100ms, up to 3 times. Show "reading..." in UI         |
| No cron jobs scheduled                      | Show "No scheduled jobs" in cron section, not empty                    |
| Pi rebooted, no scrape history              | Show "No data yet" in each section with guidance to run first scrape   |
| Browser tab left open for days              | Auto-refresh keeps working. No memory leak (replace DOM, don't append) |
| Process name doesn't match known scrapers   | Show as "unknown-process" in active jobs, don't hide it                |

---

## Verification Steps

- Start the dashboard server on Pi. Open `http://10.0.0.177:8090` in browser
- Verify all 7 sections render with real data (not placeholders)
- Start a scraper manually. Verify it appears in "Active Jobs" within 10 seconds
- Wait for scraper to finish. Verify it moves to "Job History" with correct stats
- Check system resources. Verify CPU/RAM/disk match `htop` output
- Kill the dashboard process. Verify systemd restarts it within 5 seconds
- Leave the tab open for 1 hour. Verify no memory growth, no stale data

---

## Out of Scope

- ChefFlow integration (this is Pi-only, no ChefFlow pages or server actions)
- Job control (starting/stopping scrapers from the dashboard; that's a future spec)
- Historical dashboards (week-over-week trends; this is live-only)
- Authentication (Pi is on local network only; no external access)
- Mobile optimization (designed for desktop browser tab)

---

## Notes for Builder Agent

1. This is a Pi-side build. All files live on the Pi, not in the ChefFlow repo. The spec file stays in ChefFlow for reference, but the code ships to `~/openclaw-dashboard/` on the Pi via SCP.

2. Use `better-sqlite3` for reads (same driver the scrapers use). Open in read-only mode to avoid locking conflicts.

3. The HTML must be self-contained. No external CDN links, no npm build step for frontend. Inline everything. The Pi should serve this with zero internet dependency.

4. Keep the server under 300 lines. This is a monitoring tool, not an application. If it's getting complex, you're over-engineering it.

5. `ps aux` parsing is platform-specific. The Pi runs Linux. Use `ps -eo pid,pcpu,pmem,etime,args --sort=-pcpu` for cleaner output.

6. Temperature reading: `cat /sys/class/thermal/thermal_zone0/temp` returns millidegrees. Divide by 1000 for Celsius.
