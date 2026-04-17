# Restaurant Adoption Interrogation

**Purpose:** Expose every failure point when a restaurant (not private chef) adopts ChefFlow as their primary business platform. Each question targets a real architectural gap, maps to existing code, and forces a binary pass/fail answer. Questions are ordered by blast radius: foundational model breaks first, then operational gaps, then polish.

**Scope:** Owner-operator restaurants (10-60 seats, 2-15 staff). NOT institutional/chain. These operators share the same "one person doing everything" pain as private chefs but operate continuous daily service instead of event-based bookings.

**Principle:** ChefFlow already has ~60% of what restaurants need (inventory, commerce, staff, stations, HACCP, plate cost). This interrogation finds the 40% that breaks, bends, or lies when a restaurant tries to use it for real.

---

## Coverage Map

| Q    | Title                                  | Domain        | Priority | Verdict     |
| ---- | -------------------------------------- | ------------- | -------- | ----------- |
| RQ1  | Service Model Mismatch                 | Core Model    | P0       | **PASS**    |
| RQ2  | Revenue Without Events                 | Financial     | P0       | **PASS**    |
| RQ3  | Daily P&L Capability                   | Financial     | P0       | **PASS**    |
| RQ4  | Menu Pricing as Revenue Anchor         | Menu/Pricing  | P0       | **PASS**    |
| RQ5  | Inventory Continuity (Par Levels)      | Inventory     | P0       | **PASS**    |
| RQ6  | Multi-Staff Auth Model                 | Auth/Roles    | P0       | **PASS**    |
| RQ7  | Shift Scheduling Without Events        | Staff         | P1       | **PASS**    |
| RQ8  | Clock-In/Out for Daily Service         | Staff/Labor   | P1       | **PASS**    |
| RQ9  | Labor Cost as % of Revenue             | Financial     | P1       | **PASS**    |
| RQ10 | Food Cost % from Actual Sales          | Financial     | P1       | **PASS**    |
| RQ11 | Commerce Register as Primary POS       | Commerce      | P0       | **PARTIAL** |
| RQ12 | Table/Seating Management               | Operations    | P1       | **PARTIAL** |
| RQ13 | Daily Receiving Workflow               | Inventory     | P1       | **PARTIAL** |
| RQ14 | Waste Tracking at Service Scale        | Inventory/Ops | P1       | **PASS**    |
| RQ15 | Recipe Batch Scaling                   | Culinary      | P1       | **PASS**    |
| RQ16 | Station Assignment for Fixed Kitchen   | Operations    | P2       | **PASS**    |
| RQ17 | HACCP at Restaurant Volume             | Compliance    | P1       | **PASS**    |
| RQ18 | Client Model (Guests vs Regulars)      | Data Model    | P0       | **PASS**    |
| RQ19 | Dashboard Relevance for Restaurant     | UI            | P1       | **PASS**    |
| RQ20 | Archetype Preset Completeness          | Onboarding    | P2       | **PASS**    |
| RQ21 | Inquiry Pipeline for Walk-Ins          | Pipeline      | P2       | **PASS**    |
| RQ22 | Financial Reporting Period Alignment   | Financial     | P1       | **PASS**    |
| RQ23 | Vendor/Supplier Integration Depth      | Supply Chain  | P1       | **PARTIAL** |
| RQ24 | Prime Cost Calculation                 | Financial     | P0       | **PASS**    |
| RQ25 | Multi-Location / Prep Kitchen          | Architecture  | P2       | **PASS**    |
| RQ26 | Cover Count Tracking                   | Operations    | P1       | **PASS**    |
| RQ27 | Revenue Per Labor Hour                 | Analytics     | P1       | **PASS**    |
| RQ28 | 86'd Item Management                   | Operations    | P1       | **PASS**    |
| RQ29 | Tip Pool / Tip Distribution            | Staff/Finance | P1       | **PASS**    |
| RQ30 | Health Department Inspection Readiness | Compliance    | P2       | **PASS**    |

---

## Question Definitions

### RQ1: Service Model Mismatch

**Question:** Can a restaurant operate ChefFlow daily without creating fake "events" to represent regular service?

**Failure type:** architectural mismatch (core model assumes event-based work)

**Current state:** ChefFlow's entire lifecycle is event-centric: `draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed`. Financial summaries, ledger entries, labor assignment, menu assignment, and grocery lists all hang off `event_id`. A restaurant that serves lunch and dinner daily would need to create 730 events/year to model normal operations.

**Key files:**

- `lib/events/transitions.ts` (8-state FSM, all business logic rooted here)
- `lib/ledger/append.ts` (ledger entries require event_id or are tenant-global)
- `lib/staff/actions.ts` (staff assignment is per-event via `AssignStaffSchema`)
- `lib/menus/actions.ts` (menus assigned to events)

**Impact:** Without an alternative to event-as-atomic-unit, restaurants either (a) don't use ChefFlow for daily ops, or (b) create hundreds of fake events that pollute reporting and feel absurd.

**Build path:** Introduce a `service_period` concept (daily service, recurring shift, open-hours block) that can anchor labor, menus, sales, and inventory without the event FSM overhead. Events remain for catering/private dining. Service periods are the restaurant's daily unit.

**Pass criteria:** A restaurant user completes a full day of service (open, serve, close) without creating an event. Revenue, labor, food cost, and waste all record against the service period.

---

### RQ2: Revenue Without Events

**Question:** Can ChefFlow record and report revenue that doesn't originate from a quote/event/invoice chain?

**Failure type:** financial model gap

**Current state:** Revenue enters the system three ways: (1) Stripe payments tied to quotes/events, (2) manual ledger entries, (3) commerce register sales. The financial summary view (`event_financial_summary`) is event-scoped. `getTenantFinancialSummary()` aggregates all ledger entries but the dashboard and reporting surfaces assume event-driven income.

**Key files:**

- `lib/ledger/compute.ts` (tenant-wide aggregation exists but underused)
- `lib/commerce/sale-actions.ts` (commerce sales create ledger entries)
- `app/(chef)/financials/page.tsx` (financial dashboard)
- `app/(chef)/food-cost/revenue/page.tsx` (revenue reporting)

**Impact:** A restaurant doing $5K/day through the register has revenue data in the ledger but the dashboard, P&L, and financial reports may not surface it coherently because they're built around "how much did each event generate?"

**Build path:** Verify commerce register sales flow through to all financial reporting surfaces (P&L, dashboard metrics, tax exports). If not, identify which reports are event-only vs tenant-wide.

**Pass criteria:** $10,000 in commerce register sales over 5 days appears correctly in: dashboard revenue widget, monthly P&L, tax export, food cost % calculation.

