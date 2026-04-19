# System Integrity Question Set: OpenClaw-ChefFlow Cohesion V2 Answers

> Companion to `system-integrity-question-set-openclaw-cohesion-v2.md`
>
> Generated: 2026-04-18
> Mode: Read-only audit and handoff only. No fixes performed in this pass.
> Audience: Anthropic follow-up implementation pass

---

## Scope

This document answers V2 questions `Q51-Q100` against the **current workspace state**
in `CFv1` on 2026-04-18. It is intentionally read-only. The goal is to:

1. Ask and answer the next 50 OpenClaw cohesion questions.
2. Record exact current behavior with code evidence.
3. Separate already-fixed issues from still-open issues.
4. Leave Anthropic a clean remediation backlog instead of mixing audit + implementation.

---

## Current-State Delta vs Earlier Anthropic Thread

These points matter because some earlier thread findings are now stale relative to this repo:

- `receipt` is now present in Tier 1 price resolution.
  Evidence: `lib/pricing/resolve-price.ts:263-291`, `lib/pricing/resolve-price.ts:658-666`.
- The printable grocery list now resolves prices through `resolvePricesBatch()`.
  Evidence: `lib/documents/generate-grocery-list.ts:289-300`.
- Regional average pricing is already state-aware in the current repo.
  Evidence: `lib/pricing/cross-store-average.ts:56-124`.

Anthropic should **not** spend tokens re-fixing those three items unless the behavior regresses again.

---

## Scorecard

| Grade      | Count |
| ---------- | ----- |
| SOLID      | 13    |
| ACCEPTABLE | 19    |
| GAP        | 16    |
| RISK       | 2     |

**Passing:** `32 / 50`  
**Pass rate:** `64%`  
**Target:** `90%+`

---

## Highest-Leverage Findings

### P0

1. **Vendor invoice imports do not land in local `ingredient_price_history`.**
   Evidence: `lib/openclaw/vendor-import-actions.ts:152-189`.
   Impact: imported vendor prices can succeed in Pi while ChefFlow never gets a local Tier 1 record or preserved `vendor_invoice` provenance.

2. **Price watch alerts can fire from stale Pi data and do not create real notifications.**
   Evidence: `lib/openclaw/price-watch-actions.ts:148-216`.
   Impact: chefs can be told a target price was met without freshness validation, and the system only returns an alert list plus `last_alerted_at` stamp.

### P1

1. **Store assignment and price resolution are still separate systems.**
   Evidence: `lib/grocery/store-shopping-actions.ts:192-259`, `lib/documents/generate-grocery-list.ts:289-300`, `lib/pricing/resolve-price.ts:242-632`.

2. **Quotes do not participate in the post-sync cost refresh cascade.**
   Evidence: `lib/pricing/cost-refresh-actions.ts:19-140`.

3. **Dismissed ingredient aliases are permanent.**
   Evidence: `lib/pricing/ingredient-matching-actions.ts:32-53`, `lib/pricing/ingredient-matching-actions.ts:229-252`.

4. **Sale calendar, volatility, and store-accuracy backends exist but are only partially operationalized.**
   Evidence: `lib/openclaw/sale-calendar-actions.ts:72-124`, `lib/openclaw/reference-library-actions.ts:301-356`, repo search on `price_volatility_band` and `store_accuracy_scores`.

5. **Menu engineering computes classifications but does not track changes over time or alert on flips.**
   Evidence: `lib/menus/menu-engineering-actions.ts:94-132`, `lib/menus/menu-engineering-actions.ts:139-340`.

### P2

1. **Receipt and manual entry use separate validation/normalization paths.**
2. **Weekly briefing and forecasting omit some available intelligence dimensions.**
3. **Yield-aware buying and grocery cost semantics are still not explicit end-to-end.**
4. **Pi sync still assumes Pi-side coherence; no explicit scrape-complete handshake is visible in this repo.**

---

## Answered Questions

## Domain 12: Receipt-to-Price-History Pipeline

### Q51. Receipt Scan -> Price History Completeness

