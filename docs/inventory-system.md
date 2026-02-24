# ChefFlow Inventory Management System

**Date:** 2026-02-24
**Branch:** feature/risk-gap-closure
**Status:** Implemented (pending migration push)

## Overview

A **ledger-first, event-centric inventory engine** modeled after Restaurant365's transaction architecture, adapted for the private chef workflow. Adopts best practices from MarketMan, Galley Solutions, ChefTec, Rezku, and Restaurant365.

**Core principle:** Just as financial state derives from `ledger_entries`, inventory state derives from `inventory_transactions`. Current quantity is **computed** from the sum of all transactions, never directly stored.

## Architecture

```
Inventory Transaction Ledger (append-only)
│
├── Inflows (+)
│   ├── opening_balance — Initial stock entry
│   ├── receive — Goods received from vendor/PO
│   ├── return_from_event — Unused ingredients brought back
│   ├── return_to_vendor — Returned damaged/wrong goods
│   ├── transfer_in — Transfer from another location
│   ├── audit_adjustment — Positive correction from count
│   └── manual_adjustment — Chef override
│
├── Outflows (-)
│   ├── event_deduction — Auto-deducted when event starts
│   ├── waste — Food waste (links to waste_logs)
│   ├── staff_meal — Staff meal deduction
│   ├── transfer_out — Transfer to another location
│   └── audit_adjustment — Negative correction from count
│
├── Views (computed)
│   ├── inventory_current_stock — SUM(qty) per ingredient
│   ├── inventory_by_location — per-location breakdown
│   ├── upcoming_ingredient_demand — next 30 days' needs
│   ├── inventory_expiry_alerts — batches expiring soon
│   └── event_inventory_variance — expected vs actual usage
│
└── Integration Points
    ├── Event FSM — auto-deduct on in_progress, reverse on cancelled
    ├── Grocery Quote — "Create PO from Event" button
    ├── Vendor Invoices — receive transactions from matched items
    ├── Waste Logs — waste transactions from logged waste
    └── Financial Ledger — actual food cost from deductions
```

## Migrations

| File                                               | What                                                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260325000001_inventory_ledger_foundation.sql`   | `inventory_transactions` table (append-only ledger), `storage_locations` table, `inventory_current_stock` view, `inventory_by_location` view, `get_ingredient_stock()` function |
| `20260325000002_purchase_orders.sql`               | `purchase_orders` + `purchase_order_items` tables, full PO lifecycle                                                                                                            |
| `20260325000003_inventory_audits.sql`              | `inventory_audits` + `inventory_audit_items` tables, physical count workflow                                                                                                    |
| `20260325000004_inventory_batches_staff_meals.sql` | `inventory_batches` (FIFO), `staff_meals` + `staff_meal_items` tables                                                                                                           |
| `20260325000005_inventory_analytics_views.sql`     | `upcoming_ingredient_demand`, `inventory_expiry_alerts`, `event_inventory_variance` views                                                                                       |

All migrations are **additive** — no drops, no alters of existing columns.

## Server Actions

| File                                       | Functions                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/inventory/transaction-actions.ts`     | recordInventoryTransaction, recordBulkTransactions, getTransactionHistory, getCurrentStock, getStockByLocation, getStockSummary                        |
| `lib/inventory/location-actions.ts`        | createStorageLocation, updateStorageLocation, deleteStorageLocation, getStorageLocations, setDefaultLocation, transferInventory                        |
| `lib/inventory/purchase-order-actions.ts`  | createPurchaseOrder, createPOFromEvent, addPOItem, updatePOItem, removePOItem, submitPO, receivePOItems, getPurchaseOrders, getPurchaseOrder, cancelPO |
| `lib/inventory/event-deduction-actions.ts` | previewEventDeduction, executeEventDeduction, reverseEventDeduction, returnFromEvent                                                                   |
| `lib/inventory/audit-actions.ts`           | createAudit, updateAuditItem, finalizeAudit, getAudits, getAuditDetail, getAuditVarianceReport                                                         |
| `lib/inventory/batch-actions.ts`           | getExpiryAlerts, consumeFromBatch, markBatchExpired, getBatchesForIngredient                                                                           |
| `lib/inventory/staff-meal-actions.ts`      | logStaffMeal, getStaffMeals, getStaffMealCostSummary                                                                                                   |
| `lib/inventory/demand-forecast-actions.ts` | getDemandForecast, getReorderSuggestions, getShortageAlerts                                                                                            |
| `lib/inventory/variance-actions.ts`        | getEventVarianceReport, getVarianceTrend, getIngredientVarianceHistory                                                                                 |

