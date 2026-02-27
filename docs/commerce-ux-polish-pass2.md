# Commerce Engine — UX Polish Pass 2

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

---

## Overview

Second UX polish pass closing 14 gaps found during the comprehensive audit. This pass connected backend functions that existed but had no UI, added missing detail pages, and wired all disconnected features.

---

## Fixes Applied

### HIGH — Backend existed, UI was missing

| #   | Gap                                        | Fix                                                                                                                                 |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tax always $0 — checkout never called tax  | `counterCheckout` now calls `applySaleTax()` after sale creation when `taxZipCode` is provided, updates payment amount              |
| 2   | Modifier selection at POS — no popup       | Added modal popup when tapping a product with modifiers — shows options with price deltas, "Add to Cart" button                     |
| 3   | Stock levels on POS grid — not rendered    | Product cards now show stock badge (count, "Out" if 0), out-of-stock products disabled, low-stock shown in amber                    |
| 4   | Product import from recipes — no UI        | Added "Create Product" button on recipe detail page — prompts for price, calls `snapshotProductFromRecipe()`                        |
| 5   | Order queue creation — POS never triggered | POS checkout now calls `createOrderQueueEntry()` after successful sale (non-blocking)                                               |
| 6   | Reconciliation detail — list-only          | Created `/commerce/reconciliation/[id]` page with full breakdown + `ReconciliationActions` client component (review, resolve flags) |
| 7   | Shift reports — no page                    | Created `/commerce/reports/shifts` page + `ShiftReport` component showing closed session summaries                                  |
| 8   | Payment schedule — 5 functions, no UI      | Created `/commerce/schedules` page + `PaymentScheduleClient` component with mark-paid and waive buttons                             |
| 9   | Settlement detail — no detail page         | Created `/commerce/settlements/[id]` page with payout breakdown, Stripe IDs, and linked payments                                    |

### MEDIUM — Incomplete features / Polish

| #   | Gap                               | Fix                                                                                                     |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 10  | Order queue uses `alert()`        | Replaced with `toast.error()` from sonner                                                               |
| 11  | No manual payment recording       | Added "Record Payment" button + form to `SaleDetailActions` — supports cash, check, card, bank transfer |
| 12  | Reconciliation list not clickable | Each report card now links to its detail page                                                           |
| 13  | Settlement list not clickable     | Each settlement card now links to its detail page                                                       |
| 14  | No shift report link from reports | Reports page "Recent Shifts" section now has "View All" link to `/commerce/reports/shifts`              |

### Previously Marked Complete (confirmed)

| #   | Gap                        | Status                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------ |
| -   | Cash drawer actions        | Already wired in `pos-register.tsx` (false positive in audit)                  |
| -   | Sale FSM enforcement in UI | Already enforced via `canVoid`/`canRefund` checks in `sale-detail-actions.tsx` |

---

## Files Created

| File                                                    | Purpose                                    |
| ------------------------------------------------------- | ------------------------------------------ |
| `app/(chef)/commerce/reconciliation/[id]/page.tsx`      | Reconciliation detail page                 |
| `components/commerce/reconciliation-actions-client.tsx` | Review + flag resolution client component  |
| `app/(chef)/commerce/settlements/[id]/page.tsx`         | Settlement detail page                     |
| `app/(chef)/commerce/reports/shifts/page.tsx`           | Shift reports page                         |
| `components/commerce/shift-report.tsx`                  | Shift report display component             |
| `app/(chef)/commerce/schedules/page.tsx`                | Payment schedules page                     |
| `components/commerce/payment-schedule-client.tsx`       | Payment schedule mark-paid/waive component |

## Files Modified

| File                                               | Changes                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/commerce/checkout-actions.ts`                 | Added step 7: `applySaleTax()` call with payment amount update; renumbered steps |
| `components/commerce/pos-register.tsx`             | Stock badges, modifier popup, order queue creation, product type extended        |
| `components/commerce/order-queue-board.tsx`        | `alert()` → `toast.error()`                                                      |
| `components/commerce/sale-detail-actions.tsx`      | Added "Record Payment" button + form with `recordPayment()` integration          |
| `app/(chef)/commerce/reconciliation/page.tsx`      | Made report cards clickable links to detail page                                 |
| `app/(chef)/commerce/settlements/page.tsx`         | Made settlement cards clickable links to detail page, added Link import          |
| `app/(chef)/commerce/reports/page.tsx`             | Added "View All" link for shift reports                                          |
| `components/navigation/nav-config.tsx`             | Added Payment Schedules nav item + Shift Reports sub-nav under Reports           |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Added "Create Product" button calling `snapshotProductFromRecipe()`              |

---

## Remaining Gaps (deferred — LOW severity)

| #   | Gap                         | Severity | Notes                                             |
| --- | --------------------------- | -------- | ------------------------------------------------- |
| 1   | Stripe Terminal integration | Low      | "Card" records locally, no Stripe Terminal reader |
| 2   | POS category filter subtle  | Low      | Category pills work, just could be more prominent |