**Verdict:** SOLID

**Evidence**

- `lib/ingredients/receipt-scan-actions.ts:56-166`

**What actually happens**

- Confirmed receipt items are inserted into `ingredient_price_history`.
- The ingredient's `last_price_*` fields are updated immediately.
- A non-blocking recipe cost cascade runs after import.
- The price is also pushed to Pi for broader catalog benefit, but Pi push failure does not block local import.

**Recommendation for Anthropic**

- Keep this chain intact; it is one of the cleaner closed loops in the pricing system.

### Q52. Receipt Unit Normalization Consistency

**Verdict:** GAP

**Evidence**

- `lib/ingredients/receipt-scan-actions.ts:80-95`

**What actually happens**

- Receipt import computes `pricePerUnit` as `priceCents / quantity`.
- The OCR-provided `unit` string is stored directly.
- There is no shared normalization path here like the sync pipeline uses for OpenClaw data.

**Recommendation for Anthropic**

- Move receipt import onto a shared unit-normalization/conversion helper before insert.
- Preserve original OCR unit separately if needed for auditability.

### Q53. Receipt vs OpenClaw Price Conflict

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/pricing/resolve-price.ts:263-291`
- `lib/pricing/resolve-price.ts:658-666`
- `lib/ingredients/receipt-scan-actions.ts:111-130`

**What actually happens**

- In the current repo, `receipt` is in the Tier 1 source filter for both single and batch resolution.
- Receipt-scanned prices therefore outrank OpenClaw scrape/flyer/Instacart data.
- Receipt imports are also pushed to Pi, but there is no explicit "scraper calibration discrepancy" workflow when local receipt and Pi price disagree.

**Recommendation for Anthropic**

- Add discrepancy logging when a receipt materially disagrees with recent Pi-derived prices from the same store/unit.

### Q54. Manual Price Entry Parity

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/ingredients/pricing.ts:13-48`
- `lib/ingredients/pricing.ts:55-67`

**What actually happens**

- Manual logging does write into `ingredient_price_history` and refresh ingredient fields.
- It uses Zod positivity checks and auto-computes `price_per_unit_cents`.
- It does **not** use `lib/openclaw/price-validator.ts`, so validation parity is only partial.

**Recommendation for Anthropic**

- Consolidate manual and receipt validation into one shared validation helper.

### Q55. Grocery Entry Integration

**Verdict:** SOLID

**Evidence**

- `lib/pricing/resolve-price.ts:269`
- `lib/pricing/resolve-price.ts:585`
- `lib/pricing/resolve-price.ts:664`

**What actually happens**

- `grocery_entry` is included in the Tier 1 source filter.
- It is also included in the historical averaging fallback.

**Recommendation for Anthropic**

- No structural change required. Keep `grocery_entry` aligned with `manual` and `receipt`.

---

## Domain 13: Shopping List -> Store Assignment -> Price Resolution Chain

### Q56. Shopping List Price Estimates

**Verdict:** GAP

**Evidence**

- `lib/documents/generate-grocery-list.ts:289-300`

**What actually happens**

- The printable grocery list does use `resolvePricesBatch()`.
- It passes only `ingredientIds` and `tenantId`.
- It does **not** pass `preferredStore`, so estimates are not anchored to a chef-selected or list-selected store.

**Recommendation for Anthropic**

- Thread preferred/default store context into `resolvePricesBatch()` from the grocery generator.

### Q57. Store Assignment Price Alignment

**Verdict:** GAP

**Evidence**

- `lib/grocery/store-shopping-actions.ts:192-259`
- `lib/documents/generate-grocery-list.ts:289-300`
- `lib/pricing/resolve-price.ts:242-632`

**What actually happens**

- Store assignments are stored in `store_item_assignments`.
- The grocery list generator does not read those assignments.
- `resolve-price.ts` does not consume `store_item_assignments` either.

**Recommendation for Anthropic**

- Decide the source of truth:
  either store assignment constrains pricing, or pricing only advises assignment.
- Implement that choice in one shared store-aware resolution path.

