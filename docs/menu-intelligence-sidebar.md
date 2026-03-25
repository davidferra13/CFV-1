# Menu Intelligence Sidebar Widgets

**Date:** 2026-03-25
**What changed:** Three intelligence widgets added to the MenuDocEditor context sidebar.

## Overview

The menu engine has had powerful intelligence functions (`menu-intelligence-actions.ts`) since inception, but they were only accessible from the back-of-house detail view. Now they surface inline in the editor sidebar, where chefs actually build menus.

## Widgets Added

### 1. Budget Compliance (`BudgetComplianceWidget`)

- **Location:** Editor sidebar, after allergen conflict alert
- **Trigger:** Auto-loads when the menu is linked to an event with a quoted price
- **What it shows:** Food cost as a percentage of the quoted price, with ok/warning/critical status
- **Thresholds:** ok (<40%), warning (40-50%), critical (>50%)
- **Backend:** `checkMenuBudgetCompliance(menuId)` - deterministic, no AI

### 2. Price Alerts (`PriceAlertsWidget`)

- **Location:** Editor sidebar, after budget compliance
- **Trigger:** Auto-loads, filters global price alerts to only those affecting the current menu
- **What it shows:** Ingredients where the last price is 30%+ above the rolling average
- **Display:** Up to 5 alerts with ingredient name, old/new price, spike percentage
- **Backend:** `getIngredientPriceAlerts()` filtered client-side by `affectedMenus.includes(menuId)`

### 3. Guest Scaling (`GuestScalingWidget`)

- **Location:** Editor sidebar, after price alerts (hidden when menu is locked)
- **Trigger:** Interactive - chef enters a new guest count and clicks "Scale"
- **What it does:** Rescales all component scale factors using culinary-aware logic:
  - Salt/spice categories scale at 0.7x ratio
  - Leavening agents scale at 0.75x ratio
  - Batch split warnings above 3x scale
  - Small batch warnings below 0.5x scale
- **Feedback:** Shows how many components were adjusted, plus any culinary notes
- **Side effects:** Updates `menus.target_guest_count`, `components.scale_factor`, and (if linked) `events.guest_count`
- **Backend:** `scaleMenuToGuestCount(menuId, newGuestCount)` - deterministic, no AI

## Files Modified

- `components/menus/menu-doc-editor.tsx` - Added 3 widget components, updated ContextSidebar props, added `handleGuestScaled` callback
- `components/navigation/nav-config.tsx` - Added tasting menu nav entry (from earlier in this session)

## Design Decisions

- Widgets are self-contained: each manages its own loading/error state
- Budget and price alerts are passive (auto-load, read-only)
- Guest scaling is interactive but confirms visually before the chef acts
- All three use existing server actions with no new backend code
- Null/empty states render nothing (widgets hide when irrelevant)
