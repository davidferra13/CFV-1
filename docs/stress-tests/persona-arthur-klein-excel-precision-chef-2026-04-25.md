# PERSONA STRESS TEST: Arthur Klein (Excel-Driven Precision Chef)

## Generated: 2026-04-25

## Prior test: First run

---

## 1. PERSONA PROFILE

```
PERSONA PROFILE
===============
Name/Label:        arthur-klein-excel-precision-chef
Type:              chef
Role:              Solo private chef (fine dining, hotels, private work)
Business Model:    Event-based private dining + retainer clients. Prices using exact
                   cost-of-goods + labor + overhead formulas refined over decades.
Scale:             3-10 active clients, 4-8 events/month, $80K-$150K revenue [inferred]
Tech Comfort:      Medium-high (Excel expert, but distrusts modern SaaS)
Current Tools:     Microsoft Excel (cost sheets, recipe breakdowns, pricing models,
                   inventory tracking), email, phone, pen-and-paper systems
Top 3 Pain Points: 1. Fear of losing control/visibility when migrating to new tools
                   2. No system matches Excel's formula transparency
                   3. Manual re-entry when switching platforms
Deal-Breakers:     Hidden calculations, AI-generated content, forced data re-entry,
                   oversimplified abstractions that lose precision
Success Metric:    "ChefFlow does exactly what I already do, but better, faster, and
                   without losing control." Every number traceable to its formula.
ChefFlow Surface:  /culinary/costing, /finance/*, /recipes, /menus, /events,
                   /settings/pricing, /culinary/price-catalog, /inventory
```

---

## 2. WORKFLOW SIMULATION

### Service Lifecycle Walkthrough

**Stage 1: Inquiry Received** -- Friction: 0
Arthur takes inquiries via phone and email. ChefFlow's manual inquiry entry (`/inquiries/new`) works without AI. Smart Fill (AI parse from text) is optional, not forced. He can type everything manually.

- Route: `/inquiries/new` -- manual entry form exists
- Evidence: `app/(chef)/inquiries/new/page.tsx`

**Stage 2: Discovery** -- Friction: 0
Arthur captures client preferences manually. ChefFlow has client profiles with dietary restrictions, preferences, event history. All manual entry.

- Route: `/clients/[id]` -- 30-panel relationship hub
- Evidence: `docs/app-complete-audit.md` Section 3

**Stage 3: Quote** -- Friction: 1
Arthur has his own pricing model (cost + labor + overhead + markup). ChefFlow's pricing engine (`lib/pricing/compute.ts`) generates quotes with a numbered step-by-step breakdown visible to the chef via `formatPricingForChef()`. This is close to what Arthur wants. However, the pricing engine uses ChefFlow's formula structure, not Arthur's custom Excel formula. Arthur can configure: per-course rates, weekend/holiday premiums, deposit %, mileage rate, add-ons. He CANNOT configure: overhead %, hourly labor rate, custom markup formula. Those use hardcoded defaults (15% overhead, $50/hr in `lib/formulas/true-plate-cost.ts`).

- Route: `/quotes/new` with prefill from inquiry
- Evidence: `lib/pricing/config-actions.ts`, `lib/pricing/compute.ts`
- Gap: No configurable overhead % or labor rate in settings UI

**Stage 4: Agreement** -- Friction: 0
Contract generation exists. Manual creation and customization available.

- Route: `/events/[id]` contracts tab
- Evidence: `docs/app-complete-audit.md` Section 2

**Stage 5: Menu Planning** -- Friction: 1
Menu builder with course/dish/component structure. Arthur can build menus manually. The cost sidebar shows live food cost %, total cost, per-guest cost. Help popovers expose formulas in monospace. But the inline cost breakdown tree shows dollar amounts without showing the multiplication step (qty x unit_price x scale_factor).

- Route: `/menus/[id]/editor` with `MenuCostSidebar`
- Evidence: `components/culinary/menu-cost-sidebar.tsx`, `components/culinary/menu-breakdown-view.tsx`
- Gap: Formula not shown inline with each cost line