### Q58. On-Hand Inventory Price Interaction

**Verdict:** SOLID

**Evidence**

- `lib/documents/generate-grocery-list.ts:432-455`
- `lib/documents/generate-grocery-list.ts:469-472`

**What actually happens**

- Inventory is converted into the recipe unit when possible.
- `needToBuyQty` is reduced accordingly.
- Fully covered non-optional items are skipped before projected cost is accumulated.

**Recommendation for Anthropic**

- No structural issue here.

### Q59. Shopping Optimizer Pi Roundtrip

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/openclaw/event-shopping-actions.ts:207-229`

**What actually happens**

- Event shopping optimization sends only ingredient names to Pi.
- Pi computes store optimization independently of the local `resolve-price.ts` chain.
- This is coherent enough for optimization, but it means Pi and ChefFlow can still diverge in edge cases.

**Recommendation for Anthropic**

- Either make this explicitly Pi-authoritative for shopping optimization, or thread local resolved prices into the comparison payload.

### Q60. Cart Checkout -> Ledger / Price History

**Verdict:** GAP

**Evidence**

- `lib/openclaw/cart-actions.ts:335-417`

**What actually happens**

- The cart can refresh prices from Pi in batch.
- The cart stores `price_cents` and `price_source` on `shopping_cart_items`.
- There is no checkout/complete purchase path here that writes those final paid prices into `ingredient_price_history`.

**Recommendation for Anthropic**

- Add a purchase-confirmation path that converts cart items into durable price-history observations.

---

## Domain 14: Event Costing End-to-End

### Q61. Event Food Cost Calculation Path

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/quotes/actions.ts:1130-1181`
- `lib/menus/menu-intelligence-actions.ts:169-177`
- `lib/pricing/cost-refresh-actions.ts:45-70`

**What actually happens**

- Event food cost is read from `menu_cost_summary`, not computed live at page render.
- Recipe ingredient costs are recomputed when prices change, then recipe totals are refreshed, and events are flagged with `cost_needs_refresh`.
- This is a valid materialized flow, but it depends on the refresh cascade staying healthy.

**Recommendation for Anthropic**

- Keep the summary-view model, but surface `cost_needs_refresh` more aggressively where operators see event margins.

### Q62. Quote Pricing Recalculation After Sync

**Verdict:** GAP

**Evidence**

- `lib/pricing/cost-refresh-actions.ts:19-140`

**What actually happens**

- Post-sync cost refresh cascades through recipe ingredients, recipes, and event flags.
- It does not touch quotes.

**Recommendation for Anthropic**

- Add a quote refresh pass for draft quotes that derive food cost from current menu/recipe pricing.

### Q63. Menu Intelligence Cost Drift Alert

**Verdict:** GAP

**Evidence**

- `lib/menus/menu-engineering-actions.ts:94-132`
- `lib/menus/menu-engineering-actions.ts:139-340`

**What actually happens**

- Menu engineering computes current quadrants from current cost/popularity data.
- No persistence of prior classifications is visible.
- No change-detection or alerting layer exists for classification flips.

**Recommendation for Anthropic**

- Persist per-run menu engineering snapshots and notify on significant quadrant transitions.

### Q64. Recipe Cost Rollup Consistency

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/recipes/actions.ts:1995-2054`
- `lib/pricing/cost-refresh-actions.ts:45-70`
- `lib/menus/menu-intelligence-actions.ts:169-177`

**What actually happens**

- The main recipe-cost engine is `computeRecipeIngredientCost()`, which applies unit conversion and yield adjustment.
- Most higher-level cost surfaces consume downstream summaries derived from that computation.
- There are still multiple consumption surfaces, but they converge on the same stored cost fields more often than not.

**Recommendation for Anthropic**

- Keep `computeRecipeIngredientCost()` as the one canonical cost primitive and explicitly route all new cost surfaces through it or its cached outputs.

### Q65. Multi-Menu Event Costing

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/quotes/actions.ts:1142-1161`
- `lib/openclaw/event-shopping-actions.ts:90-205`

