# Research: OpenClaw Completion Countdown and Pixel Schedule

## Origin Context

The developer wants two linked operator surfaces for OpenClaw.

Cleaned signal from the conversation:

- They want a real countdown now that the capture method is stable and the system is finally on track toward a full catalog and database.
- The countdown should feel like a practical event tracker, similar to a vacation timer or a major release countdown, with a real remaining number and a loading bar.
- The countdown must not feel trippy, fake, or over-animated. It should be practical and readable.
- The countdown needs to appear on the pricing catalog page, the food catalog page, the store prices page, and inside the pixel-art command center.
- The pixel-art command center also needs a much clearer visual representation of every scheduled job so the developer can see what is about to run, when it runs, and what is idle without waiting for a whole batch to finish.

Developer intent translated from that signal:

- The web app needs a shared, visible "mission progress" surface that makes the total-capture push feel real and legible.
- The pixel-art board needs to become an operator console for the queue and schedule, not just a decorative live feed.
- The implementation must stay honest. A projected mission countdown is acceptable, but a fake exact refresh ETA is not supported by the repo as it exists today.

## Summary

The three requested website surfaces already exist, but none of them currently model a total-capture milestone countdown. `/prices` and `/culinary/price-catalog` render local PostgreSQL-derived stats, while `/admin/price-catalog` shows Raspberry Pi status and scrape timing. None of those routes expose a shared milestone target, countdown number, or progress bar today. `app/(chef)/prices/page.tsx:46-135`, `app/(chef)/culinary/price-catalog/page.tsx:18-69`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:19-155`

The repo does contain the right strategic framing for a milestone tracker. The OpenClaw total-capture spec defines a phased 12-week plan and explicitly frames the work as scan, verify, mark complete, and move on. That supports a projected mission countdown, but it does not define a code-level target date or shared config yet. `docs/specs/openclaw-total-capture.md:98-140`, `docs/specs/openclaw-total-capture.md:625-633`

The pixel-art prototype is visually closer to what the developer wants than the currently shipped dashboard, but it lives in `.openclaw-temp`, not in the live service path. The prototype already has an HQ scene, agent roster, live activity feed, and schedule panel, but its schedule rendering truncates to 15 rows. The live dashboard served by `scripts/openclaw-dashboard/server.mjs` still exposes only a simple "next 12h" schedule and does not serve a pixel-art route. `.openclaw-temp/game.html:209-266`, `.openclaw-temp/game.html:556-572`, `scripts/openclaw-dashboard/server.mjs:170-204`, `scripts/openclaw-dashboard/server.mjs:266-324`, `scripts/openclaw-dashboard/index.html:81-84`, `scripts/openclaw-dashboard/index.html:184-193`

The safest conclusion is:

1. Build a shared projected countdown for the website and the pixel-art board from one checked-in config.
2. Keep it explicitly labeled as projected mission timing, not refresh timing.
3. Upgrade the live dashboard codepath to expose every active cron entry as a schedule board for the pixel-art view.

## Detailed Findings

### 1. The requested website surfaces already exist, but none has a countdown model

`/prices` is a chef-gated page that loads `getStoreCatalogStats()` and chain data, then renders stat cards plus the `PricesCatalogClient`. It currently describes OpenClaw as "updated daily" and shows a `Last Sync` card, but there is no projected completion target or progress UI. `app/(chef)/prices/page.tsx:46-135`, `lib/openclaw/store-catalog-actions.ts:79-157`

`/culinary/price-catalog` is also chef-gated. It renders a compact engine pulse row and mounts the `CatalogBrowser`, but it only shows counts and a relative sync crumb. No milestone countdown exists. `app/(chef)/culinary/price-catalog/page.tsx:18-69`

`/admin/price-catalog` is admin-only and already surfaces Pi status plus last scrape information. That makes it a valid third placement for the same mission countdown card, but the page currently has no mission-level progress contract. `app/(admin)/admin/price-catalog/page.tsx:8-10`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:19-155`

The audit document confirms the user-facing intent of these routes: Food Catalog and Store Prices are first-class chef surfaces, and Price Catalog is the admin OpenClaw dashboard. `docs/app-complete-audit.md:757-760`, `docs/app-complete-audit.md:1595-1603`, `docs/app-complete-audit.md:1786-1798`

### 2. The repo supports a projected mission countdown, not a truthful next-refresh countdown

The total-capture spec defines a 12-week plan across five phases, explicitly describing a breadth-first capture strategy and a scan-and-move protocol. That is the strongest evidence in the repo for a mission-style countdown and loading bar. `docs/specs/openclaw-total-capture.md:98-140`

That same spec also fences scope sharply: only Phase 1 should be claimed initially, later phases are roadmap, and the developer does not want to spend money before Phase 1 succeeds. That means any countdown shipped now must be labeled as projected roadmap timing, not as verified completion truth. `docs/specs/openclaw-total-capture.md:308-329`, `docs/specs/openclaw-total-capture.md:625-633`