---

### RQ3: Daily P&L Capability

**Question:** Can ChefFlow produce a daily profit and loss statement showing revenue, COGS, labor, and overhead for a single day of restaurant operations?

**Failure type:** reporting gap

**Current state:** `lib/finance/profit-loss-report-actions.ts` exists. `lib/reports/compute-daily-report.ts` exists. Need to verify: do they aggregate commerce sales + labor clock entries + inventory depletion + expenses into a single-day view?

**Key files:**

- `lib/reports/compute-daily-report.ts`
- `lib/finance/profit-loss-report-actions.ts`
- `lib/finance/food-cost-actions.ts`
- `lib/staff/labor-dashboard-actions.ts`

**Impact:** Restaurants live and die by daily P&L. A restaurant owner needs to know "did I make money today?" every single day. If ChefFlow can't answer this, it's not a restaurant platform.

**Build path:** Verify daily report computes: (1) total register sales, (2) total labor cost from clock entries, (3) COGS from inventory depletion or plate cost \* covers, (4) daily fixed overhead allocation. If any component is missing, wire it in.

**Pass criteria:** End of day: owner sees one screen showing gross revenue, COGS, labor cost, overhead, and net profit for today. All numbers sourced from real data, not estimates.

---

### RQ4: Menu Pricing as Revenue Anchor

**Question:** Does ChefFlow support fixed menu items with set prices that directly feed food cost calculations, or is pricing only quote-based?

**Failure type:** pricing model mismatch

**Current state:** `lib/finance/plate-cost-calculator.ts` and `lib/finance/plate-cost-actions.ts` exist. `lib/formulas/true-plate-cost.ts` exists. Commerce products (`lib/commerce/product-actions.ts`) have `priceCents` and `costCents` fields. Menus have dish-level pricing. The question is whether these connect: does selling a $28 entree through the register automatically compare against its plate cost?

**Key files:**

- `lib/commerce/product-actions.ts` (products have price + cost)
- `lib/finance/plate-cost-calculator.ts`
- `lib/formulas/true-plate-cost.ts`
- `lib/menus/menu-engineering-actions.ts` (menu engineering analysis)

**Impact:** A restaurant with 40 menu items needs plate cost tracked per item, compared to selling price, aggregated to category-level and menu-level food cost %. Without this loop closed, food cost analysis is manual.

**Build path:** Verify: when a commerce product linked to a recipe sells, does food cost % update automatically? If `costCents` on the product is static, it's not real food cost (ingredient prices change). Need dynamic plate cost from recipe ingredients feeding into product cost.

**Pass criteria:** Chef changes price of an ingredient in the catalog. Every menu item using that ingredient shows updated food cost % without manual recalculation. Register sales for those items report accurate margins.

---

### RQ5: Inventory Continuity (Par Levels)

**Question:** Does ChefFlow's inventory system support par levels, automatic reorder alerts, and daily receiving for continuous restaurant operations?

**Failure type:** inventory model gap (event-based shopping vs continuous stock)

**Current state:** Inventory pages exist: `app/(chef)/inventory/` with counts, audits, waste, POs, expiry, reorder, transactions, locations. `app/(chef)/inventory/reorder/page.tsx` and `reorder-settings-client.tsx` exist. Need to verify: are par levels configurable per item? Do reorder alerts fire automatically? Does the receiving workflow (PO -> delivery -> stock update) work end-to-end?

**Key files:**

- `app/(chef)/inventory/reorder/reorder-settings-client.tsx`
- `app/(chef)/inventory/counts/page.tsx`
- `app/(chef)/inventory/purchase-orders/` (full PO workflow)
- `lib/inventory/variance-alert-actions.ts`

**Impact:** Restaurants order 3-5x per week from multiple vendors. Without par levels and automated reorder points, the inventory system is just a ledger, not an operational tool.

**Build path:** Verify: (1) per-item par level setting exists, (2) when stock falls below par, alert fires, (3) PO creation from reorder alert works, (4) receiving a PO updates stock quantities, (5) daily count entry works for high-variance items.

**Pass criteria:** Set par level for chicken breast at 20 lbs. Stock depletes to 8 lbs through sales. System alerts "below par" and offers one-click PO to preferred vendor. PO is received, stock updates to 28 lbs.

---

### RQ6: Multi-Staff Auth Model

**Question:** Can multiple staff members log into ChefFlow simultaneously with role-appropriate permissions (chef/owner sees everything, line cook sees station, server sees orders)?

**Failure type:** authorization architecture gap

**Current state:** Auth model is single-tenant-owner. `requireChef()` gates everything. Staff members exist in `staff_members` table but they're records, not users with logins. `lib/staff/staff-portal-actions.ts` exists, suggesting some staff-facing views. `lib/staff/permissions/` or `permission-matrix-client.tsx` exists.

**Key files:**

- `lib/auth/get-user.ts` (requireChef, requireClient, requireAuth)
- `lib/staff/staff-portal-actions.ts`
- `app/(chef)/staff/permissions/permission-matrix-client.tsx`
- `lib/team/team-management.ts`
- `lib/devices/token.ts` (device-based access?)

**Impact:** A 10-person restaurant cannot function if only the owner has app access. Line cooks need station views. Servers need order entry. Managers need reports. If staff are records-only (no login), ChefFlow is a solo tool, not a restaurant platform.

**Build path:** Verify: (1) can a staff member authenticate independently? (2) What views do they access? (3) Is tenant scoping maintained when multiple staff are logged in? (4) Does the permission matrix actually gate features?

**Pass criteria:** Owner, manager, and line cook all logged in simultaneously. Owner sees full dashboard. Manager sees P&L + staff. Line cook sees only their station and prep list. No cross-tenant data leakage.

---

### RQ7: Shift Scheduling Without Events

**Question:** Can shifts be created for recurring daily schedules (Mon-Fri lunch, Tue-Sat dinner) without tying each shift to an event?

**Failure type:** scheduling model gap

**Current state:** `CreateShiftSchema` in `lib/staff/staff-scheduling-actions.ts` has `event_id: z.string().uuid().nullable().optional()`. Event is nullable. Availability tracking exists with `day_of_week` support. Recurring patterns seem possible.

**Key files:**

- `lib/staff/staff-scheduling-actions.ts` (shift CRUD, event_id optional)
- `lib/staff/availability-actions.ts`
- `lib/scheduling/recurring-actions.ts`

**Impact:** Restaurants schedule weekly: Mon-Fri 10am-3pm (lunch), Tue-Sat 5pm-11pm (dinner). If shifts must be manually created daily, scheduling is unusable at restaurant volume.