**Stage 6: Pre-Service Logistics** -- Friction: 0
Shopping list generation from menus. Grocery list grouped by category. Prep timeline with station assignments.

- Route: `/events/[id]/grocery-quote`, `/culinary/prep/shopping`
- Evidence: `docs/app-complete-audit.md` Section 6.6

**Stage 7: Payment** -- Friction: 0
Immutable append-only ledger. Integer cents (no floating-point errors). Invoice creation, payment tracking, deposit management. CPA-ready export as ZIP. This is actually better than Excel for audit trail.

- Route: `/finance/ledger`, `/finance/invoices`, `/finance/payments`
- Evidence: `lib/finance/export-actions.ts`, `lib/finance/cpa-export-actions.ts`

**Stage 8: Service Day** -- Friction: 0
Pre-service checklist, station clipboard (Excel-like grid), day-of-plan. The clipboard at `/stations/[id]/clipboard` is the most Excel-like surface in ChefFlow: Item, Par, On Hand, Need to Make, Made, Need to Order, Waste, Shelf Life, Notes.

- Route: `/stations/[id]/clipboard`
- Evidence: `docs/app-complete-audit.md` Section 9B

**Stage 9: Post-Service** -- Friction: 0
Financial reconciliation, AAR, follow-up messaging. Profitability calculated as revenue minus all costs including time.

- Route: `/events/[id]?tab=money`, `/aar`
- Evidence: `lib/finance/margin-calculator.ts`

**Stage 10: Client Lifecycle** -- Friction: 0
Client profiles with event history, preferences, tier classification. Rebooking support.

- Route: `/clients/[id]`
- Evidence: `docs/app-complete-audit.md` Section 3

### Cross-Cutting Simulations

**First 10 Minutes:**
Arthur signs up, sees the dashboard. The onboarding is non-blocking (good, per CLAUDE.md rule). He navigates to `/settings/pricing` and finds the Guided Pricing Setup wizard. This helps, but he immediately notices he can't set his overhead % or labor rate. He goes to `/culinary/costing` and finds recipe/menu cost tables with confidence badges, freshness columns, ingredient match review. He's intrigued by the data quality transparency. He clicks a help popover "?" and sees formulas in monospace. This is the moment he either stays or leaves. The formulas ARE there, but behind popovers, not inline. Verdict: cautiously interested but skeptical.

**First Day:**
Arthur tries to import his Excel data. He goes to `/import` and finds 12 import modes. He can import recipes via CSV (with flexible column mapping), clients via CSV, historical events, historical payments. He CANNOT import his master ingredient price list (no standalone ingredient price CSV import). He CANNOT import .xlsx directly (must save as CSV first). He spends time converting files. He finds the vendor catalog import (`components/vendors/vendor-catalog-import.tsx`) which does accept ingredient-level pricing from vendor catalogs via CSV. This partially solves his price import need but doesn't match his format.

**First Week:**
Arthur has entered enough data to test the costing pipeline. He creates recipes, builds menus, runs cost breakdowns. He discovers:

- Price provenance is excellent (10-tier resolution, store attribution, confidence dots, freshness)
- The food costing guide at `/help/food-costing` has ALL 20 formulas he wants to verify
- The pricing breakdown (`formatPricingForChef()`) shows numbered computation steps
- But he can't customize overhead % or labor rate
- He can't export recipe cost breakdowns to CSV to cross-reference in his spreadsheets
- He can export financial data (ledger, expenses, revenue) to CSV

**First Month:**
Arthur is using ChefFlow for event management, client tracking, invoicing, and the ledger. The financial precision (integer cents, immutable ledger, computed balances) earns trust. The price intelligence (store-level pricing, confidence scoring) is something his spreadsheets never had. But he still maintains parallel Excel sheets for recipe costing because he can't see his formula applied inline and can't customize the overhead/labor inputs. He's a partial adopter, not a full convert.

---

## 3. CAPABILITY AUDIT

### 1. Onboarding & Setup -- PARTIAL

Evidence: `/import` hub with 12 modes (`components/import/smart-import-hub.tsx`). CSV import for recipes, clients, events, payments. Vendor catalog CSV import.
Gap: No .xlsx native import. No standalone ingredient master list import. No ingredient price CSV import outside of vendor catalogs. Must save-as-CSV from Excel.
Impact: Arthur's first hour is spent fighting file format conversion instead of experiencing the product.