## UI Pages

| Route                             | What                                             |
| --------------------------------- | ------------------------------------------------ |
| `/inventory`                      | Hub page with cards linking to all sub-pages     |
| `/inventory/transactions`         | Append-only transaction ledger with filters      |
| `/inventory/locations`            | Storage location management + per-location stock |
| `/inventory/purchase-orders`      | PO list, create, detail + receiving workflow     |
| `/inventory/purchase-orders/new`  | Create PO (manual or from event menu)            |
| `/inventory/purchase-orders/[id]` | PO detail, item editing, receiving checklist     |
| `/inventory/audits`               | Physical audit list                              |
| `/inventory/audits/new`           | Create new audit (select type + location)        |
| `/inventory/audits/[id]`          | Count sheet + finalize workflow                  |
| `/inventory/staff-meals`          | Staff meal log + cost tracking                   |
| `/inventory/expiry`               | Expiry alerts with urgency levels                |
| `/inventory/demand`               | Demand forecast + reorder suggestions            |

## Key Components

| Component              | Location                                            |
| ---------------------- | --------------------------------------------------- |
| TransactionLedgerTable | `components/inventory/transaction-ledger-table.tsx` |
| LocationStockView      | `components/inventory/location-stock-view.tsx`      |
| POListTable            | `components/inventory/po-list-table.tsx`            |
| CreatePOForm           | `components/inventory/create-po-form.tsx`           |
| ReceivingForm          | `components/inventory/receiving-form.tsx`           |
| EventInventoryPanel    | `components/events/event-inventory-panel.tsx`       |

## Event Integration

The inventory system hooks into the event FSM as non-blocking side effects:

- **confirmed → in_progress**: `executeEventDeduction(eventId)` auto-deducts ingredients based on menu recipes × guest count
- **any → cancelled** (from paid/confirmed/in_progress): `reverseEventDeduction(eventId)` reverses deductions
- **Event detail page**: `EventInventoryPanel` shows shortage alerts, deduction preview, variance reports, and return-from-event form

## Photo Documentation

Every table that represents a physical or financial event includes a `photo_url TEXT` column. The UI encourages photo capture at every step:

- Receiving deliveries — "Snap a photo of the delivery"
- Purchase orders — "Photo of the receipt"
- Waste logging — "Photo helps track waste patterns"
- Audit counts — "Photo of the shelf for records"
- Staff meals — "Photo of the team meal"
- Damage reporting — "Photo of damaged goods"

## Tier Assignment

| Feature                                | Tier |
| -------------------------------------- | ---- |
| Transaction ledger, manual adjustments | Free |
| Storage locations (single default)     | Free |
| Purchase orders + receiving            | Free |
| Event auto-deduction                   | Free |
| Demand forecast (basic)                | Free |
| Multiple storage locations             | Pro  |
| Physical audit workflow                | Pro  |
| Batch/FIFO tracking                    | Pro  |
| Staff meal tracking                    | Pro  |
| Expiry alerts                          | Pro  |
| Variance analytics                     | Pro  |

Pro features use `requirePro('operations')` and `<UpgradeGate featureSlug="operations">`.

## How It Closes the Loop

With this system, every function in ChefFlow can auto-fill from real data:

1. **Recipe costing** — actual ingredient prices from purchase orders
2. **Menu food cost %** — real costs from inventory deductions, not estimates
3. **Grocery lists** — menu ingredients minus what's already in stock
4. **Prep timelines** — knows what's prepped vs. what still needs doing
5. **Waste tracking** — delta between purchased and used/served
6. **Profit per event** — real COGS from deductions, not theoretical
7. **Reorder alerts** — par levels vs. current stock + upcoming demand
8. **Allergen flags** — verified against what's actually in the kitchen

This is the "nervous system" that connects ChefFlow's planning brain to kitchen reality.
