# Scraper Control Panel Landscape Research

**Date:** 2026-04-04
**Agent:** Research
**Purpose:** Survey how the industry builds scraper fleet dashboards, cron UIs, monitoring panels, and service control interfaces. Extract patterns applicable to OpenClaw Mission Control (Pi-hosted, 20+ scrapers, SQLite, SSH-managed).

---

## What We Already Have (Baseline)

The existing OpenClaw dashboard (`scripts/openclaw-dashboard/`) is a solid foundation. Single-page, auto-refresh every 10s, 7 data panels:

1. **Active Jobs** (live `ps` scrape)
2. **Database Pulse** (canonical count, prices, coverage, anomalies)
3. **System Resources** (CPU/RAM/disk bars, temperature)
4. **Scraper Health** (per-scraper status: green/yellow/red based on recency + errors)
5. **Upcoming Cron** (next 12h, parsed from `crontab -l`)
6. **Job History** (last 50 runs with PASS/FAIL, counts)
7. **Recent Errors** (last 50 error runs with details)

This is already better than most self-hosted scraper setups. The research below identifies the gaps worth closing.

---

## 1. Scraper Management Dashboards (Crawlab / ScrapydWeb / ScrapeOps)

### Key UI Patterns Worth Stealing

**Per-scraper detail view (Crawlab, ScrapydWeb).** Every scraper gets its own page showing: run history chart, average duration trend, items-per-run trend, error rate trend, last N log tails, and current schedule. The existing dashboard shows a flat table. A drill-down per scraper is the single biggest UX gap.

**Historical moving average comparison (ScrapeOps).** The "aha" feature: every run is automatically compared against a 7-day moving average. If items-found drops 20%+ from the average, it auto-flags as degraded. This catches silent failures (site changed layout, scraper returns 200 but extracts nothing useful). This is the #1 thing daily scraper operators say they need.

**Items-per-run sparkline (ScrapeOps, Crawlab).** A tiny inline chart next to each scraper showing the last 14 runs' item counts. Instantly reveals trends without clicking anything. One glance tells you if a scraper is declining.

**Run-vs-run diff (ScrapeOps).** Compare two runs side by side: what changed in item count, new items, missing items, duration delta. Useful after a scraper code change.

### Features That Would Be Overkill for Single-Pi