### 2. Client Management -- SUPPORTED

Evidence: 30-panel client CRM (`docs/app-complete-audit.md` Section 3). CSV client import with deduplication. Full dietary/preference/event history tracking.
Gap: None significant for this persona.

### 3. Inquiry Pipeline -- SUPPORTED

Evidence: Manual inquiry entry, quote builder, proposal templates. AI parsing is optional, not required.
Gap: None. AI features are opt-in, not forced.

### 4. Event Lifecycle -- SUPPORTED

Evidence: 8-state FSM (draft through completed), operating spine, pre-service checklists, day-of-plan.
Gap: None significant for this persona.

### 5. Menu & Recipe -- PARTIAL

Evidence: Menu builder with course/dish/component structure. Recipe management with ingredient rows, scaling calculator. Menu cost breakdown tree (`menu-breakdown-view.tsx`). Cost sidebar with live food cost %.
Gap: (A) Cost breakdown shows dollar amounts per ingredient but not the formula "qty x unit_price x scale_factor" inline. Formulas available only via help popovers. (B) No recipe cost CSV export. (C) Yield percentage inputs exist on recipe edit (`/recipes/[id]/edit`) but the yield factor formula (EP Cost = AP Cost / Yield Factor) is in help content only, not shown inline during calculation.
Impact: Arthur can SEE the costs but cannot AUDIT the calculation path without clicking popovers. This violates his "see every calculation" requirement.

### 6. Culinary Ops -- PARTIAL

Evidence: 10-tier price resolution chain with full provenance (`lib/pricing/resolve-price.ts`). Ingredient auto-matching (pg_trgm). Chef pricing overrides. Inventory tracking with par levels, waste log. Vendor management.
Gap: (A) Confidence decay formula hidden from user (sees "75% confidence" but not the step function). (B) No ingredient price CSV import. (C) No custom Q-factor or overhead % in settings.
Impact: Price provenance is best-in-class (store, tier, confidence, freshness, trend). But Arthur can't verify HOW confidence was calculated.

### 7. Financial -- SUPPORTED

Evidence: Immutable append-only ledger. Integer cents (zero floating-point errors). 65+ finance route pages. 9 report types. P&L with CSV download. Break-even calculator with scenarios. CPA-ready ZIP export. Tax center with quarterly estimates. True plate cost breakdown (ingredients + labor + travel + overhead as stacked bar). Cash flow forecast. Revenue goals.
Gap: (A) True plate cost uses DEFAULT_OVERHEAD_PERCENT (15%) and DEFAULT_HOURLY_RATE ($50/hr) with no settings UI to customize these (`lib/formulas/true-plate-cost.ts:34-38`). (B) The stacked bar shows dollar amounts per category but not the formula per line.
Impact: Financial system is excellent for precision (integer math, immutable ledger). Arthur would trust the ledger. But he can't tune the plate cost calculation to his actual overhead and labor rates.

### 8. Calendar & Scheduling -- SUPPORTED

Evidence: Day/week/month/year views, iCal sync, Google Calendar integration, prep block scheduling, drag-and-drop.
Gap: None for this persona.

### 9. Communication -- SUPPORTED

Evidence: Gmail integration, manual messaging, inbox triage. All manual-first, AI optional.
Gap: None for this persona.

### 10. Staff & Team -- SUPPORTED

Evidence: Staff directory, scheduling, clock in/out, labor cost tracking.
Gap: None significant.

### 11. Analytics & Intelligence -- PARTIAL

Evidence: Analytics hub with 5+ dashboards. Business Intelligence widget (deterministic, zero Ollama dependency). Food cost trend sparkline.
Gap: (A) Some analytics surfaces show AI-generated insights (Business Insights panel calls Ollama). (B) No custom report builder. Arthur can't build his own analytical views like he would in Excel with pivot tables.
Impact: Analytics exist but Arthur can't customize the analysis dimensions. The AI insights panel would irritate him, but it's a widget he can hide via dashboard layout settings.