**What actually happens**

- Event-facing food cost retrieval pulls the most recent menu linked to the event.
- Event shopping aggregation can combine ingredient demand across events and menus.
- This is workable, but event cost retrieval itself is still menu-centric rather than a purpose-built multi-menu aggregation layer.

**Recommendation for Anthropic**

- If multi-menu events are first-class, create an event-level cost summary rather than inferring through one menu row.

---

## Domain 15: Ingredient Alias & Matching Quality

### Q66. Alias Chain Depth

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/pricing/ingredient-matching-actions.ts:32-67`
- `lib/openclaw/auto-enrich.ts:31-69`
- `lib/pricing/resolve-price.ts:499-543`

**What actually happens**

- The chef ingredient is linked to `system_ingredients` through `ingredient_aliases`.
- Market aggregate pricing then bridges from `ingredient_aliases` into `openclaw.system_ingredient_prices`.
- This is effectively a two-hop chain rather than a direct foreign key to canonical OpenClaw ingredients.

**Recommendation for Anthropic**

- Keep the reference-data separation, but document this bridge explicitly so future work does not assume a direct canonical FK exists.

### Q67. Dismissed Alias Recovery

**Verdict:** GAP

**Evidence**

- `lib/pricing/ingredient-matching-actions.ts:32-53`
- `lib/pricing/ingredient-matching-actions.ts:229-252`

**What actually happens**

- If an alias exists with `match_method = 'dismissed'`, suggestions return empty immediately.
- Dismissal is durable and there is no TTL, reconsideration, or "suggest again" path.

**Recommendation for Anthropic**

- Add explicit undismiss/reconsider support or a time-based recovery path.

### Q68. Auto-Enrich Timing vs Sync Timing

**Verdict:** SOLID

**Evidence**

- `lib/openclaw/auto-enrich.ts:31-132`
- `lib/openclaw/sync.ts:191-260`

**What actually happens**

- Auto-enrich seeds an alias and best-effort price when an ingredient is created.
- Sync later writes fresher pricing data from Pi.
- This is layered rather than conflicting; auto-enrich fills the gap until sync catches up.

**Recommendation for Anthropic**

- No structural issue. Preserve the "seed now, refine later" design.

### Q69. Orphaned Aliases After Ingredient Rename

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/recipes/actions.ts:1122-1134`

**What actually happens**

- When an ingredient name changes, the system deletes stale unconfirmed trigram aliases.
- It then reruns auto-match and `ensureIngredientHasPrice()`.
- Confirmed aliases are not blindly destroyed, which is reasonable, but rename behavior is still heuristic.

**Recommendation for Anthropic**

- Add a rename audit trail and optionally prompt for re-review when a confirmed alias now looks semantically suspect.

### Q70. Cross-Tenant Alias Quality Amplification

**Verdict:** SOLID

**Evidence**

- `lib/pricing/ingredient-matching-actions.ts:33-38`
- `lib/openclaw/auto-enrich.ts:32-37`
- `lib/pricing/resolve-price.ts:504-510`

**What actually happens**

- Alias rows are tenant-scoped.
- Shared reference data (`system_ingredients`, `system_ingredient_prices`) is global.
- This gives each chef isolation while still letting all chefs benefit from shared reference quality.

**Recommendation for Anthropic**

- No structural issue here.

---

## Domain 16: Vendor Imports & Wholesale Pricing Pipeline

### Q71. Vendor Invoice -> Price History

**Verdict:** RISK

**Evidence**

- `lib/openclaw/vendor-import-actions.ts:152-189`

**What actually happens**

- Vendor import confirmation sends data to Pi and then only revalidates the price catalog.
- There is no local `ingredient_price_history` insert in this action.
- No durable local `vendor_invoice` source attribution is preserved here.

**Recommendation for Anthropic**

- Add a local write path that mirrors confirmed vendor imports into `ingredient_price_history` with source `vendor_invoice`.
- Preserve vendor metadata instead of letting the price only exist implicitly through Pi.