**Build path:** Verify: (1) shift templates for recurring schedules exist, (2) weekly schedule can auto-generate daily shifts from template, (3) schedule view shows week-at-a-glance for all staff. If not, build recurring shift templates.

**Pass criteria:** Create a weekly template: "Dinner shift, Tue-Sat, 4pm-11pm." System generates 5 shifts for next week, pre-assigned to available staff. Manager adjusts one shift (swap a cook). Template persists for future weeks.

---

### RQ8: Clock-In/Out for Daily Service

**Question:** Does the clock-in/out system work for restaurant-scale daily use (10+ staff, 2 shifts, GPS optional)?

**Failure type:** scale/UX gap

**Current state:** `lib/staff/clock-actions.ts` has full clock-in/out with GPS, event linkage (optional), and `EventClockSummary` for labor cost per event. Clock entries have `staffMemberId`, `clockInAt`, `clockOutAt`, `totalMinutes`.

**Key files:**

- `lib/staff/clock-actions.ts`
- `lib/staff/labor-dashboard-actions.ts`
- `app/(chef)/staff/live/page.tsx` (live staff view)

**Impact:** Restaurant uses clock-in/out 20+ times per day (10 staff x 2 events each: clock in, clock out). If the flow is more than 2 taps, staff won't use it. If GPS is required (no WiFi in kitchen), it fails.

**Build path:** Verify: (1) clock-in is 1-2 taps max, (2) GPS is optional (not required), (3) live view shows who's clocked in right now, (4) break tracking exists or is unnecessary, (5) overtime calculation works.

**Pass criteria:** 10 staff clock in for dinner service. Owner sees live "who's here" board. 3 staff clock out early for split shift. End of night: total labor hours and cost calculate correctly. No GPS-related failures on kitchen devices.

---

### RQ9: Labor Cost as % of Revenue

**Question:** Does ChefFlow compute labor cost as a percentage of revenue in real-time for the current day/week/period?

**Failure type:** missing KPI

**Current state:** `LaborRevenueRatioResult` type exists in `lib/staff/labor-dashboard-actions.ts` with fields: `totalLaborCostCents`, `totalRevenueCents`, `laborPercentage`. This looks purpose-built.

**Key files:**

- `lib/staff/labor-dashboard-actions.ts` (has the computation)
- `app/(chef)/staff/live/page.tsx` (live view)
- `lib/analytics/benchmark-actions.ts`

**Impact:** Restaurant industry lives by the 30% labor rule. If this metric isn't visible in real-time (during service), the owner can't make on-the-floor decisions like sending someone home early.

**Build path:** Verify: (1) `laborPercentage` is computed from actual clock hours \* rate vs actual register revenue, (2) it updates during service (not end-of-day only), (3) it's visible on the dashboard or live staff view.

**Pass criteria:** During dinner service, owner checks dashboard. Sees "Labor: 34% ($1,200 / $3,500)". Sends one server home. Percentage updates within 15 minutes.

---

### RQ10: Food Cost % from Actual Sales

**Question:** Does ChefFlow compute food cost % from actual sales data (not theoretical plate cost \* projected covers)?

**Failure type:** accuracy gap (theoretical vs actual food cost)

**Current state:** Plate cost calculator exists (`lib/finance/plate-cost-calculator.ts`). Menu engineering exists. Food cost actions exist. Commerce register tracks sales with cost data. The question: does actual food cost % = (inventory used / revenue) vs theoretical = (sum of plate costs / revenue)?

**Key files:**

- `lib/finance/food-cost-actions.ts`
- `lib/finance/food-cost-calculator.ts`
- `lib/analytics/cost-trends.ts`
- `lib/inventory/variance-alert-actions.ts`

**Impact:** Theoretical food cost says 28%. Actual food cost (after waste, theft, portioning errors) is 35%. The 7% gap is where restaurants lose money. If ChefFlow only shows theoretical, the number lies.

**Build path:** Verify: (1) inventory depletion tracks actual usage, (2) waste entries reduce available stock, (3) actual COGS = opening inventory + purchases - closing inventory, (4) this is compared against register revenue. If only theoretical exists, flag as P0 gap.

**Pass criteria:** Week 1: theoretical food cost 28%, actual food cost 33%. Owner sees both numbers side-by-side. Variance of 5% is flagged with "check portioning, waste, or unrecorded usage."

---

### RQ11: Commerce Register as Primary POS

**Question:** Is the commerce register robust enough to be a restaurant's ONLY point-of-sale system (speed, reliability, offline capability, receipt printing)?

**Failure type:** feature completeness for critical-path use

**Current state:** Full commerce register exists: `app/(chef)/commerce/register/page.tsx` with checkout, cash drawer management, sales history, settlements. API routes for register, checkout, items, refunds, payments. Kiosk API routes exist.

**Key files:**

- `app/(chef)/commerce/register/page.tsx`
- `app/api/v2/commerce/register/` (full CRUD + cash drawer)
- `app/api/v2/commerce/checkout/route.ts`
- `app/api/kiosk/order/checkout/route.ts`
- `app/(chef)/commerce/table-service/page.tsx`

**Impact:** If the register is a side feature (popup market, food truck), it's fine as-is. If it's the primary POS for a restaurant doing 100+ transactions/day, it must be bulletproof: sub-second response, offline resilience, printer integration, split checks, modifiers, and kitchen ticket routing.

**Build path:** Stress test: (1) create 50 transactions in rapid succession, (2) verify receipt generation, (3) verify cash drawer reconciliation, (4) test with network interruption, (5) verify kitchen display/ticket integration.

**Pass criteria:** 100-cover dinner service simulated through register. All transactions recorded. Cash drawer balances. Sales report matches transaction sum. No dropped orders.

---

### RQ12: Table/Seating Management

**Question:** Does ChefFlow have table management (floor plan, table status, server assignment, wait time estimation)?

**Failure type:** missing feature for dine-in restaurants

**Current state:** `app/(chef)/commerce/table-service/page.tsx` exists. Need to verify what it does.

**Key files:**

- `app/(chef)/commerce/table-service/page.tsx`

**Impact:** Dine-in restaurants (not counter service or takeout-only) need table management. Without it, host/hostess can't seat, servers can't be assigned sections, and turn time is invisible.

**Build path:** Verify table service page functionality. If it's a stub: document what's needed (table grid, status tracking, server assignment, turn time display). If it exists: verify it connects to register sales and cover counting.

**Pass criteria:** Host seats party of 4 at Table 7. Server assigned. Order placed through register tagged to Table 7. Table status shows "occupied" -> "check dropped" -> "cleared." Turn time recorded.