### 12. Public Presence -- SUPPORTED

Evidence: Public booking page, chef profile, shareable menu links.
Gap: None for this persona (Arthur cares about operations, not marketing).

### Capability Summary

| Domain                   | Rating    | Key Gap                                                |
| ------------------------ | --------- | ------------------------------------------------------ |
| Onboarding & Setup       | PARTIAL   | No .xlsx import, no ingredient price import            |
| Client Management        | SUPPORTED | --                                                     |
| Inquiry Pipeline         | SUPPORTED | --                                                     |
| Event Lifecycle          | SUPPORTED | --                                                     |
| Menu & Recipe            | PARTIAL   | No inline formula visibility, no recipe cost export    |
| Culinary Ops             | PARTIAL   | Hidden confidence formula, no custom overhead/Q-factor |
| Financial                | SUPPORTED | Hardcoded overhead/labor defaults (no settings UI)     |
| Calendar & Scheduling    | SUPPORTED | --                                                     |
| Communication            | SUPPORTED | --                                                     |
| Staff & Team             | SUPPORTED | --                                                     |
| Analytics & Intelligence | PARTIAL   | No custom report builder, AI insights widget           |
| Public Presence          | SUPPORTED | --                                                     |

---

## 4. FAILURE MAP

### BLOCKER: critical -- No configurable overhead % or labor rate

What: True plate cost calculation (`lib/formulas/true-plate-cost.ts:34-38`) uses hardcoded `DEFAULT_OVERHEAD_PERCENT = 15` and `DEFAULT_HOURLY_RATE = 5000` (cents). No settings UI exists to customize these per chef.
Where: `lib/formulas/true-plate-cost.ts`, `components/culinary/true-cost-breakdown.tsx`, `lib/pricing/plate-cost-actions.ts:164`
Persona impact: Arthur's entire pricing model is built on HIS overhead % and HIS labor rate. If ChefFlow uses 15% overhead and he uses 22%, every plate cost calculation is wrong. He cannot trust ANY costing number in the system. This single gap invalidates the entire costing pipeline for this persona.
Required fix: Add `overhead_pct` and `hourly_rate_cents` fields to `chef_pricing_config` table. Add UI inputs to `components/settings/pricing-config-form.tsx`. Pass chef's values through `lib/pricing/plate-cost-actions.ts` instead of `DEFAULT_OVERHEAD_PERCENT` / `DEFAULT_HOURLY_RATE`.
Scope class: REFINE

### WORKFLOW BREAK: high -- No recipe/ingredient cost CSV export

What: Financial CSV exports exist (ledger, expenses, revenue by client, CPA package) but there is no "export my recipes with ingredient costs" or "export menu cost breakdown" to CSV.
Where: `lib/finance/export-actions.ts`, `lib/exports/actions.ts` (neither includes recipe/ingredient cost data)
Persona impact: Arthur needs to cross-reference ChefFlow's costing against his Excel sheets during migration. Without export, he can't verify numbers outside the system. This cements the parallel-spreadsheet problem.
Required fix: Add `exportRecipeCostBreakdown(recipeId)` and `exportMenuCostBreakdown(menuId)` server actions to `lib/exports/actions.ts`. Each returns CSV with ingredient name, quantity, unit, unit cost, source tier, extended cost, food cost %. Add "Export CSV" button to recipe detail and menu detail pages.
Scope class: EXPAND

### WORKFLOW BREAK: high -- No standalone ingredient price CSV import

What: Ingredients are imported as part of recipes (CSV, URL, photo) or through vendor catalog import. But there is no "upload my master ingredient list with my prices" standalone import.
Where: `lib/migration/csv-import-actions.ts` (no ingredient-only import function), `components/import/smart-import-hub.tsx` (no ingredient import mode)
Persona impact: Arthur has a master ingredient price list in Excel built over decades. He cannot import it directly. Vendor catalog import (`components/vendors/vendor-catalog-import.tsx`) covers vendor-sourced items but requires vendor association. Arthur's prices are HIS prices, not tied to a specific vendor.
Required fix: Add an `ingredients` import mode to the Smart Import Hub. Accept columns: name, category, unit, price, notes. Upsert into `ingredients` table with chef pricing override via `lib/pricing/override-actions.ts`.
Scope class: EXPAND