### Q72. Wholesale Handler Integration

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/openclaw/wholesale-handler.ts:20-103`
- `lib/pricing/resolve-price.ts:338-367`

**What actually happens**

- Wholesale sync is real and writes `openclaw_wholesale` rows.
- `resolve-price.ts` has a dedicated wholesale tier that explicitly includes `tenant_id IS NULL` wholesale rows.

**Recommendation for Anthropic**

- This is connected, but document the shared/NULL-tenant semantics clearly.

### Q73. Vendor Price vs Retail Price Display

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/pricing/resolve-price.ts:263-367`

**What actually happens**

- Chef-entered/vendor-like sources live in Tier 1.
- Wholesale has its own Tier 2.5.
- Retail OpenClaw sources come later.
- The chain is coherent, but the UI does not present a "retail vs wholesale context" toggle as a first-class user choice.

**Recommendation for Anthropic**

- Add context-aware price views when wholesale and retail both exist for the same ingredient.

### Q74. PO Receipt Price Path

**Verdict:** SOLID

**Evidence**

- `lib/pricing/resolve-price.ts:269`
- `lib/pricing/resolve-price.ts:585`
- `lib/pricing/resolve-price.ts:664`

**What actually happens**

- `po_receipt` is present in Tier 1 and in historical averaging.

**Recommendation for Anthropic**

- No structural issue here.

---

## Domain 17: Yield, Waste, and Trim Factor Integration

### Q75. USDA Yield Factor Sourcing

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/openclaw/reference-library-actions.ts:247-285`

**What actually happens**

- `suggestYieldByName()` reads local `ingredient_waste_factors`.
- It returns `source: 'USDA'` or `source: 'USDA (partial match)'`.
- This is local reference-library logic, not a Pi call.

**Recommendation for Anthropic**

- Consider adding coverage reporting for ingredients with no USDA waste-factor match.

### Q76. Yield Factor in Price Resolution

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/pricing/resolve-price.ts:242-632`
- `lib/recipes/actions.ts:1995-2054`

**What actually happens**

- `resolve-price.ts` returns raw price resolution; it does not apply yield.
- `computeRecipeIngredientCost()` applies yield adjustment after unit conversion.

**Recommendation for Anthropic**

- Keep yield application in the consumer layer, but document that separation explicitly for every new pricing surface.

### Q77. Yield-Adjusted Grocery List Costs

**Verdict:** GAP

**Evidence**

- `lib/documents/generate-grocery-list.ts:314-353`
- `lib/documents/generate-grocery-list.ts:469-472`

**What actually happens**

- Grocery projection is `needToBuyQty * lastPriceCents`.
- No explicit yield factor is applied in this generator.
- If buying quantity should exceed edible-side recipe quantity, this report currently does not make that semantics explicit.

**Recommendation for Anthropic**

- Decide whether grocery list quantities are edible-side or buy-side.
- Then align quantity generation and projected cost with that same choice.

---

## Domain 18: Weekly Briefing, Forecasting & Intelligence Surfaces

