# Research: Raspberry Pi Full Device Audit

> **Date:** 2026-03-29
> **Question:** What is the complete state of everything on the Raspberry Pi - all code, storage, configs, services, data, and traces of past projects?
> **Status:** complete

## Summary

The Pi is a Raspberry Pi 5 (8GB RAM, 117GB SD card, 31% used) running Debian Bookworm. It serves two distinct purposes: (1) the **OpenClaw Price Intelligence** system, a food price scraping and aggregation platform with 14 cron-scheduled scrapers, a SQLite database with 11,084 canonical ingredients and 8,745 current prices across 43 sources, and (2) the **OpenClaw AI agent swarm** ("Claw"), a multi-agent orchestrator with 4 Docker-sandboxed agents connected to Discord and using free Qwen Portal cloud APIs. The system is healthy but has several issues: exposed API keys in `.bashrc`, a phantom root-owned directory with a carriage return in its name, Tailscale logged out, several scrapers reporting "Never scraped" for their Instacart sources, and the nightly ChefFlow price sync is failing because the dev server is not running at sync time.

---

## 1. System State

| Metric       | Value                                      |
| ------------ | ------------------------------------------ |
| OS           | Debian Bookworm, aarch64 (kernel 6.12.62)  |
| Hardware     | Pi 5, 4-core Cortex-A76 @ 2.4GHz, 8GB RAM  |
| Uptime       | 8 days, 23 minutes (booted Mar 21)         |
| Disk         | 117GB total, 34GB used (31%), 78GB free    |
| RAM          | 1.6GB used / 7.9GB total (6.2GB available) |
| Swap         | 690MB used / 3.9GB total                   |
| Node.js      | v22.22.1 (via NVM)                         |
| Load average | 0.00 (essentially idle)                    |

## 2. Running Services (33 total)

### Core Services (purpose-built)

| Service                      | Type                 | Memory | Status  | Purpose                                                  |
| ---------------------------- | -------------------- | ------ | ------- | -------------------------------------------------------- |
| `openclaw-gateway`           | Process (PID 458116) | ~345MB | Running | OpenClaw AI agent gateway on port 18789                  |
| `openclaw-sync-api`          | systemd              | ~99MB  | Running | HTTP API for PC to pull price data (port 8081)           |
| `openclaw-receipt-processor` | systemd              | ~68MB  | Running | OCR receipt processing server                            |
| `ollama`                     | systemd              | ~102MB | Running | Local LLM service on port 11434                          |
| `cloudflared`                | systemd              | ~40MB  | Running | Cloudflare tunnel (beta.cheflowhq.com -> localhost:3100) |
| `pc-tether`                  | systemd              | ~N/A   | Running | Persistent reverse SSH to Windows PC (ports 2222, 5900)  |
| `tailscaled`                 | systemd              | ~75MB  | Running | Tailscale VPN (but logged out - not authenticated)       |
| PM2                          | Process (PID 1904)   | ~26MB  | Running | God Daemon (legacy, no processes managed)                |

### Desktop/Display Services (running but not needed for headless ops)

| Service                     | Notes                                      |
| --------------------------- | ------------------------------------------ |
| `lightdm`                   | Display manager                            |
| `labwc`                     | Wayland compositor                         |
| `wayvnc` + `wayvnc-control` | VNC server for remote desktop              |
| `chromium`                  | Multiple renderer processes (~400MB total) |
| `pcmanfm`                   | File manager desktop mode                  |
| `cups` + `cups-browsed`     | Printer services                           |
| `colord`                    | Color profile management                   |
| `accounts-daemon`           | User account management                    |
| `rtkit-daemon`              | Realtime scheduling                        |
| `udisks2` + `upower`        | Disk/power management                      |
| `polkit`                    | Authorization                              |

**Note:** The memory reference file says lightdm, cups, colord, accounts-daemon, etc. were "disabled" on 2026-03-18, but they are all currently running. Either they were re-enabled or the disabling didn't persist across a reboot.

