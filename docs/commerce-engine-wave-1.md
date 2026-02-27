# Commerce Engine V1 — Wave 1: Foundation

**Date:** 2026-02-27
**Branch:** feature/risk-gap-closure
**Status:** Complete

## What Changed

Wave 1 establishes the core data model, server actions, and ledger bridge for the Commerce Engine — ChefFlow's unified POS, invoice, event, and financial operating layer.

### New Database Objects

**Enums:**

- `sale_status` — 8-state FSM: draft → pending_payment → authorized → captured → settled → partially/fully_refunded → voided
- `sale_channel` — counter, order_ahead, invoice, online, phone
- `commerce_payment_status` — pending → authorized → captured → settled (+ failed/cancelled/disputed/refunded)
- `refund_status` — pending, processed, failed
- `tax_class` — standard, reduced, exempt, alcohol, cannabis, prepared_food, zero

**Tables:**
| Table | Purpose |
|-------|---------|
| `product_projections` | Sellable item snapshots. POS reads only this during checkout. |
| `sales` | Universal revenue container. Optional `event_id` bridges to events. |
| `sale_items` | Line items frozen at time of sale. |
| `commerce_payments` | Operational payment records with processor details. |
| `commerce_refunds` | Refund records against payments. |
| `commerce_payment_schedules` | Installment plans for events/large orders. |

**Triggers:**

- `generate_sale_number_trigger` — Auto-generates `SL-YYYY-NNNNN` sale numbers
- `commerce_payment_to_ledger` — Auto-creates `ledger_entries` rows from captured payments (only when client_id exists)
- `commerce_refund_to_ledger` — Auto-creates refund ledger entries
- `guard_sale_status` — Enforces allowed status transitions at DB level

**View:**

- `sale_financial_summary` — Per-sale totals derived from commerce_payments and commerce_refunds

### New Server Actions

| File                               | Functions                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `lib/commerce/constants.ts`        | Type definitions, labels, colors for all commerce enums                                                   |
| `lib/commerce/sale-fsm.ts`         | Pure FSM logic: canTransition, getNextStatuses, isTerminal, isPaid, canRefund, canVoid, computeSaleStatus |
| `lib/commerce/product-actions.ts`  | createProduct, updateProduct, toggleProductActive, listProducts, getProduct, snapshotProductFromRecipe    |
| `lib/commerce/sale-actions.ts`     | createSale, addSaleItem, removeSaleItem, updateSaleItemQuantity, voidSale, getSale, listSales             |
| `lib/commerce/payment-actions.ts`  | recordPayment (with idempotency), getPaymentsForSale, updatePaymentStatus                                 |
| `lib/commerce/refund-actions.ts`   | createRefund (with validation + idempotency), getRefundsForSale                                           |
| `lib/commerce/schedule-actions.ts` | createPaymentSchedule, markInstallmentPaid, waiveInstallment, getPaymentSchedule, getOverdueInstallments  |

### Billing System Updates

- Added `commerce` module to `lib/billing/modules.ts` (Pro tier, default OFF)
- Added `commerce` Pro feature to `lib/billing/pro-features.ts`

## Design Decisions

### Payment → Ledger Bridge

Every captured/settled `commerce_payments` INSERT auto-creates a `ledger_entries` row via DB trigger. This preserves the existing `event_financial_summary` view and all financial computations that read from `ledger_entries`. Anonymous POS sales (no client_id) skip the ledger entry since `ledger_entries.client_id` is NOT NULL.

### Sale vs Event

`sales.event_id` is optional. When set, the Sale wraps an event for commerce purposes. When NULL, it's a standalone POS/counter transaction. The existing event financial pipeline is completely unchanged.

### Naming Convention

Tables are prefixed `commerce_` where they could conflict with existing concepts (e.g., `commerce_payments` vs the implicit payment records in `ledger_entries`). The `sales` and `sale_items` tables are unambiguous and don't need prefixing.

## What's NOT in Wave 1

- No UI pages (coming in Wave 2)
- No RegisterSession / POS register (Wave 2)
- No order queue (Wave 2)
- No reconciliation or settlement tracking (Wave 3)
- No background jobs (Wave 3)
- No reporting or export (Wave 4)
- No thermal printing (deferred)

## Migration

```
supabase/migrations/20260328000001_commerce_engine_foundation.sql
```

## Files Changed

```
NEW  supabase/migrations/20260328000001_commerce_engine_foundation.sql
NEW  lib/commerce/constants.ts
NEW  lib/commerce/sale-fsm.ts
NEW  lib/commerce/product-actions.ts
NEW  lib/commerce/sale-actions.ts
NEW  lib/commerce/payment-actions.ts
NEW  lib/commerce/refund-actions.ts
NEW  lib/commerce/schedule-actions.ts
EDIT lib/billing/modules.ts (added commerce module)
EDIT lib/billing/pro-features.ts (added commerce feature + category)
NEW  docs/commerce-engine-wave-1.md
```

## Next: Wave 2

Register sessions, checkout flows (counter POS, order-ahead), inventory bridge, and the full Commerce UI.