Existing OpenClaw research already rejected an exact refresh countdown for chef-facing pages because the repo lacks one canonical schedule source of truth for page freshness. `docs/research/openclaw-refresh-cadence-and-status-surface.md:20-27`, `docs/research/openclaw-refresh-cadence-and-status-surface.md:77-97`, `docs/research/openclaw-refresh-status-operator-patterns.md:16-18`, `docs/research/openclaw-refresh-status-operator-patterns.md:68-75`

So the practical countdown the developer wants must be framed as a projected mission milestone, not a fake "next data refresh in X minutes" promise.

### 3. The repo already has reusable countdown and progress patterns

There is already a small event countdown component that computes remaining days, hours, minutes, and seconds on the client. `components/sharing/event-countdown.tsx:10-68`

There are also existing progress-bar implementations that handle bounded percentage displays cleanly, including finance goals and DOP progress. Those patterns are enough to build a shared OpenClaw mission card without inventing new visual mechanics. `app/(chef)/finance/goals/page.tsx:19-38`, `components/scheduling/dop-view.tsx:191-205`, `components/scheduling/dop-view.tsx:245-260`

`tsconfig.json` has `resolveJsonModule` enabled, so a checked-in JSON milestone config can be imported directly in Next code. `tsconfig.json:2-18`

### 4. The pixel-art prototype already matches the desired visual language better than the live dashboard

The `.openclaw-temp/game.html` prototype already has the HQ scene, roster, live feed, schedule section, and bottom system strip that correspond closely to the developer's screenshot and stated direction. `.openclaw-temp/game.html:209-266`

The prototype also computes agent states from active jobs, scraper health, per-scraper stats, and log freshness, which is much closer to a true operator console than the simpler live dashboard. `.openclaw-temp/game.html:379-485`, `.openclaw-temp/dashboard-server.mjs:372-388`

But the prototype schedule panel only shows up to 15 rows, which directly conflicts with the new requirement to make every scheduled job easy to see. `.openclaw-temp/game.html:556-572`

### 5. The shipped dashboard path is still the simple monitor

The actual service definition runs `server.mjs` from `/home/davidferra/openclaw-dashboard`, which corresponds to the live dashboard assets in `scripts/openclaw-dashboard/`, not `.openclaw-temp/`. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`

That live dashboard currently computes cron entries by parsing `crontab -l`, finding the next run within 12 hours, and returning only those entries. `scripts/openclaw-dashboard/server.mjs:170-204`

Its current route surface serves `/` and JSON APIs, but there is no `/game` or other pixel-art route. `scripts/openclaw-dashboard/server.mjs:266-324`

The current HTML labels the schedule card as "Upcoming (next 12h)" and renders only a short list of `minutesUntil` plus name, which is not enough to show every scheduled job's state. `scripts/openclaw-dashboard/index.html:81-84`, `scripts/openclaw-dashboard/index.html:184-193`

### 6. The real schedule source already exists in the repo and is rich enough for a full schedule board

The checked-in crontab enumerates government, Flipp, cross-match rounds, direct API scrapers, four Instacart slots, enrichment, watchdog, receipt processing, ChefFlow sync, and log rotation. `.openclaw-deploy/crontab-v7.txt:5-86`

That means the data required for the developer's "what is about to go off, when it is going to go off, what is idle" view already exists. What is missing is a normalized schedule model and a UI that renders all of it.

## Gaps

1. There is no shared countdown configuration file that defines a label, target date, start date, or presentation rules for a mission tracker.
2. There is no existing shared website component for an OpenClaw mission countdown.
3. The live dashboard does not serve the pixel-art board from the real deployment path.
4. The live schedule API only returns the next 12 hours and does not normalize schedule state per cron line.
5. The repo supports a projected milestone countdown, but it does not verify an actual target date in code today.

## Recommendations

1. Add one checked-in OpenClaw milestone config and treat it as the single source of truth for the projected countdown across web and pixel-art surfaces. `tsconfig.json:14`, `docs/specs/openclaw-total-capture.md:98-140`
2. Ship the countdown as a practical mission tracker with explicit "Projected" copy, remaining time, target date, and a bounded loading bar based on the configured timeline window. Do not present it as scrape freshness or data coverage truth. `docs/research/openclaw-refresh-cadence-and-status-surface.md:22-27`, `docs/research/openclaw-refresh-status-operator-patterns.md:68-75`
3. Implement the pixel-art board in `scripts/openclaw-dashboard/` and treat `.openclaw-temp/` as reference only. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`, `.openclaw-temp/game.html:209-266`
4. Replace the live dashboard's short upcoming list with a full mission schedule model that renders one row per active cron line, including next run, cadence, state, and current-running status. `scripts/openclaw-dashboard/server.mjs:170-204`, `.openclaw-deploy/crontab-v7.txt:5-86`
5. Keep countdown truth and schedule truth separate: the countdown is a projected mission milestone, while the schedule board is a real operational queue view.
