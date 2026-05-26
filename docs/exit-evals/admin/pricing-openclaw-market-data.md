# Exit Eval: Admin / PRICING, OPENCLAW & MARKET DATA

> **Wave 3 | 8 scenarios | Role: Admin**
> **Evaluator:** Claude (solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #49: Verify a quarantined price

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** A price observation was flagged by the anomaly detector (spike, crash, placeholder, over-cap). The admin needs to confirm whether the new price is real by checking the actual store website, a physical receipt, or a vendor catalog. The decision is: "Is this the real shelf price, or did the scraper malfunction?" The external source is the ground truth the admin compares against.

**Context ChefFlow has:**

- The quarantined price itself (cents, old price, delta)
- Rejection reason (spike, crash, placeholder, null, cap breach)
- Source name (openclaw_scrape, openclaw_instacart, openclaw_flyer, etc.)
- Ingredient name and ID
- Historical price trend for that ingredient at that store
- The raw_data blob from the sync (may contain source URL)
- Quarantine timestamp
- Review workflow (approve/reject/correct with writeback)

**Data source?** Yes, partially. The external "source" is the store's actual website, receipt image, or vendor catalog page. Some of these are scrapable (store websites), some are physical (receipts). ChefFlow already has the `raw_data` field which may contain the source URL from the original scrape.

**Client-collaborative angle:** None. This is purely an admin/operator data quality task.

**Physical reality:** Screen-based. Admin is at a desk comparing numbers. No kitchen, no messy hands.

**Compounding:** Medium. Each verified price trains the anomaly detector's thresholds. Patterns of false positives from specific sources can be used to tune spike/crash thresholds per source. The `compound-learning.ts` and `ground-truth-validation.ts` already track accuracy feedback.

**Solution design:**

- Surface the source URL from `raw_data` as a clickable link directly in the quarantine review row, so the admin can one-click verify instead of searching
- Show the 30-day price history sparkline for that ingredient+store inline in the quarantine table
- Add a "Similar prices from other stores" comparison panel showing the same ingredient's price at 3-5 nearby stores (data already exists in `cross-store-average.ts`)
- Record verification evidence: "verified against [source]" with timestamp in the review action, feeding `pie_ground_truth`
- Auto-approve quarantined prices that match cross-store consensus within 15% (reducing the queue)

**Where it appears:**

- `/admin/openclaw/health` quarantine tab (primary surface, already built)
- `/admin/pricing-health` (could surface quarantine count as a stat card, already has related stats)

**What remains as permanent exit:**
Admin still leaves to check the actual store website or physical receipt when the source URL is missing or the cross-store comparison is inconclusive. Novel products with no comparison data require manual verification.

**Priority:** High frequency (quarantine queue is active whenever sync runs) x Low effort (mostly UI enhancement to existing surfaces) = **P1**
**Spec needed?** No. Incremental enhancement to existing quarantine UI.

---

## Scenario #50: Investigate OpenClaw sync failure

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** A sync run failed or produced unexpected results (zero records accepted, high quarantine rate, error message). The admin goes to worker logs, DB console, or external source websites to understand why. The operational question is: "Is the data source down, did our parser break, or did the schema change?"

**Context ChefFlow has:**

- `openclaw.sync_audit_log` with sync_type, started_at, completed_at, records_processed/accepted/quarantined/skipped, error_message (already surfaced in `/admin/openclaw/health` sync tab)
- `source_health_worker.ts` checks freshness and volume per source, writes to `source_health_log`
- `hermes_heartbeats` table tracks Hermes alive/dead status, queue depth, current skill, error count
- `hermes_actions` table logs every skill invocation with result/duration
- Source definitions with expected freshness thresholds (staleDays, degradedDays per source type)
- Coverage gap detector runs every 6 hours and writes to `coverage_gaps` and `expansion_targets`

**Data source?** Yes. The external sources are worker logs (terminal/Docker), external retailer APIs, and the Pi's sync infrastructure. Most diagnostic information can be pulled into ChefFlow's DB during the sync process itself.

**Client-collaborative angle:** None. Infrastructure diagnosis.

**Physical reality:** Screen-based, desk work.

**Compounding:** High. Every sync failure pattern that gets diagnosed and surfaced in-app means the admin never investigates that class of failure externally again. Source health profiles compound: "Instacart scraper fails every Tuesday at 3am" becomes a known pattern.

**Solution design:**

- Enrich `sync_audit_log` entries with structured error categories: `source_down`, `parser_error`, `schema_change`, `auth_expired`, `rate_limited`, `timeout`
- Add a "Source Diagnostics" panel to `/admin/openclaw/health` that shows per-source: last success, last failure, failure streak count, most recent error category, HTTP status from last attempt
- Surface the Hermes heartbeat and action log in the same dashboard (data exists in `hermes-heartbeat.ts` and `hermes-actions.ts`, just not wired to the OpenClaw health UI)
- Add a "Retry Source" button that re-enqueues a single-source sync via `hermes_queue`
- Show source health timeline (sparkline of accepted/quarantined ratio per source over last 30 days)

**Where it appears:**

- `/admin/openclaw/health` (primary, sync tab already exists but needs enrichment)
- `/admin/pricing-health` (source health table already shows status dots, could link to detailed diagnostics)

**What remains as permanent exit:**
Nothing for routine failures. Admin only leaves for novel infrastructure issues (Docker crash, Pi hardware failure, new retailer blocking strategy) that require terminal/SSH access. These are infrastructure exits, not data engine exits.

**Priority:** High frequency (syncs run on cron, failures are regular) x Medium effort (enriching existing tables + wiring Hermes data) = **P1**
**Spec needed?** No. Extension of existing `/admin/openclaw/health` with data that already exists in the DB.

---

## Scenario #51: Import vendor pricing from external file

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why admin leaves:** A vendor sends a price list (PDF, CSV, Excel) via email or their portal. The admin downloads it, possibly reformats it, then needs to get those prices into ChefFlow. The operational question is: "What does this vendor actually charge for these items, and how do those prices map to my ingredient catalog?"

**Context ChefFlow has:**

- `catalog-import-actions.ts` already supports CSV/XLSX/PDF/manual import with validation, queuing, auto-apply for high-confidence matches, and review workflow for uncertain matches
- `vendor-import-actions.ts` (OpenClaw layer) supports PDF parsing via the Pi with `parseVendorPriceList()` and `confirmVendorPriceListImport()`
- Vendor catalog schema with `vendor_sku`, `vendor_item_name`, `unit_price_cents`, `unit_size`, `unit_measure`
- Ingredient matching via fuzzy match engine (`fuzzy-match-engine.ts`, `ingredient-matching-actions.ts`)
- Vendor trust ledger for tracking vendor reliability
- Price history per vendor item (via `recordVendorPricePoint`)

**Data source?** Yes. The vendor's portal, email attachment, or physical price sheet. The file itself is the data source. ChefFlow already has import infrastructure; the gap is in the admin-level import path (current import actions are chef-scoped via `requireChef()`).

**Client-collaborative angle:** None directly. However, chefs may receive vendor price lists and could upload them through their own portal, feeding the system.

**Physical reality:** Screen-based. Admin is at a desk processing vendor documents.

**Compounding:** High. Vendor price lists are periodic (weekly/monthly). Once the vendor's item naming is mapped to ChefFlow's ingredient catalog, future imports auto-match. The `catalog-import-actions.ts` already supports auto-apply for high-confidence matches, so the second import from the same vendor is nearly frictionless.

**Solution design:**

- Add an admin-scoped vendor price import action (currently chef-only via `requireChef()`) that accepts CSV/PDF and routes through the existing `QueueVendorCatalog` pipeline
- Surface vendor catalog import in `/admin/pricing-health` or a dedicated `/admin/vendor-imports` page with drag-and-drop upload
- Show import history: which vendor, when, how many items matched/unmatched/applied
- Add email-to-import bridge: if vendor price list arrives via email (Gmail sync already exists), surface it as an importable attachment
- Persist vendor-to-ingredient mapping table so repeat imports auto-resolve

**Where it appears:**

- `/admin/openclaw/health` or new `/admin/vendor-imports` (admin import surface)
- `/chef/vendors/[id]` (chef-side vendor detail, import already partially wired)

**What remains as permanent exit:**
Admin still leaves to download the file from the vendor's email or portal. The file acquisition is external; the processing is internal. If the vendor sends PDFs with non-standard layouts, the parser may fail and the admin falls back to manual entry.

**Priority:** Medium frequency (vendor price lists arrive weekly/monthly) x Medium effort (admin auth wrapper + UI for existing pipeline) = **P2**
**Spec needed?** No. The import infrastructure exists. Needs admin auth wiring and a dedicated admin surface.

---

## Scenario #52: Resolve price coverage gaps

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why admin leaves:** PIE reports that certain regions or ingredients lack real price data. The admin goes to store websites, retail APIs, or scraper config to find new data sources or add stores. The operational question is: "How do I fill this gap: find a new store, add a new scraper target, or accept synthetic pricing for this region?"

**Context ChefFlow has:**

- `coverage-gap-detector.ts` runs every 6 hours, scores regions by coverage/freshness/diversity/population, writes to `coverage_gaps` and `expansion_targets`
- `auto-expansion-engine.ts` autonomously processes expansion targets: finds stores in target regions, dispatches scrape jobs, tracks progress
- `/admin/pricing-coverage` dashboard shows region coverage, confidence bars, method breakdown, and has a manual "Refresh" trigger
- `region-coverage-actions.ts` provides `getPricingEngineCoverage()` with per-region coverage scores, source health, and feedback summary
- Census of canonical ingredients (`pie-categories.ts`, `census.ts`)
- Store database with lat/lng, chain affiliation, and scrape history
- Source health per source type with degraded/stale/down status

**Data source?** Yes. External store websites, retail APIs (Instacart proxy), government feeds (USDA), and OpenStreetMap for store discovery. Most of these are already integrated as PIE tier resolvers.

**Client-collaborative angle:** None directly. Chefs indirectly help by scanning receipts in their region (receipt-price-bridge feeds regional data).

**Physical reality:** Screen-based admin work.

**Compounding:** Very high. Every new store added to a region permanently improves coverage for all chefs in that area. The auto-expansion engine makes this self-healing over time.

**Solution design:**

- Enhance `/admin/pricing-coverage` with actionable gap cards: for each critical region, show "Add Store" button that lets admin input a store URL/name/chain for the auto-expansion engine to target
- Surface expansion target queue status: how many targets pending, in-progress, completed, skipped
- Add "Manually trigger expansion" for a specific region (enqueue via `hermes_queue` with `pie-acquire` skill)
- Show gap trend over time: is coverage improving or degrading? (data exists in `coverage_gaps` history)
- Add ingredient-level gap view: "These 20 ingredients have no real price anywhere" with suggested sources

**Where it appears:**

- `/admin/pricing-coverage` (primary, already exists with basic coverage stats)
- `/admin/pricing-health` (link to coverage gaps from the health overview)

**What remains as permanent exit:**
Admin still leaves to research new data sources for categories ChefFlow has never scraped (specialty items, ethnic groceries, farm-direct). Also leaves when auto-expansion fails because no known store in a region carries the target ingredients.

**Priority:** Medium frequency (coverage gaps are structural, not daily) x Medium effort (UI for existing gap detector + expansion engine wiring) = **P2**
**Spec needed?** No. The backend is built. Needs admin UI to expose expansion targets and manual triggers.

---

## Scenario #53: Export catalog for offline review

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin wants to review pricing data in a spreadsheet for analysis: filtering, sorting, pivot tables, sharing with stakeholders, or archival. The operational question is: "Let me see all the data in a format I can manipulate freely."

**Context ChefFlow has:**

- `csv-export.ts` utility with `downloadCsv()`, `tableToCsv()`, `statsToCsv()` helpers
- Various export actions across the codebase (`commerce/export-actions.ts`, `exports/actions.ts`, `finance/export-actions.ts`, etc.)
- `/admin/pricing-health` shows coverage stats, source health, feedback, reliability
- `/admin/pricing-coverage` shows per-region coverage with confidence bars
- The data is all queryable from `resolved_prices`, `pricing_regions`, `source_health_log`, etc.

**Data source?** No. ChefFlow IS the data source here. The admin exports FROM ChefFlow TO an external tool (Excel, Google Sheets).

**Client-collaborative angle:** None.

**Physical reality:** Screen/desk. The export itself is a one-click action; the review happens in the spreadsheet tool.

**Compounding:** Low. Each export is a snapshot. The analysis patterns may compound (admin learns what to look for), but the export itself is disposable.

**Solution design:**

- Add "Export CSV" button to `/admin/pricing-health` that exports the full region coverage table with all metrics
- Add "Export CSV" button to `/admin/pricing-coverage` for per-region breakdown
- Add "Export Quarantine History" to `/admin/openclaw/health` for audit/review
- Support filtered exports: by region, by source, by date range, by coverage status
- Include metadata row in exports: export date, filter criteria, total records

**Where it appears:**

- `/admin/pricing-health` (export button on coverage/source tables)
- `/admin/pricing-coverage` (export button on region table)
- `/admin/openclaw/health` (export button on quarantine/sync tables)

**What remains as permanent exit:**
The admin always leaves to use the spreadsheet tool. This is inherent: ChefFlow is not a spreadsheet. The goal is making the export clean, filtered, and re-importable where useful, not replacing Excel.

**Priority:** Low frequency (periodic audits, not daily) x Low effort (CSV export utility already exists, just wire to admin tables) = **P3**
**Spec needed?** No. Mechanical wiring of existing `csv-export.ts` to admin data surfaces.

---

## Scenario #54: Tune scraper/API credentials

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** A scraper or API integration needs credential updates: API key rotation, expired OAuth token, new vendor API endpoint, rate limit configuration changes. The admin goes to the secret manager, `.env.local`, hosting dashboard, or the external API provider's developer portal. The operational question is: "Why did the data stop flowing, and what credential needs updating?"

**Context ChefFlow has:**

- Source health monitoring (`source-health-worker.ts`) detects when a source goes stale/degraded/down
- Hermes heartbeat tracks whether the agent platform is alive
- Sync audit log records failures with error messages
- ChefFlow can DETECT credential failures but must NOT store or edit secrets in the admin UI (security requirement)

**Data source?** N/A. The external tools (secret managers, API provider dashboards) are the control planes for credentials. ChefFlow should never be one.

**Client-collaborative angle:** None.

**Physical reality:** Screen-based, requires secure access to credential stores.

**Compounding:** Low per incident. However, documenting which credentials map to which sources compounds: the admin builds institutional knowledge of the credential landscape.

**Solution design:**

- Show redacted credential health in `/admin/pricing-health`: for each source, show "API key status: active/expired/unknown" based on last successful auth, without revealing the key itself
- When source health detects an auth-related failure (HTTP 401/403), surface a specific "Credential expired" badge with a link to the provider's developer portal
- Add a credential runbook section: "To update [source] credentials: 1) Go to [provider URL], 2) Generate new key, 3) Update env var [VAR_NAME]"
- Log credential rotation events: admin records "Rotated [source] API key" as an audit action

**Where it appears:**

- `/admin/openclaw/health` source diagnostics panel
- `/admin/pricing-health` source health table (already has status dots)

**What remains as permanent exit:**
Everything. Credential management is permanently external by design. ChefFlow provides diagnosis and documentation, never credential storage or editing. This is a security boundary.

**Priority:** Low frequency (credentials rotate quarterly/annually) x Zero effort for ChefFlow (permanent exit) = **P4**
**Spec needed?** No. Add credential health badges and runbook links to existing admin surfaces.

---

## Scenario #55: Check regional store availability

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The admin needs to verify whether specific stores actually exist and are open in a region, especially when coverage data seems wrong. A store may have closed, relocated, or a new competitor opened. The admin checks Google Maps, retailer websites, or local directories. The operational question is: "Is this store real and active, or is our store database stale?"

**Context ChefFlow has:**

- Store database in `openclaw.stores` with lat/lng, chain, city, state
- Store scrape history (when was this store last successfully scraped)
- Coverage gap detector knows which regions are underserved
- Auto-expansion engine has a list of preferred chains (`walmart`, `kroger`, `safeway`, etc.) and can find stores via existing data/OSM
- `universal-price-lookup.ts` uses Haversine on stores for ZIP-aware pricing
- Regional cost index per pricing region

**Data source?** Yes. Google Maps, retailer store locator APIs, OpenStreetMap. Some of these can be sourced programmatically.

**Client-collaborative angle:** Chefs in the region know which stores exist. Receipt scanning from local chefs passively confirms store existence. A chef scanning a receipt from "Wegmans #47 in Albany" confirms that store is real and active.

**Physical reality:** Screen-based research.

**Compounding:** High. Store database is foundational. Every verified store serves all future pricing lookups in that region. A maintained store database is a permanent asset.

**Solution design:**

- Add "Store Health" panel to `/admin/pricing-coverage`: for each region, show stores with last-scraped date, staleness indicator, and chain affiliation
- Flag stores with no successful scrape in 90+ days as "possibly closed"
- Add "Verify Store" action that checks the store's chain locator API (many chains have public store locator endpoints)
- Surface chef receipt signals: "3 receipts from this store in last 30 days" = confirmed active
- Add "Add Store" manual entry for admin to register a newly discovered store with location and chain

**Where it appears:**

- `/admin/pricing-coverage` (store health per region)
- `/admin/openclaw/health` (store-level scrape diagnostics)

**What remains as permanent exit:**
Admin still leaves for stores not in any chain locator API (independent grocers, ethnic markets, farm stands). Also leaves to physically verify a store exists when all automated checks are inconclusive. Google Maps remains the fallback for non-chain stores.

**Priority:** Low frequency (store churn is slow) x Medium effort (store health UI + chain locator integration) = **P3**
**Spec needed?** No. Incremental enhancement to coverage admin pages.

---

## Scenario #56: Compare ChefFlow price against real receipt

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why admin leaves:** The admin (or a chef reporting an issue) wants to validate PIE's price accuracy against a physical receipt. The admin looks at a receipt image, email confirmation, or store app to get the real price, then compares it to what PIE serves. The operational question is: "Is PIE accurate for this ingredient at this store?"

**Context ChefFlow has:**

- `receipt-price-bridge.ts` already connects receipt scanning to PIE's pricing intelligence, recording ground-truth observations and computing accuracy comparisons
- `ground-truth-validation.ts` measures PIE accuracy against real prices with per-category, per-tier, per-state breakdowns and SLA tracking (15% target)
- Receipt scanning pipeline exists (chef uploads receipt, items are extracted and matched)
- `/admin/pricing-health` already shows receipt accuracy stats: total comparisons, accuracy %, average deviation, breakdown by tier
- `AccuracyReport` type includes `worstOffenders` list and trend vs. prior month
- Chef override system lets chefs correct prices directly

**Data source?** Yes, but ChefFlow already drinks from it. The receipt IS the data source, and the receipt-price-bridge already processes it. The gap is that the admin currently cannot trigger a manual comparison without a chef uploading a receipt.

**Client-collaborative angle:** Chefs ARE the collaborative angle. Every receipt a chef scans is a free accuracy signal. The more chefs scan receipts, the more PIE self-validates. No admin action needed when the chef pipeline works.

**Physical reality:** The receipt is physical. Chef photographs it. ChefFlow processes the image. Admin reviews accuracy reports on screen.

**Compounding:** Very high. Every receipt comparison improves accuracy tracking, tunes anomaly thresholds, and feeds compound learning predictions. The accuracy SLA (15%) is tracked over time. This is the core feedback loop for PIE quality.

**Solution design:**

- Add admin-side "Manual Price Check" form: admin enters ingredient + price + store + date, system compares against PIE's current estimate and records as ground truth
- Surface the "worst offenders" list from `AccuracyReport` in `/admin/pricing-health` so the admin can prioritize which ingredients need receipt verification
- Add "Request Receipt" nudge: when PIE accuracy drops for an ingredient in a region, system flags it for the next chef who shops at that store
- Allow receipt image/proof attachment to price corrections in the quarantine review flow (connects scenario #49)
- Show accuracy trend by region so admin can identify geographic blind spots

**Where it appears:**

- `/admin/pricing-health` (accuracy section, already partially built)
- `/admin/openclaw/health` quarantine review (attach receipt proof)
- Chef receipt scanning flow (passive signal, already wired)

**What remains as permanent exit:**
Nothing, once the manual price check form exists. The admin can verify any price without leaving ChefFlow. The receipt image can be uploaded directly. External receipt viewing is only needed if the chef hasn't scanned it yet AND the admin has the physical receipt.

**Priority:** High frequency (accuracy validation is ongoing) x Low effort (manual check form + wiring existing accuracy reporting) = **P1**
**Spec needed?** No. The `receipt-price-bridge.ts` and `ground-truth-validation.ts` handle the logic. Needs an admin UI form and better surfacing of accuracy reports.

---

## Batch Summary

| #   | Title                                       | Reclassified To                  | Spec Needed? |
| --- | ------------------------------------------- | -------------------------------- | ------------ |
| 49  | Verify a quarantined price                  | Partially Reducible              | No           |
| 50  | Investigate OpenClaw sync failure           | Reducible                        | No           |
| 51  | Import vendor pricing from external file    | Partially Reducible              | No           |
| 52  | Resolve price coverage gaps                 | Partially Reducible              | No           |
| 53  | Export catalog for offline review           | Bridgeable                       | No           |
| 54  | Tune scraper/API credentials                | Permanent                        | No           |
| 55  | Check regional store availability           | Partially Reducible              | No           |
| 56  | Compare ChefFlow price against real receipt | Reducible + Client-Collaborative | No           |

### Classification Distribution

- Reducible: 1 (#50)
- Reducible + Client-Collaborative: 1 (#56)
- Partially Reducible: 4 (#49, #51, #52, #55)
- Bridgeable: 1 (#53)
- Permanent: 1 (#54)

### Key Finding

ChefFlow's pricing infrastructure is remarkably mature. The backend systems (anomaly detection, coverage gap detection, auto-expansion, receipt-price bridge, ground truth validation, source health monitoring, Hermes heartbeat/actions) are all built. The primary gap is **admin UI surfacing**: the data exists in the database but isn't fully exposed in the admin dashboard pages. Most solutions in this batch require wiring existing backend capabilities to admin-facing UI components, not building new engines.

### Priority Summary

- **P1:** #49 (quarantine source links), #50 (sync diagnostics), #56 (manual price check)
- **P2:** #51 (admin vendor import), #52 (gap action cards)
- **P3:** #53 (CSV exports), #55 (store health panel)
- **P4:** #54 (credential runbook, permanent exit)