### Q78. Weekly Briefing Data Sources

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/openclaw/weekly-briefing-actions.ts:82-142`
- `lib/openclaw/weekly-briefing-actions.ts:181-209`

**What actually happens**

- Weekly briefing resolves current prices locally and calls Pi for cost-impact moves.
- `seasonalNote` is hard-coded `null`.
- No sale-calendar, volatility, or seasonal reference-library data is used here.

**Recommendation for Anthropic**

- Enrich weekly briefing with volatility, sales, and seasonality once those signals are trustworthy.

### Q79. Cost Forecast vs Actual Tracking

**Verdict:** GAP

**Evidence**

- `lib/openclaw/cost-forecast-actions.ts:36-127`

**What actually happens**

- Forecasting is deterministic and coherent.
- No forecast snapshot persistence or forecast-vs-actual reconciliation is visible.

**Recommendation for Anthropic**

- Persist forecasts and compare them to realized menu costs after the event date.

### Q80. Seasonal Badge Suppression Verification

**Verdict:** SOLID

**Evidence**

- `lib/openclaw/seasonal-analyzer.ts:20-36`
- repo search: `rg "getSeasonalInfo|getWhatsInSeason|seasonal-analyzer|seasonalNote" app components lib`

**What actually happens**

- The OpenClaw seasonal analyzer only operates on ingredients with `6+` months of data.
- Current repo search shows extremely limited consumer usage of OpenClaw seasonality surfaces.
- The risk of an ungated seasonal badge leaking through this repo is low.

**Recommendation for Anthropic**

- If new seasonal UI is added, preserve the same minimum-data gate explicitly.

---

## Domain 19: Data Export & Attribution

### Q81. Sale Calendar Consumer Value

**Verdict:** GAP

**Evidence**

- `lib/openclaw/sale-calendar-actions.ts:72-124`
- `app/(chef)/culinary/costing/sales/page.tsx:14`
- `app/(chef)/culinary/costing/sales/sales-client.tsx:42-54`

**What actually happens**

- Sales are fetched and displayed.
- There is no direct connection to event menus, grocery lists, or savings alerts in this repo.

**Recommendation for Anthropic**

- Connect sale items to upcoming event ingredient demand and shopping opportunities.

### Q82. Export Price Source Attribution

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/documents/generate-grocery-list.ts:50-74`
- `lib/documents/generate-grocery-list.ts:469-510`

**What actually happens**

- Grocery output carries projected cents totals, but not a formal resolution-tier label.
- This is usable, but provenance is still thin in exported/printable shopping artifacts.

**Recommendation for Anthropic**

- Add explicit "estimated" or source-tier labeling where exported costs can be mistaken for firm purchase records.