### WORKFLOW BREAK: medium -- No inline formula audit trail on costing views

What: Menu cost breakdown (`menu-breakdown-view.tsx`) shows per-ingredient dollar costs but not the multiplication formula. The formula "Food Cost % = (Total Ingredient Cost / Selling Price) x 100" exists in help popovers (`costing-help-popover.tsx`) and the food costing guide (`/help/food-costing`), but not inline with the numbers.
Where: `components/culinary/menu-breakdown-view.tsx`, `components/culinary/menu-cost-sidebar.tsx`
Persona impact: Arthur wants to see "2.5 lb x $4.29/lb x 1.5 scale = $16.09" next to every ingredient line, not just "$16.09". He will not trust a number he can't trace to inputs. The help popovers partially solve this but require a click per formula.
Required fix: Add an optional "Show formulas" toggle to `menu-breakdown-view.tsx` that renders `{scaledQty} x ${unitPrice}/{unit} x {scaleFactor} = ${cost}` per ingredient row. Default off (clean view), toggle on for audit mode.
Scope class: REFINE

### DATA DEAD-END: medium -- Confidence decay formula not exposed

What: Price confidence scoring uses a step function (`lib/pricing/resolve-price.ts:154-165`): 3d=100%, 14d=90%, 30d=75%, 60d=50%, 90d=30%, >90d=15%. User sees "75% confidence" via dots but cannot see the decay schedule.
Where: `components/pricing/price-badge.tsx` (renders dots), `lib/pricing/resolve-price.ts` (computes confidence)
Persona impact: Arthur sees a confidence rating he can't verify. Minor compared to the overhead gap, but violates his "see every variable" principle.
Required fix: Add the decay schedule to the price badge tooltip: "75% confidence (price is 22 days old; decay: 0-3d=100%, 3-14d=90%, 14-30d=75%, 30-60d=50%)".
Scope class: REFINE

### WORKFLOW BREAK: medium -- No .xlsx native import

What: All import surfaces accept CSV, not Excel .xlsx format. Vendor catalog import notes "XLSX/PDF import comes next" (`components/vendors/vendor-catalog-import.tsx:273`).
Where: All import components under `components/import/`
Persona impact: Arthur must "Save As CSV" from Excel for every import. This is a speed bump, not a wall, but it signals "this tool wasn't built for Excel users."
Required fix: Add client-side xlsx parsing via SheetJS (already an established library). Convert to internal CSV format before server processing. One shared utility, all import surfaces benefit.
Scope class: EXPAND

### Failure Summary

| Category        | Critical | High | Medium |
| --------------- | -------- | ---- | ------ |
| BLOCKER         | 1        | 0    | 0      |
| MONEY RISK      | 0        | 0    | 0      |
| DATA DEAD-END   | 0        | 0    | 1      |
| TRUST VIOLATION | 0        | 0    | 0      |
| WORKFLOW BREAK  | 0        | 2    | 2      |

---

## 5. REQUIRED ADDITIONS

### Quick Wins (< 2 hours each)

1. **Expose confidence decay schedule in price badge tooltip** -- Modify `components/pricing/price-badge.tsx` tooltip to include the decay schedule text. Resolves: confidence decay data dead-end. Scope: REFINE

2. **Add "Show formulas" toggle to menu cost breakdown** -- Add boolean toggle to `components/culinary/menu-breakdown-view.tsx` that renders the multiplication formula per ingredient row. Resolves: inline formula audit trail. Scope: REFINE

3. **Add recipe cost CSV export button** -- Add `exportRecipeCostBreakdown()` to `lib/exports/actions.ts`, render "Export CSV" on `/recipes/[id]`. Resolves: recipe cost export workflow break. Scope: EXPAND

### Medium Builds (2-8 hours each)

4. **Configurable overhead % and labor rate in pricing settings** -- Add DB columns to `chef_pricing_config`, update `components/settings/pricing-config-form.tsx`, thread values through `lib/pricing/plate-cost-actions.ts` and `lib/formulas/true-plate-cost.ts`. Resolves: BLOCKER (hardcoded defaults). Scope: REFINE