- Multi-node cluster management (ScrapydWeb's main selling point)
- In-browser code editor (Crawlab) - you already edit via SSH/Claude Code
- Auto-packaging and deployment (ScrapydWeb) - crontab + scripts is simpler
- Language-agnostic spider framework (Crawlab) - all scrapers are Node.js

### What's Missing From Our Spec

1. **No trend data.** The dashboard shows last-run status but no sparklines or historical trends. A scraper slowly degrading (finding fewer items each week) is invisible.
2. **No moving-average alerting.** A scraper returning 50% fewer items than usual should auto-flag, not wait for a human to notice.
3. **No per-scraper drill-down.** Clicking a scraper name should show its full history, not just the flat table.

---

## 2. Cron Job Web UIs (Cronicle / PiTasker)

### Key UI Patterns Worth Stealing

**Visual timeline of upcoming jobs (Cronicle).** The dashboard shows what's running NOW and what's next in the NEXT 24 hours, displayed as a timeline. Our "Upcoming (next 12h)" list is similar but lacks the temporal visualization. A simple horizontal bar showing the next 12h with job markers is more scannable than a text list.

**Job chain visualization (Cronicle).** Events can trigger other events. Cronicle shows these chains visually. OpenClaw has implicit chains (e.g., scraper runs -> enricher runs -> sync-to-chefflow). Making these visible matters.

**Progress bars with ETA (Cronicle).** Running jobs emit progress (% complete) and Cronicle shows estimated time remaining. This is achievable: scrapers could write a progress file that the dashboard reads.

**Crontab bidirectional sync (PiTasker).** PiTasker reads the system crontab AND lets you edit from the UI, keeping both in sync. Our dashboard reads crontab but is read-only. Adding one-click enable/disable per cron entry would be high value.

**Run-on-demand button (Cronicle, PiTasker).** Every scheduled job has a "Run Now" button. This is the single most requested feature in every cron UI. Operators want to re-run a failed scraper immediately without SSHing in.

**Catch-up mode (Cronicle).** If the server was down during a scheduled time, Cronicle can auto-run missed jobs on recovery. Not critical for us (Pi rarely reboots) but worth noting.

### What Would Be Overkill

- Multi-server targeting and Round Robin scheduling (Cronicle) - single Pi
- Plugin system with custom parameters (Cronicle) - over-engineered for 20 scrapers
- User accounts and permissions (Cronicle) - single operator

### What's Missing From Our Spec

4. **No "Run Now" button.** This is the #1 missing action. Every operator wants it.
5. **No enable/disable toggle per cron job.** Currently requires SSH to comment out crontab lines.
6. **No job duration tracking over time.** Cronicle tracks average CPU/memory per job historically. We track duration but don't trend it.

---

## 3. Monitoring Dashboards (Uptime Kuma / Netdata / Glances)

### Key UI Patterns Worth Stealing

**Heartbeat bar visualization (Uptime Kuma).** The iconic UI: a horizontal bar of green/red dots, one per check interval, scrolling left. At a glance you see 24h of uptime history. This pattern maps perfectly to scraper runs: one dot per run, green=success, red=failure, gray=skipped.

**Status page with grouped monitors (Uptime Kuma).** Monitors grouped into categories with rollup status. Map this to: "Store Scrapers" (all Instacart/Flipp/etc.), "Enrichers," "Sync Jobs," "System Health." Each group shows worst-status-wins.

**Push-based heartbeat (Uptime Kuma).** Instead of polling, the service pushes a heartbeat. If it stops, alert fires. Each scraper could POST a heartbeat on completion. If none arrives within expected_interval \* 1.5, it's flagged. This is more reliable than checking crontab timing.

**Resource correlation (Cockpit/Netdata).** Cockpit correlates CPU, memory, network, and disk with journal entries. When a CPU spike happens, you can see which log entries correspond. For the Pi: correlate high CPU with which scraper was running at that time.

**Notification on status change (Uptime Kuma).** Supports 90+ notification channels, but the key pattern is: notify on DOWN, notify on recovery, configurable retry count before alerting. Our dashboard has zero notifications.

### What Would Be Overkill

- Netdata's per-second metric collection (unnecessary overhead on Pi)
- Grafana integration (beautiful but heavy; the dashboard should be self-contained)
- 90+ notification providers (Telegram or email is enough)

### What's Missing From Our Spec

7. **No heartbeat visualization.** The Uptime Kuma bar pattern is the single best "glance-and-know" visualization for recurring jobs.
8. **No notifications.** When a scraper fails or goes stale, nobody knows until they open the dashboard. Even a simple Telegram message on failure would transform daily operations.
9. **No grouped status rollup.** Scrapers, enrichers, and sync jobs should be grouped with rollup health indicators.

---

## 4. SQLite Web Browsers (Datasette / sqlite-web)

### Key UI Patterns Worth Stealing

**Faceted browsing (Datasette).** The killer feature: click a column value to filter by it. On a prices table, click "Instacart" to see only Instacart prices. Click "2026-04-04" to see today's prices. Zero SQL knowledge needed.

**Every row is a URL (Datasette).** Deep-linkable. Share a specific product's price history by URL. Useful for debugging: "look at this weird price for product X" becomes a link.

**JSON API for everything (Datasette).** Every page has a `.json` equivalent. If the dashboard needs to pull data for a chart, it can hit the Datasette API instead of writing custom SQL endpoints.

**Full-text search (Datasette).** Search across ingredient names, product names. Instant filter. Our dashboard has no search.

**sqlite-web's CRUD capability.** Insert, update, delete rows from the browser. Useful for: acknowledging anomalies, marking false-positive errors, adding manual price overrides.

### What Would Be Overkill

- Datasette's plugin ecosystem (we don't need to publish data publicly)
- sqlite-web's full admin interface (we don't want accidental deletes on the Pi)

### What's Missing From Our Spec

10. **No data browsing.** The dashboard shows aggregates but you can't drill into actual rows. "What did Instacart scrape at 3am?" requires SSH + sqlite3 CLI.
11. **No search.** Can't search for a specific ingredient or product by name.
12. **No anomaly acknowledgment.** Anomalies are counted but can't be dismissed from the UI.

---

## 5. Service Management (Portainer / Cockpit)

### Key UI Patterns Worth Stealing

**Start/Stop/Restart as first-class actions (Cockpit).** Every systemd service has three big buttons. The pattern: action buttons are always visible, not hidden in menus. Confirmation dialog for destructive actions (stop/restart). Live status indicator updates after action.

**Journal log viewer with filtering (Cockpit).** Filter by priority (error/warning/info), by service, by time range, with regex search on message text. The pattern: logs are not just dumped, they're filterable and searchable.

**Service dependency tree (Cockpit).** Shows which services depend on which. For OpenClaw: if the price-scraper depends on the SQLite database not being locked, that dependency should be visible.

**Container resource limits display (Portainer).** Each container shows its CPU/memory limits and current usage. Map to: each scraper shows its CPU/memory ceiling (from OpenClaw operational targets) and actual usage.

### What Would Be Overkill

