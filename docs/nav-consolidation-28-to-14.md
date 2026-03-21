# Navigation Consolidation: 28 Groups to 14

**Date:** 2026-03-20
**Branch:** feature/external-directory
**Files changed:** `components/navigation/nav-config.tsx`, `components/navigation/chef-nav.tsx`, `components/navigation/chef-mobile-nav.tsx`

## Summary

Restructured the Chef Portal sidebar navigation from 28 collapsible groups down to 14 by merging groups that share the same module. This reduces cognitive load, eliminates redundant section headers, and creates a cleaner first impression for new users.

## What Changed

### Groups Merged (14 groups removed)

| Old Groups                                        | New Group        | Module        |
| ------------------------------------------------- | ---------------- | ------------- |
| Pipeline + Outreach + Consulting                  | **Pipeline**     | `pipeline`    |
| Clients + Client Intelligence + Guests & Partners | **Clients**      | `clients`     |
| POS + Commerce + Commerce Ops                     | **Commerce**     | `commerce`    |
| Menu Engine + Culinary Studio                     | **Culinary**     | `culinary`    |
| Kitchen Ops + Workforce & Assets                  | **Operations**   | `station-ops` |
| Vendors + Inventory + Procurement + Cost Control  | **Supply Chain** | `operations`  |
| Money In + Money Out + Accounting                 | **Finance**      | `finance`     |

### Groups Unchanged

- Remy (admin-only AI)
- Events
- Marketing
- Analytics
- Protection
- Tools
- Admin (admin-only)

### Items Hidden from Standard Chef Users (adminOnly added)

- **Games** (standaloneBottom) - internal dev amusement
- **Observability** (standaloneTop + Commerce group) - dev monitoring tool
- **Clover Parity** (standaloneTop + Commerce group) - internal feature comparison tracker

### Items Unhidden for Chef Users (hidden: true removed)

- **Client Feedback** + Feedback Dashboard + Send Requests (Events group)
- **Payroll Summary** (Operations > Staff)
- **CSV Import**, **MasterCook Import**, **Import History** (Tools > Data Import)
- **Year-over-Year** report (Finance > Reports)
- **Insurance Claims** + New Claim + Claim Documents (Protection)
- **Post from Event**, **Social Templates**, **Content Calendar** (Marketing > Content Planner)
- **Nutritional Analysis** (Culinary > Menus)
- **Step Photos** (Culinary > Recipes)

### Rendering Components Updated

- `chef-nav.tsx`: Added `visibleBottomItems` memo to filter `standaloneBottom` by `adminOnly` flag. Applied to both rail mode and expanded mode.
- `chef-mobile-nav.tsx`: Same `visibleBottomItems` filtering applied.

## What Was NOT Changed

- **Shortcuts (standaloneTop)**: Left as-is per plan (only adminOnly flags added to 2 items)
- **Focus mode group IDs**: `remy`, `pipeline`, `events`, `clients`, `admin` all survive unchanged
- **Cannabis special section**: Unchanged (already admin-gated in render logic)
- **Community special section**: Unchanged (bottom section with /network routes)
- **Community nav group**: Removed (was entirely hidden, redundant with Community special section)
- **Mobile tab options**: Unchanged

## Module Assignment Note

The Supply Chain group merges items from two modules: `vendor-management` (Purveyors, Food Cost) and `operations` (Inventory, Procurement, Cost Control). The merged group uses `operations` as its module. If `vendor-management` was independently purchasable, those items now gate under `operations` instead.

## Pre-existing Issue Found

`tests/unit/focus-mode-strict-nav.test.ts` references group ID `'sales'`, but `lib/navigation/focus-mode-nav.ts` uses `'pipeline'`. This mismatch existed before this change and is unrelated.
