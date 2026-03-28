# OpenClaw Phase 3 Full Integration - Build Follow-Up

**Built:** 2026-03-28
**Spec:** `docs/specs/openclaw-phase-3-full-integration.md`
**Builder:** Claude Code

---

## What Was Built

8 workstreams (A-H) from the Phase 3 spec. Workstreams A and B are Pi SSH operations that require manual execution on the Raspberry Pi. Workstreams C-H are all ChefFlow code changes, built in full.

### Workstream C: Store Preference Plumbing

- **`lib/openclaw/store-preference-actions.ts`** - Server actions connecting chef store preferences to OpenClaw data. `getAvailableOpenClawStores()` fetches from Pi `/api/sources`, `getMyPrimaryStoreName()` reads from existing preferred stores.
- **`app/(chef)/settings/store-preferences/page.tsx`** + **`store-preferences-client.tsx`** - Settings page with quick-add chips for OpenClaw-tracked stores, integrates existing `StoreManager` component.
- **`lib/pricing/resolve-price.ts`** (modified) - Both `resolvePrice()` and `resolvePricesBatch()` now accept `options?: { preferredStore?: string }`. SQL queries for tiers 3-5 sort preferred store matches first. Batch resolver uses `findBestRow()` helper for consistent store preference logic across tiers 3-6.
- **`app/(chef)/settings/page.tsx`** (modified) - Added link to store preferences page.

### Workstream D: Proactive Price Intelligence

- **`lib/openclaw/price-intelligence-actions.ts`** (modified) - Added `getPriceIntelligenceSummary()` that parallel-fetches drops, freshness, cost impact, and stock from Pi into a unified summary object.
- **`app/(chef)/dashboard/_sections/alerts-cards.tsx`** (modified) - Replaced 3 separate Pi API calls with single unified "Price Intelligence" StatCard.
- **Remy tool addition** - Added `price.check` command to `command-task-descriptions.ts`, `command-intent-parser.ts`, and `command-orchestrator.ts`. Chefs can ask Remy "what's the price of chicken?" and get real-time Pi data.

### Workstream E: Sale Calendar

- **`lib/openclaw/sale-calendar-actions.ts`** - Server actions: `getCurrentSales(stores?)` and `getSalesByCategory(category, stores?)` fetching from Pi `/api/sales/current`.
- **`app/(chef)/culinary/costing/sales/page.tsx`** + **`sales-client.tsx`** - "On Sale This Week" page with store filter chips, category-grouped sale cards showing savings %, valid-through dates.
- **`components/navigation/nav-config.tsx`** (modified) - Added nav entry under Costing children.

### Workstream F: Weekly Price Briefing

- **`lib/openclaw/weekly-briefing-actions.ts`** - `getWeeklyPriceBriefing()` computes weekly summary from chef's recipe ingredients using `resolvePricesBatch()` for current prices and `ingredient_price_history` for previous week comparison. Fully deterministic (Formula > AI).
- **`components/pricing/weekly-briefing-card.tsx`** - Dashboard card showing headline, basket total, drops/spikes, best store, coverage. Full card Mon-Wed, condensed Thu-Sun.
- **`app/(chef)/dashboard/page.tsx`** (modified) - Added Suspense-wrapped `WeeklyBriefingSection` before Alerts.

### Workstream G: Menu Cost Forecasting

- **`lib/openclaw/cost-forecast-actions.ts`** - `forecastMenuCost(menuId, eventDate)` uses linear extrapolation from `ingredient_price_history`, capped at +/-30%. Returns confidence level (high/medium/low) based on days out.
- **`app/(chef)/events/[id]/page.tsx`** (modified) - Fetches cost forecast for future events with menus.
- **`app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`** (modified) - Renders forecast badge with current vs forecasted cost, change %, confidence indicator.

### Workstream H: Vendor Price List Import

- **`lib/openclaw/vendor-import-actions.ts`** - Two-step import: `parseVendorPriceList(formData)` (admin-only, proxies PDF to Pi with 30s timeout) and `confirmVendorImport(payload)` (sends confirmed items to Pi).
- **`app/(admin)/admin/price-catalog/vendor-import-tab.tsx`** - Client component with phase state machine (idle, parsing, results, confirming, done). File upload, vendor metadata inputs, parse/confirm flow.
- **`app/(admin)/admin/price-catalog/price-catalog-client.tsx`** (modified) - Added "Vendor Import" tab.

---

## Skipped (Requires Pi SSH)

- **Workstream A:** Pi-side SQLite schema changes (ingredient_aliases, system_ingredients tables, menu_cost_scale_factor)
- **Workstream B:** Pi API endpoint additions (/api/sources, /api/sales/current, /api/vendor-import/parse, /api/vendor-import/confirm)

These must be executed manually on the Pi at 10.0.0.177. The ChefFlow code gracefully handles Pi unavailability (fetchPi wrapper with 5s timeout, try/catch with empty fallbacks).

---

## Key Design Decisions

1. **Formula > AI everywhere** - Weekly briefing, cost forecasting, price intelligence all use deterministic math. Zero Ollama dependency.
2. **Unified Pi summary** - Dashboard consolidates multiple Pi calls into one `getPriceIntelligenceSummary()` for efficiency.
3. **Store preference at SQL level** - `resolvePrice()` uses SQL ORDER BY for store preference (single resolution), while `resolvePricesBatch()` uses in-memory `findBestRow()` helper (different approach appropriate for batch).
4. **Two-step vendor import** - Parse (read-only, reversible) then Confirm (mutating). Admin-only. Follows spec exactly.
5. **Graceful degradation** - All Pi-dependent features return empty/null when Pi is unreachable. No hallucinated data.