- Docker/Kubernetes orchestration (Portainer) - scrapers are cron jobs, not containers
- User management and RBAC (Portainer) - single operator
- Network management (Portainer) - irrelevant for cron jobs

### What's Missing From Our Spec

13. **No service control.** Can't start/stop a scraper from the dashboard.
14. **No log viewer.** Can't tail scraper logs from the dashboard. Requires SSH.
15. **No operational target visualization.** The CPU/memory/disk ceilings from the operational targets aren't shown as limit lines on the resource bars.

---

## 6. Silent Failure Detection (Cross-Cutting Concern)

This came up in every tool category. It is the #1 complaint from people who manage scrapers daily.

### The Problem

"Nothing crashes. Requests return 200. Selectors still match. The crawler keeps running. But the dataset slowly becomes inaccurate." A scraper that fails silently poisons data for days or weeks before anyone notices.

### Detection Strategies (from ScrapeOps, Spidermon, and practitioner blogs)

| Check                               | What It Catches                                                    | Implementation                                            |
| ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| **Record count vs. moving average** | Scraper returns 200 but finds 0 items (site changed)               | Compare `products_found` against 7-day avg; flag if < 70% |
| **Null rate per field**             | Scraper extracts rows but key fields are empty                     | Track % of null prices, null names per run                |
| **Duration anomaly**                | Scraper finishes in 2s instead of usual 30s (blocked/rate-limited) | Flag if duration < 50% of average                         |
| **Duplicate rate spike**            | Scraper re-scrapes same data (pagination broken)                   | Track `products_new` vs `products_updated` ratio          |
| **Schema drift**                    | New fields appear, old fields move                                 | Snapshot column presence per table, diff weekly           |
| **Freshness decay**                 | No new prices for an ingredient in 7+ days                         | Track per-ingredient last-updated, flag stale             |
| **Zero-change runs**                | Scraper runs successfully but changes nothing                      | Flag runs where found > 0 but new = 0 and updated = 0     |

### What's Missing From Our Spec

16. **No silent failure detection.** The dashboard shows errors (explicit failures) but not degradation (silent failures). This is the single most valuable gap to close.

---

## 7. Daily User Patterns (What Makes These Tools Indispensable)

From practitioner blogs, GitHub issues, and tool reviews, these are the patterns that transform a dashboard from "nice to have" to "first thing I open every morning":

### The Morning Glance (< 5 seconds)

Every daily user says the same thing: "I need to know in under 5 seconds if everything is OK." The tools that nail this have:

1. **A single overall status indicator** (green/yellow/red) visible without scrolling
2. **Grouped categories** with rollup status (all scrapers OK, all enrichers OK)
3. **Heartbeat bars** showing the last 24h at a glance
4. **"Last successful run" timestamp** for each scraper (not "last run" which could be a failure)

Our dashboard partially does this (scraper health table with colored badges) but lacks the 5-second rollup.

### The Triage Flow (when something is wrong)

When the morning glance shows red:

1. **Which scraper?** (click the red badge)
2. **What failed?** (see error message inline, not in a separate panel)
3. **When did it start failing?** (see heartbeat bar showing when green turned red)
4. **Can I re-run it?** (click "Run Now")
5. **Did the re-run work?** (see result appear in real-time)

Our dashboard supports steps 1-2 but not 3-5.

### The Weekly Review

Once a week, operators check:

1. **Trend lines** (are item counts stable, growing, shrinking?)
2. **Cost analysis** (how long are scrapers running? is duration increasing?)
3. **Coverage gaps** (which ingredients have no prices? which stores are lagging?)

Our dashboard has none of this. It's purely real-time with no historical perspective.

---

## Summary: Ranked Gaps to Close

Ordered by impact on daily operations (highest first):

| #   | Gap                                                                | Inspiration              | Effort |
| --- | ------------------------------------------------------------------ | ------------------------ | ------ |
| 1   | **Run Now button** per scraper                                     | Cronicle, PiTasker       | Low    |
| 2   | **Silent failure detection** (moving average comparison)           | ScrapeOps                | Medium |
| 3   | **Heartbeat bar visualization** (24h run history per scraper)      | Uptime Kuma              | Medium |
| 4   | **Notifications** on failure/recovery (Telegram or email)          | Uptime Kuma              | Low    |
| 5   | **Per-scraper drill-down page** (history, trends, logs)            | Crawlab, ScrapeOps       | Medium |
| 6   | **Items-per-run sparklines** in the health table                   | ScrapeOps                | Low    |
| 7   | **Log tail viewer** (last N lines per scraper)                     | Cockpit, Cronicle        | Low    |
| 8   | **Overall status rollup** (single green/yellow/red at top)         | Uptime Kuma              | Low    |
| 9   | **Enable/disable toggle** per cron job                             | PiTasker                 | Medium |
| 10  | **Data browser** (search products, browse prices, filter by store) | Datasette                | Medium |
| 11  | **Operational target limit lines** on resource bars                | Portainer                | Low    |
| 12  | **Anomaly acknowledgment** button                                  | sqlite-web               | Low    |
| 13  | **Duration trend** per scraper                                     | Cronicle                 | Low    |
| 14  | **Grouped scraper categories** with rollup                         | Uptime Kuma              | Low    |
| 15  | **Freshness decay tracking** per ingredient                        | ScrapeOps (data quality) | Medium |
| 16  | **Job chain visualization**                                        | Cronicle                 | High   |