### Docker

4 containers running (all "sleep infinity"):

- `openclaw-sbx-agent-main-f331f052`
- `openclaw-sbx-agent-exec-f77fca61`
- `openclaw-sbx-agent-rescue-0a50c36f`
- `openclaw-sbx-agent-research-13978b5b`

All use the `openclaw-sandbox:bookworm-slim` image (97.2MB).

---

## 3. Project 1: OpenClaw Price Intelligence (`~/openclaw-prices/`)

### What It Is

A comprehensive food price tracking system that scrapes grocery prices from 15+ sources across New England, normalizes them to canonical ingredients, tracks price changes over time, detects anomalies, and syncs data to ChefFlow.

### Directory Structure

```
~/openclaw-prices/
  config/.env              # API keys (BLS, FRED, USDA, ChefFlow sync)
  data/
    prices.db              # Main SQLite database (24MB, WAL mode)
    prices.db-shm          # Shared memory (32KB)
    prices.db-wal          # WAL file (4.9MB)
    instacart-session.json # Captured Instacart session cookies
    receipts/              # Empty - pending receipt uploads
    receipts-processed/    # Empty - processed receipts
    receipts-failed/       # Empty - failed receipts
    usda-cache/            # USDA data cache
  lib/
    db.mjs                 # Database layer (SQLite via better-sqlite3)
    normalize-rules.mjs    # 35KB rule engine for food name normalization
    scrape-utils.mjs       # Shared scraper utilities
    smart-lookup.mjs       # Fuzzy ingredient matching
  services/
    aggregator.mjs         # Trend computation, anomaly detection
    cross-match.mjs        # Cross-source price matching (40KB, largest service)
    receipt-processor.mjs  # OCR receipt scanning (HTTP server + batch mode)
    scraper-flipp.mjs      # Flipp circular/flyer API scraper
    scraper-flyers.mjs     # Weekly flyer scraper
    scraper-government.mjs # BLS, FRED, USDA API scraper
    scraper-hannaford.mjs  # Hannaford direct website scraper
    scraper-instacart.mjs  # Instacart single-store scraper
    scraper-instacart-bulk.mjs # Instacart multi-store bulk scraper
    scraper-stopsandshop.mjs   # Stop & Shop direct scraper
    scraper-target.mjs     # Target Redsky API scraper (NEW)
    scraper-usda.mjs       # USDA individual item scraper
    scraper-usda-bulk.mjs  # USDA bulk data import (56KB)
    scraper-walmart.mjs    # Walmart scraper (NEW)
    scraper-wholefoodsapfresh.mjs # Whole Foods Amazon ALM scraper
    scraper-wholesale.mjs  # Wholesale catalog + BLS PPI scraper
    sync-api.mjs           # HTTP API server (port 8081)
    sync-to-chefflow.mjs   # Nightly push to ChefFlow app
    watchdog.mjs           # Health monitor (every 15 min)
    clean-nonfood.mjs      # Non-food item cleanup
    clean-nonfood-v2.mjs   # v2 cleanup
    import-usda-csv.mjs    # USDA CSV importer
  scripts/
    check-stats.mjs        # Stats checker
    clear-source.mjs       # Source data clearer
    diagnose-gaps.mjs      # Gap diagnostics
    test-bls.mjs           # BLS API tester
    test-smart-lookup.mjs  # Lookup tester
  logs/                    # Scraper logs (484KB total)
  systemd/                 # Service files + setup script
  node_modules/            # 75MB (better-sqlite3, dotenv, node-fetch, puppeteer-core)
  [13 debug/fix scripts]   # Root-level one-off scripts (fix-aliases, fix-categories, etc.)
  openclaw.db              # Empty file (0 bytes) - orphan
  dashboard/               # Empty directory - planned but not built
```

### Database State (prices.db - 24MB)