5. **Menu cost breakdown CSV export** -- Add `exportMenuCostBreakdown(menuId)` to `lib/exports/actions.ts`. Full tree: course > dish > component > ingredient with qty, unit cost, extended cost, food cost %. Button on `/menus/[id]`. Resolves: recipe/ingredient cost export. Scope: EXPAND

6. **Standalone ingredient price CSV import** -- Add `ingredients` mode to Smart Import Hub. Accept name, category, unit, price. Upsert with chef pricing override. Resolves: ingredient price import. Scope: EXPAND

### Large Builds (> 8 hours each)

7. **Native .xlsx import across all import surfaces** -- Integrate SheetJS for client-side xlsx-to-CSV conversion. One shared utility (`lib/migration/xlsx-parser.ts`) used by all import components. Spec needed: no (straightforward library integration). Resolves: .xlsx workflow break. Scope: EXPAND

8. **"Audit Mode" for all costing surfaces** -- System-wide toggle that switches costing views from "result only" to "result + formula + inputs." Applies to: menu cost breakdown, true plate cost, recipe cost, pricing breakdown. This is the nuclear option for Arthur's trust requirement. Spec needed: yes (touches 6+ components). Resolves: formula visibility across all surfaces. Scope: EXPAND

### Out-of-Scope (documented, not planned)

9. **Custom formula builder / pivot tables** -- Arthur wants Excel-level formula creation (define his own calculations, reference cells, build custom reports). This would require building a spreadsheet engine inside ChefFlow. ChefFlow is a workflow tool, not a spreadsheet replacement. Arthur would need to export data to Excel for custom analysis. OUT-OF-SCOPE.

10. **Excel-native round-trip editing** -- Open ChefFlow data in Excel, edit, sync back. This is a fundamentally different product (collaborative spreadsheet). OUT-OF-SCOPE.

### Deduplication Check

- Items 4 (overhead/labor config) and 6 (ingredient import): not in `docs/product-blueprint.md` or `docs/specs/`. New work.
- Item 7 (.xlsx import): vendor catalog import component already notes "XLSX/PDF import comes next" -- planned but no spec.
- Item 8 (audit mode): not planned anywhere. New concept surfaced by this persona.
- Items 1-3, 5: not planned. New work.

---

## 6. SYSTEM BEHAVIOR REQUIREMENTS

```
BEHAVIOR: Formula-on-demand visibility
  Rule: Every surface that displays a computed cost MUST offer a mechanism to see
        the formula that produced it. Either inline toggle or hover/popover.
  Trigger: Any component rendering output from resolve-price, true-plate-cost,
           menu-intelligence-actions, or food-cost-calculator.
  Violation example: Menu breakdown shows "$16.09" for an ingredient with no way
                     to see "2.5 lb x $4.29/lb x 1.5 = $16.09".
  Test: Navigate to /menus/[id], expand cost breakdown to ingredient level.
        Verify each ingredient row has a formula disclosure mechanism.
```

```
BEHAVIOR: Chef-configurable costing parameters
  Rule: Any costing default that varies by chef (overhead %, labor rate, Q-factor,
        target margin) MUST be configurable in /settings/pricing. Hardcoded defaults
        are initial values only.
  Trigger: True plate cost calculation, pricing engine quote generation, food cost
           target comparisons.
  Violation example: True plate cost shows overhead at 15% for a chef whose actual
                     overhead is 22%.
  Test: Set overhead to 22% in settings. Navigate to any event's plate cost
        breakdown. Verify overhead line uses 22%, not 15%.
```

```
BEHAVIOR: AI-free default path
  Rule: Every core workflow (create event, build menu, cost recipe, generate quote,
        send invoice) MUST be completable without any AI feature firing. AI features
        are acceleration, never required.
  Trigger: Any workflow that could route through Ollama/Remy.
  Violation example: Recipe import ONLY works via AI parsing with no manual fallback.
  Test: Disable Ollama. Complete full event lifecycle from inquiry to invoice.
        Verify zero AI errors block progress.
```

