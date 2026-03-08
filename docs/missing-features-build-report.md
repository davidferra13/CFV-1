# Missing Features Build Report

> Built 2026-03-08 on branch `feature/risk-gap-closure`

## Summary

After an aggressive full-codebase scan of 565+ pages, 450+ tables, 1086 components, 400+ server actions, and 145+ API routes, we identified 36 genuinely missing features (32 of the original 40 guesses already existed). Of those 36, 12 were immediately buildable and were implemented in parallel using git worktrees.

## What Was Built (12 Features)

### 1. Client Quick-Request Portal
- **Route:** `/client-requests` (chef side), `/my-events/request` (client side)
- **What:** Existing clients can request "dinner Thursday for 4" without the full inquiry flow
- **Migration:** `20260308000002_client_quick_requests.sql`
- **Actions:** `lib/client-requests/actions.ts` (create, get, convert to event, decline)
- **Dashboard:** Quick Requests stat card in Alert section

### 2. Equipment Packing Templates
- **Route:** `/packing-templates`
- **What:** Reusable packing lists by event type ("Intimate dinner" always needs X, Y, Z)
- **Migration:** `20260330000081_packing_templates.sql`
- **Actions:** `lib/packing/template-actions.ts`

### 3. Mobile Shopping Mode
- **Route:** `/shopping`, `/shopping/[id]`
- **What:** Mobile-optimized grocery shopping with 40px checkboxes, Wake Lock API, aisle grouping, receipt snap
- **Migration:** `20260330000080_shopping_lists.sql`
- **Actions:** `lib/shopping/actions.ts` (8 actions including createShoppingListFromEvent, toggleItem, convertToExpense)

### 4. Meal Prep Container Labels
- **Route:** `/meal-prep/labels`
- **What:** Printable labels with dish name, date, use-by, reheat instructions, allergen warnings, macros
- **Print:** CSS @media print stylesheet in globals.css
- **Actions:** `lib/meal-prep/label-actions.ts`

### 5. Revenue Per Hour Analysis
- **Route:** `/finance/revenue-per-hour`
- **What:** True hourly rate across all work types (not just service time). Includes charts (Recharts)
- **Actions:** `lib/finance/revenue-per-hour-actions.ts`

### 6. Pricing Calculator
- **Route:** `/finance/pricing-calculator`
- **What:** "I'm cooking a 4-course dinner for 8, driving 30 miles, spending $200. What should I charge?"
- **Pure logic:** `lib/finance/pricing-calculator.ts` (no server action, no AI, pure math)

### 7. Post-Service Cleanup Checklist
- **Component:** `PostServiceChecklistButton` on event Ops tab
- **What:** 19-item, 4-section checklist (Equipment, Kitchen, Documentation, Final). localStorage persistence
- **Visibility:** in_progress and completed events

### 8. One-Click Rebooking
- **Component:** `RebookButton` on client detail
- **What:** From cooling alerts, one click to pre-fill a new event with the client's last preferences
- **Actions:** `lib/clients/rebook-actions.ts`
- **Fix:** Created missing `lib/clients/cooling-alert.ts` module

### 9. Wine/Beverage Program
- **Route:** `/culinary/beverages`
- **What:** Beverage management, pairing notes per dish, drink recipes, beverage costing
- **Migration:** `20260308000003_beverages.sql`
- **Actions:** `lib/beverages/actions.ts`

### 10. Plating Guides
- **Route:** `/culinary/plating-guides`
- **What:** Per-dish visual references, garnish specifications, plate/vessel selection, staff communication
- **Migration:** `20260330000082_plating_guides.sql`
- **Actions:** `lib/recipes/plating-actions.ts`

### 11. Capacity Planning
- **Route:** `/analytics/capacity`
- **What:** Utilization %, burnout risk, what-if scenarios, day heatmap, weekly trends (6 Recharts components)
- **Pure logic:** `lib/analytics/capacity-planning.ts` (Formula > AI)
- **Actions:** `lib/analytics/capacity-actions.ts`
- **Dashboard:** CapacityWidget in Intelligence section

### 12. Focus Mode (built by other agent)
- **Migration:** `20260330000017_add_focus_mode.sql`
- **What:** Reduces nav to core features only, toggle in sidebar

## Integration Wiring

After parallel builds merged, the following integrations were wired:

### Nav Config (`nav-config.tsx`)
- Shopping Lists (Operations)
- Container Labels (Meal Prep sub-item)
- Packing Templates (Operations)
- Client Quick Requests (Clients)
- Pricing Calculator (Finance)
- Revenue Per Hour (Finance)
- Capacity Planning (Analytics)
- Beverages (Culinary, advanced)
- Plating Guides (Culinary, advanced)

### Dashboard
- QuickRequestsWidget in Alert cards (pending request count)
- CapacityWidget in Intelligence cards (utilization, burnout risk)

### Event Detail Page
- PostServiceChecklistButton on Ops tab (in_progress/completed events)
- Print Labels button in header (links to `/meal-prep/labels?eventId=...`)
- Fixed broken JSX on Grocery Quote button

### Migration Collisions Fixed
- `20260308000001` split into 000001 (segments), 000002 (quick_requests), 000003 (beverages)
- `20260330000077` split into 000077 (open_tables), 000081 (packing_templates), 000082 (plating_guides)

## Still Blocked (2 features)

- **Kitchen timers + unit converter** (Step 3): Designed to live inside focus mode
- **Course pacing tracker** (Step 4): Designed to live inside focus mode

Both blocked until focus mode fully lands from other agent thread.

## Not Built (24 features from brainstorm)

See `docs/missing-features-brainstorm.md` for the full list. The remaining 24 features are Tier 2-4 priority (nice-to-have, differentiation, future). None are critical for daily workflow.
