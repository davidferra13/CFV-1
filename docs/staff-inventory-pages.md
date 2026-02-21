# Staff & Inventory Page Routes

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

## Summary

Added 10 new page routes for the Staff and Inventory sections, wiring existing server actions and client components into production-ready server component pages.

## Staff Pages (5)

### 1. `/staff/schedule` — Staff Schedule
- **File:** `app/(chef)/staff/schedule/page.tsx`
- **Actions:** `getCalendarEvents`, `listStaffMembers`, `getEventStaffRoster`
- **Component:** `DragSchedule` (click-to-assign weekly grid)
- **Behavior:** Fetches current week's events, resolves staff assignments per event, passes to the drag-schedule component. Shows empty state with link to Staff Roster when no staff exist.

### 2. `/staff/availability` — Staff Availability
- **File:** `app/(chef)/staff/availability/page.tsx`
- **Actions:** `listStaffMembers`, `getStaffAvailabilityGrid`
- **Component:** `AvailabilityGrid` (toggle grid, staff x dates)
- **Behavior:** Fetches next 7 days of availability data, transforms grid rows into flat availability records matching the component's expected shape.

### 3. `/staff/clock` — Clock In/Out
- **File:** `app/(chef)/staff/clock/page.tsx`
- **Actions:** `listStaffMembers`, `getClockEntries`
- **Component:** `ClockPanel` (real-time clock in/out interface)
- **Behavior:** Fetches active clock entries and staff list. Maps to ClockPanel's expected entry shape.

### 4. `/staff/performance` — Staff Performance
- **File:** `app/(chef)/staff/performance/page.tsx`
- **Actions:** `getStaffPerformanceBoard`
- **Component:** `PerformanceBoard` (sortable table)
- **Behavior:** Fetches computed performance scores (on-time rate, cancellations, avg rating, total events).

### 5. `/staff/labor` — Labor Dashboard
- **File:** `app/(chef)/staff/labor/page.tsx`
- **Actions:** `getLaborByMonth` (called for each month of current year)
- **Component:** `LaborDashboard` (chart + detail table)
- **Behavior:** Fetches labor data for each month of the current year in parallel, builds chart series (labor vs revenue with ratio), and extracts current month event-level detail.

## Inventory Pages (5)

### 6. `/inventory` — Inventory Landing
- **File:** `app/(chef)/inventory/page.tsx`
- **Actions:** `getParAlerts`
- **Component:** `ParAlertPanel` (below-par alerts grouped by vendor)
- **Behavior:** Hub page with par alerts prominently displayed when items are below par. Grid of navigation cards to sub-pages (counts, waste, vendor-invoices, food-cost).

### 7. `/inventory/counts` — Inventory Counts
- **File:** `app/(chef)/inventory/counts/page.tsx`
- **Actions:** `getInventoryCounts`
- **Component:** `InventoryCountForm` (mobile-friendly quantity update form)
- **Behavior:** Fetches all inventory counts, normalizes to the component's expected shape with par level indicators.

### 8. `/inventory/waste` — Waste Tracking
- **File:** `app/(chef)/inventory/waste/page.tsx`
- **Actions:** `getWasteDashboard`, `getWasteTrend`
- **Components:** `WasteDashboard` (analytics charts) + `WasteLogForm` (entry form)
- **Behavior:** Fetches waste summary by reason and 6-month trend, normalizes shapes. Includes inline WasteLogForm for adding new entries.

### 9. `/inventory/vendor-invoices` — Vendor Invoices
- **File:** `app/(chef)/inventory/vendor-invoices/page.tsx`
- **Actions:** `getVendorInvoices`
- **Components:** Inline table using `Card` and `Badge`
- **Behavior:** Lists invoices with status badges (pending/matched/disputed), invoice number, date, total, and item count. Each row links to individual invoice matching view.

### 10. `/inventory/food-cost` — Food Cost Analysis
- **File:** `app/(chef)/inventory/food-cost/page.tsx`
- **Actions:** `getEventFinancialSummaryFull`, raw Supabase query for recent events
- **Component:** `FoodCostVariance` (theoretical vs actual comparison table)
- **Behavior:** Fetches last 20 completed/in_progress events, gets financial summaries in parallel, computes variance for events with both projected and actual food costs.

## Architecture Compliance

All 10 pages follow the established patterns:
- Server Components (async function, no 'use client')
- `requireChef()` called first for auth + tenant scoping
- `export const metadata: Metadata` for SEO
- `Promise.all` with `.catch()` for graceful degradation
- `(supabase as any)` used for tables not yet in generated types
- Consistent layout: back link, h1 title, subtitle, content
- Empty states with guidance on next steps

## Navigation

All staff sub-pages include a back link to `/staff` (Staff Roster).
All inventory sub-pages include a back link to `/inventory`.
The inventory landing page provides card-based navigation to all sub-pages.
The staff schedule page includes quick links to `/staff/availability` and `/staff/labor`.