```
BEHAVIOR: CSV export parity
  Rule: Any data the chef enters or the system computes MUST be exportable to CSV.
        If a chef can see it on screen, they can get it in a spreadsheet.
  Trigger: Any data view, report, or breakdown surface.
  Violation example: Menu cost breakdown is visible on screen but cannot be exported.
  Test: For each major data surface (recipes, menus, ingredients, events, finances),
        verify a CSV export action exists and produces all visible columns.
```

```
BEHAVIOR: Import format tolerance
  Rule: Import surfaces SHOULD accept both CSV and XLSX. At minimum, CSV paste from
        Excel (tab-separated) must work without reformatting.
  Trigger: Any import component.
  Violation example: Chef pastes tab-separated data from Excel and the parser fails
                     because it only handles comma-separated.
  Test: Copy a range from Excel, paste into CSV import textarea. Verify auto-detection
        of tab delimiter works (lib/migration/csv-parser.ts has this).
```

---

## 7. SCORE

### Score Card

| Dimension                  | Score      | Justification                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow Coverage (30%)    | 62         | Full lifecycle completable, but costing uses wrong overhead/labor defaults (BLOCKER), recipe cost export missing, ingredient price import missing. Three workflow breaks in the core costing path.                                                                                                                    |
| Data Model Fit (20%)       | 82         | Excellent: integer cents, immutable ledger, 10-tier price resolution with provenance, per-ingredient cost tracking, component-level scaling. Data model captures everything Arthur needs; the gap is UI exposure, not data structure.                                                                                 |
| UX Alignment (15%)         | 50         | Arthur thinks in spreadsheet cells with visible formulas. ChefFlow presents data in cards, charts, and collapsible trees. Station clipboard is Excel-like (best surface for this persona). Costing help popovers show formulas but require clicks. Pricing breakdown text is close to an audit trail but not tabular. |
| Financial Accuracy (15%)   | 78         | Integer math (zero floating-point), immutable ledger, CPA-ready export, break-even calculator with scenarios. Capped from 85 because hardcoded overhead/labor defaults mean plate cost numbers are wrong for any chef not matching the defaults.                                                                      |
| Onboarding Viability (10%) | 48         | CSV import for recipes/clients/events/payments exists. But no .xlsx, no ingredient price import, no master ingredient list import. Arthur's first day is fighting file formats instead of experiencing value.                                                                                                         |
| Retention Likelihood (10%) | 55         | Financial ledger and price provenance would win Arthur's trust over time. But the overhead/labor gap means his costing numbers are always wrong, driving him back to Excel for the one thing he cares most about. Partial adopter at best until BLOCKER is fixed.                                                     |
| **FINAL SCORE**            | **63/100** | **USABLE**                                                                                                                                                                                                                                                                                                            |

**Scoring notes:**

- BLOCKER (hardcoded overhead/labor) caps Workflow Coverage at max 69 (below 49 threshold waived because the blocker affects costing precision, not workflow completability; Arthur CAN complete the workflow, he just doesn't trust the numbers)
- 4 PARTIAL domains (Menu & Recipe, Culinary Ops, Financial [note: rated SUPPORTED in audit but financial accuracy score reflects the overhead gap], Analytics) -- below the 5-PARTIAL cap threshold
- No MISSING domains

---

## 8. VERDICT

Arthur Klein would become a **partial adopter** of ChefFlow today. The financial ledger (integer math, immutable, CPA-ready) and price intelligence (10-tier resolution, store provenance, confidence scoring) are genuinely better than his Excel sheets. But the hardcoded overhead % and labor rate in true plate cost, combined with no recipe cost CSV export and no inline formula visibility, mean he would maintain parallel Excel sheets for the one domain he cares most about: costing. The single highest-impact change is **making overhead % and hourly labor rate configurable in `/settings/pricing`** -- this is a REFINE-level fix (add 2 fields to an existing config table and thread them through 2 functions) that would unlock the entire costing pipeline for precision-focused chefs. With that fix plus recipe cost CSV export, Arthur's score jumps to ~75 (STRONG).
