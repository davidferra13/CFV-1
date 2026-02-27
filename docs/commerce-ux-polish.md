# Commerce Engine — UX Polish Pass

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

---

## Overview

Audit of the Commerce Engine revealed 15 UX gaps where backend functionality existed but had no UI, or UI links pointed to missing pages. This pass closes the critical and high-severity gaps.

---

## Fixes Applied

### CRITICAL — System was broken without these

| #   | Gap                                        | Fix                                                                                                                                                   |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "New Product" button → 404                 | Created `app/(chef)/commerce/products/new/page.tsx`                                                                                                   |
| 2   | No product edit page                       | Created `app/(chef)/commerce/products/[id]/page.tsx`                                                                                                  |
| 3   | Tax always $0.00 — POS never sent zip code | POS register page now fetches chef's zip from `chefs.zip` and passes `defaultTaxZip` to `PosRegister` component, which passes it to `counterCheckout` |
| 4   | Inventory deduction disconnected           | Added `executeSaleDeduction()` + `deductProductStock()` calls to `counterCheckout` (non-blocking side effects)                                        |
| 5   | ExportMenu component orphaned              | Created `ReportsDatePicker` wrapper that mounts `ExportMenu` on the reports page                                                                      |

### HIGH — Chef could sell but couldn't manage

| #   | Gap                                    | Fix                                                                                                      |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 6   | No receipt download anywhere           | Added "Receipt" download button on POS success card + sale detail page via `SaleDetailActions` component |
| 7   | Sale detail page read-only             | Created `SaleDetailActions` component with Void Sale, Issue Refund, and Download Receipt buttons         |
| 8   | No refund UI                           | Refund form built into `SaleDetailActions` — select payment, enter amount + reason, process              |
| 9   | Reports hardcoded to 7 days            | Reports page now accepts `?from=&to=` searchParams + client-side date picker                             |
| 10  | Product active/inactive toggle missing | Added clickable status badge in product catalog that calls `toggleProductActive()`                       |

### MEDIUM — Polish

| #   | Gap                           | Fix                                                       |
| --- | ----------------------------- | --------------------------------------------------------- |
| 11  | POS uses `alert()` for errors | All 6 `alert()` calls replaced with `toast()` from sonner |

---

## Files Created

| File                                          | Purpose                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `components/commerce/product-form.tsx`        | Product create/edit form (name, price, cost, category, SKU, tax class, inventory) |
| `app/(chef)/commerce/products/new/page.tsx`   | New Product page                                                                  |
| `app/(chef)/commerce/products/[id]/page.tsx`  | Edit Product page                                                                 |
| `components/commerce/sale-detail-actions.tsx` | Void, Refund, Receipt actions for sale detail                                     |
| `components/commerce/reports-page-client.tsx` | Date range picker + ExportMenu wrapper                                            |

## Files Modified

| File                                      | Changes                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `components/commerce/product-catalog.tsx` | Added edit links (pencil icon), active toggle (clickable badge), sonner toast                                                      |
| `components/commerce/pos-register.tsx`    | Added `defaultTaxZip` prop, receipt download on success card, replaced all `alert()` with `toast()`, pass `taxZipCode` to checkout |
| `app/(chef)/commerce/register/page.tsx`   | Fetch chef's zip from DB, pass `defaultTaxZip` to POS                                                                              |
| `app/(chef)/commerce/sales/[id]/page.tsx` | Added `SaleDetailActions` component                                                                                                |
| `app/(chef)/commerce/reports/page.tsx`    | Added searchParams for date range, mounted `ReportsDatePicker`                                                                     |
| `lib/commerce/checkout-actions.ts`        | Added inventory deduction calls (non-blocking) after payment                                                                       |

---

## Remaining Gaps (deferred — not blocking)

| #   | Gap                        | Severity | Notes                                                  |
| --- | -------------------------- | -------- | ------------------------------------------------------ |
| 12  | Payment schedule UI        | Medium   | 5 backend functions, no UI — event-focused feature     |
| 13  | Modifier UI at POS         | Medium   | Schema wired, no selector popup when tapping product   |
| 14  | Stripe card processing     | Medium   | "Card" records locally, no Stripe Terminal integration |
| 15  | Product import from dishes | Low      | `snapshotProductFromRecipe()` exists, no UI button     |
| 16  | Order queue creation       | Low      | Queue board works but nothing creates entries from POS |
| 17  | Stock levels on POS grid   | Low      | `available_qty` stored, not rendered on product cards  |