---

## The "Aha" Feature Per Tool

| Tool            | The feature that makes daily users say "I can't go back"                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Uptime Kuma** | The heartbeat bar. One horizontal strip per service, 90 days of green/red dots. You know everything at a glance.   |
| **Cronicle**    | "Run Now" button. Every job is one click away from manual execution. No SSH, no terminal, no remembering commands. |
| **ScrapeOps**   | Moving average health checks. It auto-detects degradation before you do. You stop being the monitoring system.     |
| **Datasette**   | Faceted browsing. Click any value to filter. Zero SQL, zero learning curve. Data exploration becomes impulse.      |
| **Cockpit**     | Journal correlation. When CPU spikes, you see which service caused it. Cause and effect, not just symptoms.        |
| **PiTasker**    | Crontab bidirectional sync. The web UI and the system crontab are always in agreement. Edit in either place.       |
| **Crawlab**     | Language-agnostic spider management. But for a single-language fleet, the per-spider detail view is what matters.  |

---

## Recommendation for OpenClaw Mission Control v2

The existing dashboard is a strong v1. For v2, the highest-leverage additions are:

1. **Run Now + Kill** buttons (transforms the dashboard from read-only to operational)
2. **Heartbeat bars** per scraper (transforms the dashboard from "current state" to "recent history")
3. **Silent failure detection** with moving-average flags (transforms monitoring from reactive to proactive)
4. **Telegram notifications** on failure/recovery (means you don't have to open the dashboard to know something is wrong)

These four additions would put the dashboard ahead of most commercial scraper management tools for a single-operator, single-server setup. Everything else is incremental improvement.

---

## Sources

- [ScrapeOps: Best Scrapyd Dashboards](https://scrapeops.io/python-scrapy-playbook/best-scrapyd-dashboards-ui/)
- [Crawlab Official](https://www.crawlab.cn/en)
- [Crawlab GitHub](https://github.com/crawlab-team/crawlab)
- [ScrapydWeb GitHub](https://github.com/my8100/scrapydweb)
- [Cronicle Official](https://cronicle.net/)
- [Cronicle WebUI Docs](https://github.com/jhuckaby/Cronicle/blob/master/docs/WebUI.md)
- [Cronicle GitHub](https://github.com/jhuckaby/Cronicle)
- [PiTasker GitHub](https://github.com/hexawulf/PiTasker)
- [Uptime Kuma Official](https://uptimekuma.org/)
- [Uptime Kuma GitHub](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma Notification System](https://deepwiki.com/louislam/uptime-kuma/4-notification-system)
- [Datasette Official](https://datasette.io/)
- [Datasette GitHub](https://github.com/simonw/datasette)
- [Netdata GitHub](https://github.com/netdata/netdata)
- [Cockpit Project](https://cockpit-project.org/)
- [Cockpit Systemd Feature](https://cockpit-project.org/guide/latest/feature-systemd)
- [ScrapeOps Monitoring & Scheduling](https://scrapeops.io/monitoring-scheduling/)
- [Silent Data Crisis (Medium)](https://medium.com/@patryk_b/the-silent-data-crisis-is-your-web-scraping-working-b87f2c7ad1b5)
- [Why Scraping Systems Fail Silently (DEV)](https://dev.to/anna_6c67c00f5c3f53660978/why-most-web-scraping-systems-fail-silently-and-how-to-design-around-it-40o6)
- [Web Scraping Monitoring Challenges (PromptCloud)](https://www.promptcloud.com/blog/web-scraping-monitoring-challenges/)
- [Raspberry Pi Dashboard (zepgram)](https://github.com/zepgram/pi-dashboard)
- [Pi Monitoring Forum Thread](https://forums.raspberrypi.com/viewtopic.php?t=373063)
- [Cockpit vs Portainer (StackShare)](https://stackshare.io/stackups/cockpit-vs-portainer)
- [Btop vs Glances vs Netdata (Medium)](https://medium.com/@PlanB./btop-glances-or-netdata-the-best-ways-to-monitor-your-proxmox-server-e98e1cddc223)
- [sqlite-web GitHub](https://github.com/coleifer/sqlite-web)