### Q83. PDF Grocery List Price Labels

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/documents/generate-grocery-list.ts:469-510`

**What actually happens**

- The generator decides whether projected cost is reliable enough to show.
- It does not stamp each line item with a resolution tier or firm/estimated label.

**Recommendation for Anthropic**

- Label projected costs as estimated unless derived from explicit receipt/manual/vendor evidence.

### Q84. OpenClaw Attribution in Exports

**Verdict:** SOLID

**Evidence**

- repo search across public/client/embed/export surfaces found no user-facing `OpenClaw` label in these paths.

**What actually happens**

- User-facing public ingredient copy says prices are scraped from local stores and not affiliated with retailers.
- The internal system name does not appear on the examined public/client/export surfaces.

**Recommendation for Anthropic**

- Keep this invariant in future export work.

---

## Domain 20: Price Watch, Alerts & Proactive Intelligence

### Q85. Price Watch -> Notification Chain

**Verdict:** GAP

**Evidence**

- `lib/openclaw/price-watch-actions.ts:148-216`
- `components/pricing/price-watch-list.tsx:36`

**What actually happens**

- `checkPriceWatchAlerts()` returns alert objects and stamps `last_alerted_at`.
- No in-app notification row, email, or other delivery mechanism is created here.

**Recommendation for Anthropic**

- Turn triggered watches into actual notifications and make the notification channel explicit.

### Q86. Price Alert Freshness

**Verdict:** RISK

**Evidence**

- `lib/openclaw/price-watch-actions.ts:166-194`

**What actually happens**

- Price watch evaluation trusts `piResult.bestPrice`.
- No freshness date is checked before firing an alert.

**Recommendation for Anthropic**

- Require a freshness threshold before watch triggers can alert.

### Q87. Volatility-Driven Suggestions

**Verdict:** GAP

**Evidence**

- `lib/openclaw/polish-job.ts:337-353`
- repo search on `price_volatility_band|price_volatility_score` found only schema, polish job, and refresh scheduling helpers in repo proper.

**What actually happens**

- Volatility is computed.
- No meaningful user-facing consumer is evident in the repo proper.

**Recommendation for Anthropic**

- Surface volatility in ingredient, briefing, or buying-planning contexts.

---

## Domain 21: Public Surfaces & Non-Chef Users

### Q88. Public Ingredient Page Price Accuracy

**Verdict:** SOLID

**Evidence**

- `app/(public)/ingredient/[id]/page.tsx:203-260`
- `app/(public)/ingredient/[id]/page.tsx:321-397`
- `lib/openclaw/public-ingredient-queries.ts:64-244`

**What actually happens**

- Public ingredient pages read OpenClaw catalog/store pricing only.
- They do not expose chef receipt history.
- Knowledge-only pages explicitly show "Live price data not yet available."

**Recommendation for Anthropic**

- Keep public ingredient pages restricted to shared market/catalog data.

### Q89. Embeddable Widget Price Exposure

**Verdict:** SOLID

**Evidence**

- `app/embed/inquiry/[chefId]/page.tsx:1-72`

**What actually happens**

- The embed route is a booking form, not a pricing surface.
- No ingredient cost or OpenClaw pricing is exposed there.

**Recommendation for Anthropic**

- No structural issue.

### Q90. Client Portal Cost Visibility

**Verdict:** SOLID

**Evidence**

- client-surface search over `app/(client)` only found `quoted_price_cents` and `price_per_person_cents`.

**What actually happens**

- Current client pages expose quote/event totals and per-person pricing.
- No ingredient cost, food cost percentage, price source, or margin surface was found in repo search.

**Recommendation for Anthropic**

- Keep client surfaces quote-total-only unless there is a deliberate product decision otherwise.

---

## Domain 22: Cron Coordination & Timing

### Q91. Sync Timing vs Pi Cron Timing

**Verdict:** GAP

**Evidence**

- `lib/openclaw/sync.ts:195-214`
- `lib/openclaw/sync.ts:226-237`
- No repo-visible Pi-side "scrape in progress" handshake was found in sync callers.

**What actually happens**

- ChefFlow sync calls Pi endpoints directly.
- There is no visible scrape-complete signal, lock, or snapshot token in this repo.

**Recommendation for Anthropic**

- Add an explicit Pi-side snapshot/ready marker or version token and make sync consume it.

### Q92. Polish Job Scheduling

**Verdict:** ACCEPTABLE

**Evidence**

- `app/api/cron/openclaw-polish/route.ts:5-38`
- `lib/openclaw/sync.ts:625-634`

**What actually happens**

- Polish can run through cron.
- Sync also triggers polish non-blockingly after updates.
- This is workable but duplicated and timing can still overlap.

**Recommendation for Anthropic**

- Declare one authoritative scheduler or add a mutex around polish execution.

### Q93. Cost Refresh Cascade Timing

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/openclaw/sync.ts:599-605`
- `lib/pricing/cost-refresh-actions.ts:159-203`

**What actually happens**

- Post-sync ingredient cost refresh is fire-and-forget.
- `refreshIngredientCostsAction()` does have an advisory lock.
- There is still a window where sync reports success before downstream cost refresh finishes.

**Recommendation for Anthropic**

- Consider surfacing refresh state where chefs can otherwise see stale post-sync numbers.