| Table                   | Row Count | Purpose                                    |
| ----------------------- | --------- | ------------------------------------------ |
| `source_registry`       | 43        | Store/source definitions                   |
| `canonical_ingredients` | 11,084    | Master ingredient list                     |
| `ingredient_variants`   | 0         | Unused variant system                      |
| `current_prices`        | 8,745     | Latest prices per product/source           |
| `price_changes`         | 25,339    | Historical price change log                |
| `normalization_map`     | 10,891    | Raw name -> canonical ingredient mappings  |
| `price_trends`          | 2,338     | 7/30/90-day trend calculations             |
| `price_anomalies`       | 23,118    | Detected spikes/drops (ALL unacknowledged) |
| `price_monthly_summary` | 0         | Not yet populated                          |

### Sources (43 registered, 15+ active)

**Active scrapers producing data:**

- Whole Foods (Haverhill MA, Portland ME) via Amazon ALM
- Flipp API (Market Basket, Hannaford, Stop & Shop, Shaw's, ALDI, Big Y, Wegman's, Walmart, Target, Costco, Sam's Club, Restaurant Depot, CVS, Walgreens, Family Dollar, Dollar General, Ocean State Job Lot)
- Target Redsky API (Methuen, MA)
- Government APIs (BLS, FRED, USDA)

**Registered but "Never scraped":**

- Hannaford (direct website)
- All Instacart sources (Market Basket, Aldi, Stop & Shop, Shaw's, Costco, BJ's, Whole Foods)
- Target (Methuen, MA) and Walmart (Methuen, MA) in source registry
- McKinnon's Supermarkets (via Flipp)

### Category Distribution (11,084 ingredients)

| Category      | Count | %   |
| ------------- | ----- | --- |
| uncategorized | 2,517 | 23% |
| pantry        | 2,145 | 19% |
| produce       | 1,765 | 16% |
| grains        | 1,015 | 9%  |
| beef          | 787   | 7%  |
| pork          | 538   | 5%  |
| poultry       | 420   | 4%  |
| lamb          | 420   | 4%  |
| beverages     | 384   | 3%  |
| dairy         | 373   | 3%  |
| seafood       | 333   | 3%  |
| oils          | 241   | 2%  |
| spices        | 115   | 1%  |
| herbs         | 20    | <1% |
| eggs          | 6     | <1% |
| alcohol       | 2     | <1% |

### Cross-Match Coverage (prices linked to canonical ingredients)

Most categories have very low price coverage:

- `uncategorized`: 84% (inflated because uncategorized items are easier to match)
- `herbs`: 50%
- `spices`: 11%
- `dairy`: 8%
- `seafood`, `pork`, `produce`: 4-5%
- `beef`, `grains`, `oils`, `lamb`: 1-2%

### Cron Schedule (Active)

| Time            | Job                                                     | Frequency        |
| --------------- | ------------------------------------------------------- | ---------------- |
| 2:00 AM         | Government data (BLS, FRED, USDA)                       | Weekly Monday    |
| 3:00 AM         | Flipp API (all stores)                                  | Daily            |
| 4:00 AM         | Cross-match round 1                                     | Daily            |
| 5:00 AM         | Whole Foods (Amazon ALM)                                | Daily            |
| 6:00 AM         | Target Redsky API                                       | Daily            |
| 7:30 AM         | Instacart Bulk (odd days: MB + Aldi + S&S)              | Alternating      |
| 7:30 AM         | Instacart Bulk (even days: Shaw's + Costco + BJ's + WF) | Alternating      |
| 9:00 AM         | Cross-match round 2                                     | Daily            |
| 9:30 AM         | Wholesale catalog + BLS PPI                             | Weekly Wednesday |
| 10:00 AM        | Aggregator (trends, aging, anomaly)                     | Daily            |
| \*/15 min       | Watchdog                                                | Continuous       |
| \*/30 min       | Receipt batch processing                                | Continuous       |
| 11:00 PM        | ChefFlow price sync                                     | Daily            |
| Sunday midnight | Log rotation (truncate >10MB)                           | Weekly           |

### Issues Found

1. **ChefFlow sync failing:** `FATAL: fetch failed` when trying to push to `http://10.0.0.100:3100`. The dev server on the Windows PC is not running at 11 PM sync time.
2. **Instacart scraper crashing:** `FATAL: Runtime.callFunctionOn timed out` - Puppeteer timeout on Instacart pages.
3. **23,118 unacknowledged anomalies** - The anomaly detection is running but nobody is reviewing the results.
4. **0 rows in `ingredient_variants` and `price_monthly_summary`** - These features are defined in schema but never populated.
5. **Empty `openclaw.db` file** in project root (0 bytes) - orphan, should be deleted.
6. **Empty `dashboard/` directory** - planned feature that was never built.
7. **13 debug/fix scripts** cluttering the root directory (debug-wf.mjs, fix-aliases.mjs, etc.).

### API Keys (config/.env)

- `BLS_API_KEY` - Bureau of Labor Statistics (free, 500 queries/day)
- `FRED_API_KEY` - Federal Reserve (free, unlimited)
- `USDA_API_KEY` - USDA (free, via data.gov)
- `CRON_SECRET` - ChefFlow sync auth token
- `CHEFFLOW_URL` - Points to `http://10.0.0.100:3100`

---

## 4. Project 2: OpenClaw AI Agent Swarm (`~/.openclaw/`)

### What It Is

"Claw" is a 4-agent AI swarm platform installed globally at `/usr/lib/node_modules/openclaw/` (613MB). It runs a gateway process, manages Docker sandbox containers, and connects to Discord. The agents use free Qwen Portal cloud APIs for intelligence.

### Configuration (`.openclaw/openclaw.json`)

- **Version:** 2026.3.23-2
- **Primary model:** `qwen-portal/coder-model` (cloud, free)
- **Fallback models:** Ollama local (qwen2.5:1.5b, llama3.2:latest, qwen3:4b, qwen3:30b, qwen3-coder:30b, glm-4.7-flash, qwen2.5vl:latest, nomic-embed-text)
- **Gateway:** Port 18789, loopback only, token auth
- **Discord:** Enabled (token present), streaming off, allowlist group policy
- **Plugins:** ollama, open-prose, qwen-portal-auth, discord

### Agent Roster

| Agent ID   | Name      | Workspace                         | Role                         |
| ---------- | --------- | --------------------------------- | ---------------------------- |
| `main`     | (default) | `~/.openclaw/workspace/`          | Primary conversational agent |
| `research` | architect | `~/.openclaw/workspace-research/` | Designs app specs            |
| `exec`     | coder     | `~/.openclaw/workspace-exec/`     | Builds apps                  |
| `rescue`   | reviewer  | `~/.openclaw/workspace-rescue/`   | QA and bug catching          |

### Identity & Soul

The swarm identifies as "Claw" - a lobster-emoji'd AI that runs an "App Factory" pipeline: David drops ideas, architect designs, coder builds, reviewer catches bugs, ship it. Revenue focus (ads, subscriptions, marketplace, freemium). Tech stack defaults: HTML/CSS/JS, React, Node.js, Cloudflare Pages.

### Workspace Files

- `SOUL.md` - Personality and mission definition
- `IDENTITY.md` - Self-description ("sharp-minded AI swarm, four agents in a trenchcoat")
- `HEARTBEAT.md` - Periodic health check instructions
- `AGENTS.md` - Operational manual (memory, tools, session protocol)
- `USER.md` - Profile of David (builder, wants speed, practical results)
- `TOOLS.md` - Pi hardware notes, model speed benchmarks
- `PROJECTS.md` - Empty project tracker (no apps shipped yet)

### Docker Sandbox Containers (4 running)

All containers use `openclaw-sandbox:bookworm-slim` and run `sleep infinity`:

- `openclaw-sbx-agent-main-f331f052`
- `openclaw-sbx-agent-exec-f77fca61`
- `openclaw-sbx-agent-rescue-0a50c36f`
- `openclaw-sbx-agent-research-13978b5b`

Created 4 days ago (Mar 25), all still running.

### Current State

The App Factory has **zero shipped projects**. The projects table is empty. The swarm is set up and running but idle, waiting for its first build assignment.

---

## 5. Ollama (Local LLM)

### Installed Models (3.4GB in `/usr/local/lib/ollama/`)

| Model          | Size  | Notes                                                  |
| -------------- | ----- | ------------------------------------------------------ |
| `qwen2.5:1.5b` | 986MB | Fast (~4 sec), small/weak                              |
| `llama3.2:1b`  | 1.3GB | Fast, small                                            |
| `qwen3:8b`     | 5.2GB | Slow (~4 min), smart - "unusable for interactive work" |

Ollama runs as root, listens on `0.0.0.0:11434`. Used by ChefFlow for private data processing (Remy, recipe parsing, etc.) via the network.

---

## 6. Cloudflare Tunnel

Tunnel ID: `f48ab139-b448-4fd9-a431-bcf6b09902f0`

| Hostname             | Service                 |
| -------------------- | ----------------------- |
| `beta.cheflowhq.com` | `http://localhost:3100` |

This is configured to route to localhost:3100, but there is no web server running on port 3100 on the Pi. This tunnel was likely set up when a ChefFlow dev server was running on the Pi, but that is no longer the case. The tunnel is active but routing to nothing.

---

## 7. Network Connectivity

### PC Tether (Reverse SSH)

`autossh` maintains a persistent SSH connection to `david@10.0.0.198` (Windows PC) with:

- Port 2222 (reverse SSH into Pi from PC)
- Port 5901 -> 5900 (VNC forwarding)

### Tailscale

Installed and running but **logged out**. Not currently functional. Login URL available but not authenticated.

---

## 8. Traces of Old/Wiped Projects

### Old OpenClaw Lead Crawler (`~/openclaw/`)

**Does not exist.** The original OpenClaw directory (`~/openclaw/`) referenced in the memory file has been completely removed. It was the business lead crawler (finding food businesses via OSM). That project has been fully replaced by OpenClaw Price Intelligence.

The memory file's "Key Paths" section references `~/openclaw/` paths that no longer exist:

- `~/openclaw/crawler_findings/` - gone
- `~/openclaw/enriched_findings/` - gone
- `~/openclaw/market_stats/` - gone
- `~/openclaw/data/progress.json` - gone
- `~/openclaw/config.json` - gone

### Phantom Root-Owned Directory

There is a root-owned directory at `~/openclaw-prices\r/` (with a literal carriage return character in the name). This was likely created by a script that had Windows-style line endings. It should be removed:

```bash
sudo rm -rf "/home/davidferra/openclaw-prices$(printf '\r')"
```

### PM2 (Orphaned)

PM2 God Daemon is running (PID 1904) but manages zero processes. It has an empty logs directory. This is leftover from before the migration to systemd services.

### `~/apps/` (Empty)

Empty directory, likely created for the OpenClaw App Factory but never used.

### Claude Code on Pi

Claude Code is installed (`.claude/` and `.claude.json` present) with user ID `ecc12e04...`. Has project data in `~/.claude/projects/`. Separate from the OpenClaw swarm.

---

## 9. Security Issues

### CRITICAL: API Keys Exposed in `.bashrc`

The file `~/.bashrc` contains:

```
export OPENAI_API_KEY=sk-proj-iLBZOOO...T3BlbkFJ...
```

This OpenAI API key is hardcoded in the shell profile. Anyone with SSH access to the Pi has access to this key. It should be moved to a secure `.env` file with restricted permissions, or removed if not actively used (the OpenClaw swarm uses Qwen Portal, not OpenAI).

### Private Keys in `.openclaw/identity/`

The device identity private key (`device.json`) is readable only by the owner (chmod 600), which is correct. The Discord token in `openclaw.json` and the gateway auth token are also owner-only readable.

### API Keys in `config/.env`

Properly stored in a separate `.env` file with 600 permissions. Contains BLS, FRED, USDA keys (all free tier) and the ChefFlow sync secret.

### Instacart Session Cookies

`data/instacart-session.json` contains captured Instacart browser cookies. These are functional session credentials that could be used to impersonate the scraper's browser session.

---

## 10. Disk Usage Breakdown

| Path                              | Size  | Purpose                                          |
| --------------------------------- | ----- | ------------------------------------------------ |
| `/usr/lib/node_modules/openclaw/` | 613MB | OpenClaw AI agent platform                       |
| `~/.npm/`                         | 379MB | npm cache                                        |
| `~/openclaw-prices/`              | 104MB | Price intelligence (75MB node_modules + 24MB DB) |
| `~/.config/`                      | 80MB  | Desktop configs                                  |
| `/usr/local/lib/ollama/`          | 3.4GB | Ollama model weights                             |
| `~/.openclaw/`                    | 7.4MB | Agent state and workspace                        |
| Docker images                     | ~97MB | Sandbox image                                    |

Total identifiable project usage: ~4.7GB out of 34GB used.

---

## 11. Recommendations

### Cleanup (Quick Wins)

1. **Remove phantom directory:** `sudo rm -rf "/home/davidferra/openclaw-prices$(printf '\r')"`
2. **Remove orphan file:** `rm ~/openclaw-prices/openclaw.db` (0 bytes, unused)
3. **Remove empty dirs:** `rmdir ~/apps ~/openclaw-prices/dashboard`
4. **Kill PM2:** `pm2 kill` or `kill 1904` and remove `~/.pm2/`
5. **Clean debug scripts:** Move `~/openclaw-prices/debug-*.mjs`, `fix-*.mjs`, `check-*.mjs` etc. into a `~/openclaw-prices/scripts/` or `~/openclaw-prices/archive/` directory
6. **Clear npm cache:** `npm cache clean --force` would free ~379MB

### Security (Important)

7. **Remove OpenAI key from `.bashrc`** - move to a dotenv file or delete if unused
8. **Rotate the OpenAI key** if it was ever committed or shared (it's been in plaintext in the shell profile)
9. **Authenticate Tailscale** or disable the service if not needed

### Service Cleanup

10. **Disable unused desktop services** if the Pi is primarily headless: lightdm, cups, cups-browsed, colord, pcmanfm, chromium. This would free ~400-500MB of RAM.
11. **Fix ChefFlow sync:** Either change `CHEFFLOW_URL` to point to the production server, or accept that it only works when the dev server is running.
12. **Fix Instacart scraper:** The Puppeteer timeout suggests the Instacart scraping approach needs work. The bulk scraper via API may be more reliable.
13. **Fix Cloudflare tunnel:** Either point it to a real service or disable it to save resources.

### Data Quality

14. **Acknowledge or auto-clear anomalies:** 23,118 unacknowledged anomalies makes the detection system useless.
15. **Improve category coverage:** 23% of ingredients are "uncategorized" and most categories have <5% price coverage from cross-matching.
16. **Populate monthly summaries:** The `price_monthly_summary` table is empty despite having months of data.

### Update Memory File

17. **Update `reference_raspberry_pi.md`** to reflect:
    - The old `~/openclaw/` lead crawler no longer exists
    - The new project is `~/openclaw-prices/` (price intelligence)
    - Services list has changed (no more openclaw-enrichment, openclaw-classifier, openclaw-sync, openclaw-monitor)
    - Current services are: openclaw-sync-api (port 8081), openclaw-receipt-processor, openclaw-gateway (port 18789)
    - Monitor API is no longer on port 18800
    - Add the cron schedule and database stats