---

### RQ13: Daily Receiving Workflow

**Question:** When a restaurant receives a delivery, can they check it in against a PO and update inventory in under 2 minutes?

**Failure type:** UX bottleneck on critical daily workflow

**Current state:** PO system exists: `app/(chef)/inventory/purchase-orders/` with create, detail, and list views. Receiving workflow implied by PO status.

**Key files:**

- `app/(chef)/inventory/purchase-orders/[id]/po-detail-client.tsx`
- `app/(chef)/inventory/purchase-orders/new/create-po-client.tsx`
- `app/(chef)/inventory/transactions/transaction-ledger-client.tsx`

**Impact:** Restaurants receive 3-5 deliveries/day. If checking in a 20-item delivery takes 10 minutes of data entry, nobody will do it. The inventory system becomes fiction.

**Build path:** Verify: (1) PO shows expected items with quantities, (2) receiving allows "accept all" or line-by-line adjustments, (3) accepted items auto-update stock, (4) price variances are flagged, (5) mobile-friendly for use at the back door.

**Pass criteria:** 20-item delivery from Sysco. PO exists. Manager taps "receive," adjusts 2 items (short-shipped), accepts rest. Stock updates immediately. Price variance on salmon flagged. Total time: under 90 seconds.

---

### RQ14: Waste Tracking at Service Scale

**Question:** Can restaurant staff log waste in real-time during service without leaving their station?

**Failure type:** adoption barrier (tracking exists but workflow too slow)

**Current state:** `app/(chef)/stations/waste/page.tsx` and `app/(chef)/inventory/waste/page.tsx` exist. `lib/events/waste-tracking-actions.ts` exists.

**Key files:**

- `app/(chef)/stations/waste/page.tsx`
- `app/(chef)/inventory/waste/page.tsx`
- `lib/events/waste-tracking-actions.ts`

**Impact:** Waste tracking only works if it's frictionless. A line cook who burned 2 steaks isn't going to navigate 3 screens to log it. It needs to be 2 taps from the station view.

**Build path:** Verify: (1) waste entry from station view, (2) quick-log (select item, enter quantity, reason), (3) aggregates to daily waste report, (4) feeds into actual vs theoretical food cost variance.

**Pass criteria:** Line cook at grill station. Burns 2 ribeyes. Taps waste icon on station view, selects "ribeye", enters "2", reason "overcooked." Logged in under 10 seconds. End of day: waste report shows $96 in waste, contributes to food cost variance.

---

### RQ15: Recipe Batch Scaling

**Question:** Can a recipe scale from 1 portion to 50 portions with correct yield adjustments (not just linear multiplication)?

**Failure type:** culinary accuracy gap