### Q94. Materialized View Refresh Contention

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/pricing/cross-store-average.ts:126-139`

**What actually happens**

- Materialized views are refreshed concurrently.
- No app-level mutex is visible around `refreshPriceViews()`.
- That is a manageable risk, but not yet a catastrophic one.

**Recommendation for Anthropic**

- Add a guard if concurrent manual + scheduled sync becomes common.

---

## Domain 23: The "Unbuilt Backends" Audit

### Q95. Store Accuracy Scorer -> UI

**Verdict:** GAP

**Evidence**

- `lib/openclaw/reference-library-actions.ts:301-356`
- repo search on `getStoreAccuracy|getStoreAccuracyRanking|store_accuracy_scores` found schema, scorer, and query actions only; no UI consumer in `app` or `components`.

**What actually happens**

- Accuracy scores exist and query actions exist.
- No real UI surface was found in repo proper.

**Recommendation for Anthropic**

- Start with an admin scorecard or per-store confidence badge in pricing surfaces.

### Q96. Normalization Coverage Metric

**Verdict:** GAP

**Evidence**

- `lib/openclaw/coverage-health.ts:14-188`

**What actually happens**

- Coverage health tracks current price, any price, image, nutrition, scraper status, and confidence.
- It does **not** track `normalization_map` completeness.

**Recommendation for Anthropic**

- Add normalization coverage metrics at catalog, category, and tenant impact levels.

### Q97. Rejection Rate Alerting

**Verdict:** ACCEPTABLE

**Evidence**

- `lib/admin/openclaw-health-actions.ts:66-245`

**What actually happens**

- Admin actions expose quarantine stats and sync audit log summaries.
- There is no threshold-based alerting or automatic escalation in this file.

**Recommendation for Anthropic**

- Add thresholds and alert channels once the manual admin dashboard is considered sufficient for baseline observability.

### Q98. Menu Engineering Change Alerts

**Verdict:** GAP

**Evidence**

- `lib/menus/menu-engineering-actions.ts:94-132`
- `lib/menus/menu-engineering-actions.ts:139-340`
- repo search found no persisted classification history or change-alert path.

**What actually happens**

- Quadrants are computed on demand.
- The system does not retain previous classifications or alert on changes.

**Recommendation for Anthropic**

- Persist quadrant snapshots and add alert rules for meaningful business shifts.

---

## Domain 24: Edge Cases & Boundary Conditions

### Q99. Zero-Ingredient Chef

**Verdict:** SOLID

**Evidence**

- `lib/openclaw/weekly-briefing-actions.ts:82-90`
- `lib/openclaw/cost-forecast-actions.ts:50-60`
- `lib/openclaw/coverage-health.ts:92-96`

**What actually happens**

- Key pricing/intelligence actions return `null`, empty, or an explicit empty report when there is no ingredient base.
- That is the correct behavior for a zero-ingredient chef.

**Recommendation for Anthropic**

- Add explicit empty-state copy where needed, but the action-layer behavior is already sane.

### Q100. Deleted Ingredient Price Resurrection

**Verdict:** SOLID

**Evidence**

- `lib/db/schema/schema.ts:22192-22202`
- `lib/openclaw/auto-enrich.ts:71-83`
- `lib/recipes/actions.ts:2065-2125`

**What actually happens**

- `ingredient_price_history.ingredient_id` cascades on ingredient delete.
- A recreated ingredient gets a new UUID.
- Auto-enrich and price resolution operate against the new ingredient ID and current aliasing, not orphaned rows from the deleted one.

**Recommendation for Anthropic**

- No structural issue here.

---

## Recommended Anthropic Execution Order

### Wave 1: P0

1. Mirror vendor-confirmed imports into local `ingredient_price_history` with preserved `vendor_invoice` provenance.
2. Add freshness gating and real notification delivery to price-watch alerts.

### Wave 2: P1

1. Unify shopping store assignment with the actual pricing resolver.
2. Extend post-sync refresh to draft quote cost dependencies.
3. Add alias-dismiss recovery / re-suggest capability.
4. Persist and diff menu-engineering results over time.
5. Operationalize sale calendar against upcoming event demand.
6. Surface volatility and store accuracy where chefs can act on them.
7. Add normalization-map completeness reporting.
8. Introduce a Pi snapshot-ready handshake into sync.

### Wave 3: P2

1. Unify receipt and manual validation/normalization paths.
2. Clarify grocery yield semantics and projected-cost semantics.
3. Add forecast-vs-actual evaluation loops.
4. Expand weekly briefing to use volatility, sale, and seasonal signals once trustworthy.

---

## Closing Note for Anthropic

This repo is **not** in a broken state. The current OpenClaw-ChefFlow integration already has real connective tissue in the receipt pipeline, recipe-cost cascade, public ingredient pages, state-aware regional averages, and batch price resolution. The main problem is not "nothing is connected." The main problem is that several important loops stop one step short of becoming operational:

- prices are computed but not surfaced,
- assignments are stored but not honored,
- imports succeed remotely but do not become local truth,
- alerts are detected but not delivered,
- intelligence is calculated but not versioned or acted on.

That is where the next Anthropic pass should spend its tokens.
