# Navigation Granularity Restructure

**Date:** 2026-03-19
**Branch:** feature/external-directory

## Problem

Six nav groups had too many items (8-14 each), making it hard to differentiate between related but distinct concepts. A chef looking for "Waste Tracking" shouldn't have to scan past "Demand Forecast" and "Staff Meals" in the same group.

## What Changed

Split 6 bloated groups into 14 focused groups. Every item stays at the same route; only the sidebar grouping changed.

### Sales (9 items) -> Pipeline (4) + Outreach (5)

| Group        | Items                                                               |
| ------------ | ------------------------------------------------------------------- |
| **Pipeline** | Inquiries, Quotes, Leads, Proposals                                 |
| **Outreach** | Rate Card, Prospecting, Calls & Meetings, Marketplace, Testimonials |

Pipeline = active deal flow. Outreach = finding and nurturing new business.

### Clients (8 items) -> Clients (4) + Client Intelligence (2) + Guests & Partners (2)

| Group                   | Items                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **Clients**             | Client Directory, Communication, Client History, Preferences & Dietary |
| **Client Intelligence** | Client Insights, Loyalty & Rewards                                     |
| **Guests & Partners**   | Guest Directory, Partners & Referrals                                  |

Clients = managing relationships. Intelligence = analytics and retention. Guests & Partners = different entity types entirely.

### Commerce (14 items) -> POS (5) + Commerce (3) + Commerce Ops (6)

| Group            | Items                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| **POS**          | Register, Virtual Terminal, Table Service, Order Queue, Products                      |
| **Commerce**     | Commerce Hub, Sales History, Promotions                                               |
| **Commerce Ops** | Reconciliation, Settlements, Reports, Payment Schedules, Observability, Clover Parity |

POS = transaction-time tools. Commerce = storefront. Commerce Ops = back-office reconciliation and reporting.

### Operations (8 items) -> Kitchen Ops (5) + Workforce & Assets (3)

| Group                  | Items                                                           |
| ---------------------- | --------------------------------------------------------------- |
| **Kitchen Ops**        | Daily Ops, Tasks, Station Clipboards, Priority Queue, Meal Prep |
| **Workforce & Assets** | Staff, Kitchen Rentals, Equipment                               |

Kitchen Ops = daily workflow. Workforce & Assets = people and physical resources.

### Inventory (13 items) -> Inventory (5) + Procurement (3) + Cost Control (5)

| Group            | Items                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Inventory**    | Hub, Storage Locations, Counts, Expiry Alerts, Staff Meals                               |
| **Procurement**  | Procurement Hub, Purchase Orders, Vendor Invoices                                        |
| **Cost Control** | Transaction Ledger, Waste Tracking, Food Cost Analysis, Physical Audits, Demand Forecast |

Inventory = what you have. Procurement = what you're buying. Cost Control = analysis and loss prevention.

### Finance (10 items) -> Money In (3) + Money Out (2) + Accounting (5)

| Group          | Items                                                   |
| -------------- | ------------------------------------------------------- |
| **Money In**   | Invoices, Payments, Payouts                             |
| **Money Out**  | Expenses, 1099 Contractors                              |
| **Accounting** | Financial Hub, Ledger, Reports, Tax Center, Forecasting |

Money In = revenue collection. Money Out = spending. Accounting = books and reporting.

### Culinary (7 items) -> Menu Engine (4) + Culinary Studio (3)

| Group               | Items                                             |
| ------------------- | ------------------------------------------------- |
| **Menu Engine**     | Menus, Recipes, Ingredients, Costing              |
| **Culinary Studio** | Prep Workspace, Culinary Board, Seasonal Palettes |

Menu Engine = the core value prop (parse, price, organize). Culinary Studio = creative planning tools.

### Menu Engine Discoverability Enhancements

- **Costing** added to `standaloneTop` as a 1-click shortcut (`coreFeature: true`, visible in Focus Mode)
- **Costing** added to `MOBILE_TAB_OPTIONS` so chefs can pin it to their mobile bottom bar
- Combined with existing Menus shortcut, the two headline features (menu management + auto-pricing) are both 1-click from anywhere

## Focus Mode

Updated `focus-mode-nav.ts`: the old `sales` group ID is now `pipeline`. Focus mode shows: Remy, Pipeline, Events, Clients, Admin (same behavior, new ID).

## Files Changed

- `components/navigation/nav-config.tsx` - Restructured `navGroups` array
- `lib/navigation/focus-mode-nav.ts` - Updated group IDs (`sales` -> `pipeline`)

## Group Count

Before: 17 groups (7 with 7-14 items)
After: 25 groups (max 6 items per group, most have 3-5)

## Module Assignments

All new sub-groups inherit the same module as their parent, so pro/free gating is unchanged:

- Pipeline, Outreach -> `pipeline`
- Clients, Client Intelligence, Guests & Partners -> `clients`
- Menu Engine, Culinary Studio -> `culinary`
- POS, Commerce, Commerce Ops -> `commerce`
- Kitchen Ops, Workforce & Assets -> `station-ops`
- Inventory, Procurement, Cost Control -> `operations`
- Money In, Money Out, Accounting -> `finance`