**Current state:** Recipes exist with ingredients. `lib/formulas/true-plate-cost.ts` handles per-portion cost. Need to verify: does scaling exist? Does it handle non-linear scaling (you don't need 50x the salt for 50 portions)?

**Key files:**

- `lib/formulas/true-plate-cost.ts`
- `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
- `lib/documents/generate-grocery-list.ts`

**Impact:** A restaurant making 50 portions of soup daily needs batch recipes. Linear scaling is wrong for many ingredients (spices, fats, leavening agents). Without yield-aware scaling, recipes produce wrong quantities.

**Build path:** Verify: (1) recipe has yield/portions field, (2) scaling multiplier exists in UI, (3) shopping list generation uses scaled quantities. Non-linear scaling (yield factors per ingredient) is a P2 enhancement.

**Pass criteria:** Recipe: tomato bisque, serves 4. Scale to 40 servings. Ingredient quantities multiply by 10. Shopping list shows scaled quantities. Plate cost per portion stays accurate.

---

### RQ16: Station Assignment for Fixed Kitchen

**Question:** Do stations work for a permanent kitchen layout (grill, saute, garde manger, pastry, expo) vs event-based temporary setup?

**Failure type:** model mismatch (temporary vs permanent stations)

**Current state:** `app/(chef)/stations/` has daily ops, clipboard, orders, waste, ops log. Stations seem to persist.

**Key files:**

- `app/(chef)/stations/[id]/page.tsx`
- `app/(chef)/stations/daily-ops/page.tsx`
- `lib/stations/daily-ops-actions.ts`

**Impact:** Restaurant stations are permanent. The grill station exists every day. A private chef's stations are temporary (set up at client's kitchen). If stations reset daily or must be re-created per event, it's wrong for restaurants.

**Build path:** Verify: (1) stations persist across days, (2) staff can be assigned to stations on recurring schedules, (3) station view shows today's prep, active orders, and waste for that station.

**Pass criteria:** "Grill Station" exists permanently. Monday: assigned to Chef Mike. Shows 5 prep items, receives live orders during service. Tuesday: assigned to Chef Ana. Same station, different staff, new prep list.

---

### RQ17: HACCP at Restaurant Volume

**Question:** Does the HACCP system support daily temp logs, corrective action tracking, and health department inspection export for restaurant-scale compliance?

**Failure type:** compliance depth gap

**Current state:** `lib/haccp/` has types, templates, and actions. HACCP plans with hazard analysis, CCPs, monitoring, corrective actions, verification. Templates per archetype (including restaurant).

**Key files:**

- `lib/haccp/types.ts` (full HACCP 7-principle structure)
- `lib/haccp/templates.ts` (archetype-specific templates)
- `lib/haccp/actions.ts`

**Impact:** Restaurants need daily temperature logs (walk-in, line, hot hold, receiving), corrective action documentation when temps are out of range, and exportable records for health department inspections. A HACCP plan that exists but has no daily log workflow is compliance theater.

**Build path:** Verify: (1) daily temp log entry interface exists, (2) out-of-range temps trigger corrective action prompt, (3) 90-day log export in format inspectors expect, (4) CCP monitoring frequencies match restaurant reality (every 2 hours for hot-hold).

**Pass criteria:** Line cook logs hot-hold temp at 138F (below 140F critical limit). System flags violation, requires corrective action entry ("reheated to 165F, returned to hot-hold at 2:15 PM"). Health inspector asks for 90-day temp logs. Owner exports PDF in 2 clicks.

---

### RQ18: Client Model (Guests vs Regulars)

**Question:** Does the client/guest data model work for restaurant use (regulars, walk-ins, reservations, dietary profiles) or is it built exclusively for private chef client relationships?

**Failure type:** data model mismatch

**Current state:** Clients table has full profiles: dietary restrictions, allergies, notes, communication preferences. Built for private chef's deep relationships (10-30 active clients). Restaurants have different pattern: 500+ unique guests/month, mostly anonymous, some regulars.

**Key files:**

- `lib/clients/actions.ts`
- `lib/clients/client-profile-actions.ts`
- `app/(chef)/clients/` (client management pages)

**Impact:** A restaurant doesn't need 500 full client profiles. They need: (1) regular recognition (VIPs, allergies on file), (2) reservation names, (3) walk-in anonymity. If the system forces full client creation for every guest, it's friction.

**Build path:** Verify: (1) can orders/sales exist without a client record? (2) Can a lightweight "guest" record capture name + allergy for a reservation without full client setup? (3) Are regulars auto-identified from repeat visits?

**Pass criteria:** Walk-in party orders without any client record. Regular "Mrs. Chen" has a profile with "shellfish allergy" that pops up when her reservation is seated. New reservation for "Johnson party of 6" creates minimal record. No forced full-profile creation for casual guests.

---

### RQ19: Dashboard Relevance for Restaurant

**Question:** Does the restaurant archetype dashboard show restaurant-relevant metrics (covers today, labor %, food cost %, revenue vs yesterday) instead of private-chef metrics (upcoming events, inquiry pipeline, travel)?

**Failure type:** UX irrelevance

**Current state:** Restaurant archetype in `lib/archetypes/presets.ts` defines enabled modules and nav. Dashboard sections are in `app/(chef)/dashboard/_sections/`. The dashboard may not adapt its widgets based on archetype.

**Key files:**

- `app/(chef)/dashboard/page.tsx`
- `app/(chef)/dashboard/_sections/` (all dashboard sections)
- `lib/archetypes/presets.ts` (restaurant archetype nav config)

**Impact:** A restaurant owner opening ChefFlow at 7 AM wants to see: "Yesterday: 142 covers, $8,200 revenue, 31% labor, 29% food cost. Today: 6 reservations, 3 prep tasks, 2 deliveries expected." If they see "3 inquiries pending, 1 event this week," ChefFlow feels like the wrong tool.

**Build path:** Verify: (1) dashboard widgets are archetype-aware, (2) restaurant archetype shows daily ops metrics, (3) event pipeline widgets hide for restaurants. If not: build restaurant dashboard configuration.

**Pass criteria:** Restaurant archetype user logs in. Dashboard shows: today's reservations, yesterday's cover count and revenue, current labor %, food cost % trend, prep tasks due, expected deliveries. Zero mention of "events" or "inquiries."

---

### RQ20: Archetype Preset Completeness

**Question:** Does selecting "Restaurant" archetype during onboarding produce a usable initial configuration, or does it leave critical modules disabled?

**Failure type:** onboarding gap

**Current state:** Restaurant archetype enables: `ALWAYS_ON` + `culinary`, `clients`, `commerce`. Primary nav includes `/commerce/register`, `/staff`, `/stations`, `/tasks`, `/schedule`.

**Key files:**

- `lib/archetypes/presets.ts:94-110`

**Impact:** If restaurant archetype doesn't enable inventory module, the restaurateur has to discover and enable it manually. First impression is "this doesn't have what I need."

**Build path:** Audit restaurant archetype against this question set. Every feature a restaurant needs daily should be enabled by default. Specifically verify: inventory, HACCP, vendor management, and staff scheduling are in `enabledModules`.

**Pass criteria:** New user selects "Restaurant." App immediately shows: dashboard with restaurant widgets, commerce register, staff management, inventory, stations, and culinary. No manual module activation needed for core restaurant workflows.

---

### RQ21: Inquiry Pipeline for Walk-Ins / Reservations

**Question:** Can the inquiry/booking pipeline be repurposed for restaurant reservations, or does it only work for event-style inquiries?

**Failure type:** pipeline model mismatch

**Current state:** Inquiry pipeline is built for "I want to hire a chef for my dinner party on March 15th." Restaurants need "Table for 4, Saturday 7pm" or OpenTable-style flow.

**Key files:**

- `lib/inquiries/public-actions.ts`
- `app/api/embed/inquiry/route.ts`
- `lib/booking/instant-book-actions.ts`
- `lib/booking/schedule-schema.ts`

**Impact:** If a restaurant can't take reservations through ChefFlow, they need a separate system (OpenTable, Resy) which fragments their operations. ChefFlow becomes "back of house only."

**Build path:** Instant book may already work for this. Verify: (1) can a public booking page accept date + time + party size? (2) Does it show availability? (3) Is there a table assignment flow? If instant book works, it's a UI relabeling. If not, it's a P1 feature gap.

**Pass criteria:** Guest visits restaurant's ChefFlow booking page. Selects "Saturday 7pm, 4 guests." Sees available slots. Books. Restaurant sees reservation in schedule. Guest gets confirmation.

---

### RQ22: Financial Reporting Period Alignment

**Question:** Do financial reports support restaurant accounting periods (4-4-5, fiscal calendar, weekly P&L) or only calendar month?

**Failure type:** reporting inflexibility

**Current state:** Financial reporting in `lib/finance/profit-loss-report-actions.ts` likely uses calendar months. Restaurant industry uses 4-4-5 accounting periods (13 four-week periods) for week-over-week comparability.

**Key files:**

- `lib/finance/profit-loss-report-actions.ts`
- `lib/finance/cash-flow-actions.ts`
- `lib/analytics/revenue-analytics.ts`

**Impact:** P2 for V1 (calendar month is usable). Becomes P1 when restaurants with accountants need period-based reporting.

**Build path:** Verify current period options. If monthly only, flag for future. Core data model (daily ledger entries) supports any period aggregation; it's a reporting layer concern.

**Pass criteria:** Owner generates P&L for "Week ending April 12." Report shows 7 days of revenue, COGS, labor, overhead, net. Comparable to previous week.

---

### RQ23: Vendor/Supplier Integration Depth

**Question:** Can a restaurant manage 5-10 regular vendors with price tracking, order history, and delivery scheduling?

**Failure type:** supply chain management gap

**Current state:** Vendor management exists. Price catalog exists with vendor price tracking. Calling system for vendor outreach. PO system exists. OpenClaw price intelligence exists.

**Key files:**

- `lib/vendors/sourcing-actions.ts`
- `lib/vendors/invoice-actions.ts`
- `lib/vendors/catalog-import-actions.ts`
- `app/(chef)/vendors/[id]/page.tsx`
- `lib/vendors/document-intake-actions.ts` (invoice parsing)

**Impact:** Restaurants order from the same 5-10 vendors weekly. They need: quick reorder from last PO, price change alerts, invoice matching against POs, and vendor payment tracking.

**Build path:** Verify: (1) vendor profiles track order history, (2) "reorder from last PO" exists, (3) price changes from vendor invoices flag automatically, (4) vendor spend reports available.

**Pass criteria:** Owner sees: "Sysco: $4,200/month, 3 orders this week, salmon up 12% from last month." Can duplicate last week's PO with 1 click. Invoice uploaded, auto-matched to PO, variance flagged.

---

### RQ24: Prime Cost Calculation

**Question:** Does ChefFlow compute prime cost (COGS + labor) as the key restaurant health metric?

**Failure type:** missing the single most important restaurant KPI

**Current state:** Food cost calculation exists. Labor cost calculation exists. Prime cost = food cost + labor cost. The question is whether they're combined and displayed together.

**Key files:**

- `lib/finance/food-cost-actions.ts`
- `lib/staff/labor-dashboard-actions.ts`
- `lib/finance/industry-benchmarks.ts`
- `lib/analytics/benchmark-actions.ts`

**Impact:** Restaurant industry standard: prime cost should be under 60% of revenue. If ChefFlow shows food cost (28%) and labor cost (30%) separately but never shows prime cost (58%), the owner misses the most important number.

**Build path:** Verify: (1) combined prime cost metric exists, (2) benchmarked against industry standard (60%), (3) visible on dashboard, (4) trend over time.

**Pass criteria:** Dashboard widget: "Prime Cost: 58% (Food 28% + Labor 30%)." Green/yellow/red indicator against 60% benchmark. Weekly trend line. Clicking drills into food cost and labor cost breakdowns.

---

### RQ25: Multi-Location / Prep Kitchen

**Question:** Can a restaurant with a prep kitchen and a service location track inventory and labor across both?

**Failure type:** multi-location architecture gap

**Current state:** `app/(chef)/inventory/locations/page.tsx` and `locations-client.tsx` exist. Staff can have `location_id`. Inventory may support multiple locations.

**Key files:**

- `app/(chef)/inventory/locations/page.tsx`
- `app/(chef)/inventory/locations/locations-client.tsx`
- `lib/staff/actions.ts` (location_id on staff)

**Impact:** P2 for V1 (single location works). Many restaurants have a commissary kitchen or prep kitchen separate from the restaurant. Inventory transfers between locations and location-specific labor tracking become necessary.

**Build path:** Verify: (1) multiple inventory locations can be created, (2) inventory counts are per-location, (3) transfers between locations are tracked, (4) labor/shifts are location-aware.

**Pass criteria:** Two locations: "Main Kitchen" and "Prep Kitchen." Chicken prep happens at prep kitchen (labor tracked there). Prepped chicken transfers to main kitchen (inventory transfer logged). Evening service at main kitchen (labor + sales tracked there).

---

### RQ26: Cover Count Tracking

**Question:** Does ChefFlow track daily cover counts (total guests served) as a core metric?

**Failure type:** missing fundamental restaurant metric

**Current state:** Events have guest counts. Commerce register tracks transactions. Cover count (number of individual meals served) is different from transaction count (one check can cover 4 guests).

**Key files:**

- `app/(chef)/commerce/register/page.tsx`
- `lib/commerce/sale-actions.ts`
- `lib/analytics/operations-analytics.ts`

**Impact:** Revenue per cover, food cost per cover, and labor cost per cover are baseline restaurant metrics. Without cover counts, these can't be computed.

**Build path:** Verify: (1) register sales can record party size / guest count, (2) daily cover total is aggregated, (3) revenue per cover is calculated. If not: add guest count field to register transactions.

**Pass criteria:** Dinner service: 45 transactions, 142 covers. Average check: $58. Revenue per cover: $18.50. Covers compared to same day last week (+8%).

---

### RQ27: Revenue Per Labor Hour

**Question:** Does ChefFlow compute revenue per labor hour (REVPASH/SPLH) as a real-time operational metric?

**Failure type:** missing high-leverage restaurant KPI

**Current state:** `LaborRevenueRatioResult` exists with labor %. Revenue per labor hour is the inverse perspective and equally important: "each labor hour generates $X in revenue."

**Key files:**

- `lib/staff/labor-dashboard-actions.ts`
- `lib/analytics/benchmark-actions.ts`

**Impact:** Industry benchmark: $35-$50 revenue per labor hour for full-service restaurants. This metric tells the owner if they're over- or under-staffed in real-time.

**Build path:** If labor hours and revenue are both tracked (they are), this is a division. Verify it's surfaced. If not: add to labor dashboard.

**Pass criteria:** Dashboard shows: "Revenue/Labor Hour: $42 (target: $40)." During slow Tuesday lunch, drops to $28, flagging overstaffing.

---

### RQ28: 86'd Item Management

**Question:** Can a kitchen 86 an item (mark as unavailable) and have it immediately reflected in the register/ordering system?

**Failure type:** real-time operational gap

**Current state:** No clear 86'd feature found. Commerce products may have an `available` toggle. Station view may not connect to register availability.

**Key files:**

- `lib/commerce/product-actions.ts` (product availability)
- `app/(chef)/stations/` (station operations)

**Impact:** Running out of an item during service is daily reality. If the kitchen 86's salmon but the register still sells it, the restaurant takes orders it can't fulfill.

**Build path:** Verify: (1) product has real-time availability toggle, (2) kitchen can 86 from station view, (3) register reflects 86'd items immediately (greyed out, badge, or hidden), (4) 86 is automatically lifted at next service period or manually restored.

**Pass criteria:** Kitchen 86's halibut at 8pm. Register immediately shows halibut as unavailable. Server can't ring it up. Kitchen restores it at 8:45pm when backup arrives. Register shows it available again. Total lag: under 5 seconds.

---

### RQ29: Tip Pool / Tip Distribution

**Question:** Can ChefFlow calculate and record tip distribution (pool, percentage-based, or tip-out) for staff at end of shift?

**Failure type:** payroll/compliance gap

**Current state:** No clear tip management found. Labor dashboard tracks hours and rates but tips are a separate compensation stream.

**Key files:**

- `lib/staff/labor-dashboard-actions.ts`
- `lib/staff/clock-actions.ts`
- `lib/finance/contractor-actions.ts`

**Impact:** Tip distribution is legally mandated and operationally complex. BOH/FOH splits, tip credit, tip pooling rules vary by state. Without this, restaurant must use a separate system for tips.

**Build path:** P2 for initial adoption (restaurants can handle tips offline). P1 for serious restaurant platform. Minimum viable: record total tips collected, distribute by hours-worked ratio, export for payroll.

**Pass criteria:** Dinner service: $1,400 in tips collected. Tip pool split: 70% FOH, 30% BOH. FOH server worked 6 hours of 20 total FOH hours. Gets $294 (6/20 \* $980). Exported to payroll summary.

---

### RQ30: Health Department Inspection Readiness

**Question:** Can ChefFlow generate a compliance packet (temp logs, HACCP plan, corrective actions, staff training records, allergen procedures) for a health department inspection on zero notice?

**Failure type:** compliance export gap

**Current state:** HACCP system exists. Temp log system likely exists within HACCP. Staff training not verified. Allergen tracking per client exists (dietary restrictions).

**Key files:**

- `lib/haccp/` (full HACCP system)
- `lib/compliance/data-export.ts`
- `app/(chef)/settings/protection/page.tsx`

**Impact:** Health inspectors arrive unannounced. A restaurant that can pull 90 days of temp logs, their HACCP plan, corrective action log, and allergen procedures in 5 minutes scores well. One that scrambles through paper binders scores poorly.

**Build path:** Verify: (1) one-click compliance export exists, (2) includes HACCP plan, temp logs, corrective actions, (3) date-range selectable, (4) PDF or printable format. If scattered: build a "Compliance Packet" export that bundles everything.

**Pass criteria:** Inspector at door. Owner taps "Export Compliance Packet" on phone. Selects last 90 days. PDF generates in under 30 seconds with: HACCP plan, daily temp logs, corrective actions taken, allergen matrix, staff food safety certifications.

---

## Dependency Graph

```
RQ1 (Service Model) ─────┬──> RQ2 (Revenue Without Events)
                          ├──> RQ7 (Shifts Without Events)
                          ├──> RQ8 (Clock-In/Out)
                          └──> RQ19 (Dashboard)

RQ2 (Revenue) ────────────┬──> RQ3 (Daily P&L)
                          ├──> RQ10 (Food Cost %)
                          └──> RQ24 (Prime Cost)

RQ5 (Inventory Par) ──────┬──> RQ13 (Receiving)
                          ├──> RQ14 (Waste)
                          └──> RQ10 (Food Cost %)

RQ6 (Multi-Staff Auth) ───┬──> RQ8 (Clock-In/Out)
                          ├──> RQ16 (Station Assignment)
                          └──> RQ29 (Tip Distribution)

RQ11 (POS Register) ──────┬──> RQ12 (Table Mgmt)
                          ├──> RQ26 (Cover Count)
                          └──> RQ28 (86'd Items)

RQ4 (Menu Pricing) ───────┬──> RQ10 (Food Cost %)
                          ├──> RQ15 (Batch Scaling)
                          └──> RQ24 (Prime Cost)
```

## Execution Strategy

**Phase 1 (Foundation, P0):** RQ1, RQ2, RQ6, RQ11, RQ4, RQ18, RQ24
These determine whether the core data model can support restaurants at all. If RQ1 fails (no service period concept), everything downstream is blocked.

**Phase 2 (Daily Operations, P1):** RQ3, RQ5, RQ7, RQ8, RQ9, RQ10, RQ13, RQ14, RQ17, RQ22, RQ23, RQ26, RQ27, RQ28, RQ29
These make ChefFlow usable for daily restaurant operations. Each is independently buildable once Phase 1 clears.

**Phase 3 (Polish, P2):** RQ12, RQ15, RQ16, RQ20, RQ21, RQ25, RQ30
These make ChefFlow competitive with dedicated restaurant software. Not blockers for adoption, but blockers for retention.

---

## What This Interrogation Proves (When All Pass)

A restaurant owner can:

1. Open ChefFlow and see a restaurant-relevant dashboard
2. Schedule staff for the week without creating events
3. Run daily service (open, clock in, serve, track sales, 86 items, close)
4. Track food cost, labor cost, and prime cost from real data
5. Manage inventory with par levels, receiving, and waste tracking
6. Pull compliance documents for health inspectors
7. Know if they made money today before they go home

Every answer is binary. Every failure maps to real code. Every build path improves the existing system.

---

## Investigation Results (2026-04-15)

All 30 questions investigated against live codebase. Results below.

### Scorecard

```
PASS:     26/30  (87%)   [was 25/30 after Sprint 2, 21/30 after Sprint 1, 14/30 before]
PARTIAL:   4/30  (13%)   [RQ11: POS offline/KDS, RQ12: table ordering/KDS, RQ13: no auto-PO from par, RQ23: PO-to-invoice matching]
FAIL:      0/30  (0%)
```

**By priority (post-Sprint 3):**

- P0 (7 questions): 7 PASS, 0 PARTIAL, 0 FAIL
- P1 (15 questions): 12 PASS, 3 PARTIAL, 0 FAIL
- P2 (8 questions): 7 PASS, 1 PARTIAL, 0 FAIL

**Sprint 2 changes:** RQ5 PARTIAL->PASS (inventory depletion already wired in checkout), RQ28 PARTIAL->PASS (86 toggle action + UI built), RQ29 FAIL->PASS (full tip management: entries, pool configs, 3 distribution methods, register auto-import).

**Sprint 3 changes:** RQ2 PARTIAL->PASS (archetype-aware hero metrics: restaurant dashboard shows today's revenue, staff on clock, MTD, open checks instead of event-centric metrics), RQ4 PARTIAL->PASS (product cost sync engine: cascadeIngredientPriceChange propagates through recipes to product_projections.cost_cents, flags events for cost review), RQ30 PARTIAL->PASS (health inspection export: HACCP plan + 90-day temp logs + corrective actions + allergen procedures + certifications + waste log + equipment in one packet).

### Biggest Surprise: ChefFlow Is Already ~70% Restaurant-Ready

The data model is far more flexible than the product blueprint suggests. Key discoveries:

1. **event_id is nullable everywhere that matters.** Ledger entries, shifts, clock entries, sales, menus all work without events. Events are an aggregation layer, not a foundation. RQ1 (the scariest question) is a clean PASS.

2. **Staff auth is built.** `requireStaff()` exists. Staff can authenticate independently. Permission matrix (16 domains x 5 actions) has UI built. Device-based auth with PIN exists. RQ6 is a clean PASS.

3. **Recipe scaling is smart, not linear.** Sub-linear exponents for spices/aromatics (0.75-0.90 power). Integrated into grocery list generation. RQ15 is a clean PASS.

4. **Stations persist permanently.** Daily ops snapshot via `clipboard_entries` table per component per station per date. Not event-reset. RQ16 is a clean PASS.

5. **HACCP is restaurant-grade.** Daily temp logging with auto-safe determination against FDA limits. Restaurant-specific templates. Corrective action prompts. Certification tracking. RQ17 is a clean PASS.

### The 6 FAILs (What Actually Needs Building)

| RQ       | What fails                              | Why it matters                                                                                                     | Build effort                                                                                 |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **RQ3**  | No daily P&L                            | Can't answer "did I make money today?" P&L is monthly aggregate. Daily sales report has revenue only, no costs.    | Medium: wire register revenue + inventory COGS + clock-entry labor into a daily summary view |
| **RQ10** | No actual food cost from register sales | Food cost is event-only. Register sales have no COGS. Theoretical vs actual gap invisible.                         | Medium: link product cost (from recipe) to register sales, compute actual vs theoretical     |
| **RQ19** | Dashboard not archetype-aware           | All chefs see same widgets. Restaurant owner sees inquiry pipeline instead of covers/labor%/food cost.             | Small: conditional widget rendering based on `getCachedChefArchetype()` (already loaded)     |
| **RQ24** | No prime cost metric                    | Food cost and labor cost exist separately. Never combined. The single most important restaurant number is missing. | Small: one computation (food + labor / revenue), one dashboard widget                        |
| **RQ27** | No revenue per labor hour               | Data exists (revenue + clock hours). Division not computed. Missing from dashboard.                                | Tiny: one computation, one display                                                           |
| **RQ29** | No tip distribution                     | Tips recorded in ledger but explicitly excluded from revenue. No pool/distribution system.                         | Medium: tip pool model, FOH/BOH split rules, per-staff distribution by hours worked          |

### The 10 PARTIALs (What Needs Finishing)

| RQ       | What's built                                                                                      | What's missing                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **RQ2**  | P&L combines 3 revenue streams (billing, commerce, order forms)                                   | Dashboard and reporting surfaces still assume event-driven income as primary                        |
| **RQ4**  | Products snapshot recipe cost. Inventory bridge exists (sale -> product -> recipe -> ingredients) | Cost is point-in-time snapshot, not dynamic. Ingredient price changes don't cascade to product cost |
| **RQ5**  | Par levels configurable per item. PO receiving works. 11 transaction types in ledger              | No auto-PO from par alerts. No register-to-inventory depletion for daily service                    |
| **RQ9**  | `LaborRevenueRatioResult` exists with labor %                                                     | Only works across event-linked revenue. Register revenue not included                               |
| **RQ11** | Modifiers, split checks, tips, cash drawer all work                                               | No offline resilience. No KDS. Table service incomplete. Untested at 100+ tx/day                    |
| **RQ12** | Zones, tables, dining checks exist                                                                | No per-table item ordering. No KDS integration. No reservation time slots                           |
| **RQ13** | Full PO lifecycle with partial/damaged handling                                                   | No suggested items from par alerts. No auto-reorder. Manual PO creation only                        |
| **RQ20** | Restaurant archetype enables core modules and nav                                                 | Stations module missing from `enabledModules` config. HACCP not in preset                           |
| **RQ23** | Vendor profiles with price tracking. Invoice creation                                             | No PO-to-invoice auto-matching. No "reorder from last PO" shortcut                                  |
| **RQ26** | Booking captures guest_count                                                                      | Register sales don't capture party size per transaction. No cover count aggregation                 |
| **RQ28** | Products have `availableQty` and `lowStockThreshold`                                              | No explicit 86 toggle. No station-to-register real-time sync                                        |
| **RQ30** | One-call data export exists. Temp logs + certifications work                                      | HACCP plans omitted from export packet. No "compliance packet" bundle                               |

### The 14 PASSes (What's Already Restaurant-Ready)

RQ1 (event-free operations), RQ6 (multi-staff auth), RQ7 (event-free shifts with recurring templates), RQ8 (2-tap clock-in, GPS optional, 30-sec live board), RQ14 (dual-surface waste tracking feeding food cost), RQ15 (smart recipe scaling), RQ16 (persistent stations with daily snapshots), RQ17 (restaurant-grade HACCP), RQ18 (anonymous sales, optional client profiles), RQ21 (instant book works for reservations), RQ22 (custom date range P&L), RQ25 (10 location types with transfers).

---

## Revised Build Plan

Based on investigation results, Phase 1 no longer blocks on RQ1/RQ6/RQ18 (all PASS). The critical path is now the **financial intelligence gap**: RQ3, RQ10, RQ24, RQ27.

### Sprint 1: Restaurant Financial Intelligence (1-2 weeks)

These are the 4 FAILs that share a common root: ChefFlow computes financials per-event but not per-day.

1. **Daily P&L view** (RQ3): Wire register revenue + inventory COGS + clock-entry labor into one daily summary
2. **Prime cost widget** (RQ24): Food cost % + labor cost % combined, benchmarked against 60%
3. **Revenue per labor hour** (RQ27): Trivial computation, surface on dashboard and labor view
4. **Actual food cost from register** (RQ10): Link product cost (recipe-sourced) to register sales. Show actual vs theoretical

**Shared dependency:** All 4 need register sales to carry cost data. The inventory bridge (`sale -> product -> recipe -> ingredients`) exists. Need to ensure `costCents` on products updates when recipe costs change, and that this flows into daily aggregation.

### Sprint 2: Restaurant Dashboard + POS Hardening (1 week)

1. **Archetype-aware dashboard** (RQ19): Conditional widget rendering. Restaurant sees covers/labor%/food cost instead of inquiry pipeline
2. **Register inventory depletion** (RQ5 partial): When a product sells, deduct ingredients from inventory via the existing bridge
3. **Cover count on register** (RQ26 partial): Add party size field to checkout flow
4. **86 toggle** (RQ28 partial): Real-time product availability toggle from station view, reflected in register

### Sprint 3: Operational Polish (1 week)

1. **Auto-PO from par alerts** (RQ5/RQ13): When stock drops below par, auto-draft PO to preferred vendor
2. **Dynamic product cost** (RQ4): When ingredient prices change, cascade to product `costCents`
3. **Tip distribution** (RQ29): Pool model, FOH/BOH split, per-staff distribution by hours
4. **Compliance packet export** (RQ30): Add HACCP plans to data export bundle
5. **Archetype preset fix** (RQ20): Add stations, HACCP to restaurant `enabledModules`

### Not Needed (Already Pass)

RQ1, RQ6, RQ7, RQ8, RQ14, RQ15, RQ16, RQ17, RQ18, RQ21, RQ22, RQ25: no work required.

### Estimated Total: 3-4 Weeks to Restaurant-Ready

- 6 FAILs to fix (4 financial, 1 dashboard, 1 tip distribution)
- 10 PARTIALs to complete (most are small: add a field, wire a computation, fix a config)
- 14 PASSes to leave alone
