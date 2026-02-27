# Commerce Engine V1 — Wave 4: Reports, Export, Receipts, Event Bridge

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`
**Status:** Complete

---

## Overview

Wave 4 closes the Commerce Engine with reporting, data export, receipt generation, and event↔sale integration. This wave is read-heavy — no new migrations, just server actions and UI that query the tables from Waves 1–3.

---

## Server Actions

### `lib/commerce/report-actions.ts`

Four report generators, all Pro-gated (`requirePro('commerce')`):

| Function                        | Returns              | Description                                                                                                                 |
| ------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `getShiftReport(sessionId)`     | `ShiftReport`        | Full shift report for a register session — sales count, revenue, tips, payment method breakdown, top 10 products by revenue |
| `getDailySalesReport(from, to)` | `DailySalesReport[]` | Day-by-day sales totals (revenue, tax, tips, refunds, net, average order) for a date range                                  |
| `getProductReport(from, to)`    | `ProductReport[]`    | Per-product aggregation — quantity sold, revenue, cost, margin %, sorted by revenue descending                              |
| `getChannelReport(from, to)`    | `ChannelReport[]`    | Per-channel aggregation — sales count, revenue, average order, % of total                                                   |

### `lib/commerce/export-actions.ts`

CSV export with proper escaping (quotes, commas, newlines):

| Function                        | Columns                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `exportSalesCsv(from, to)`      | Sale Number, Date, Status, Channel, Subtotal, Tax, Discount, Tips, Total, Client ID, Event ID, Notes                             |
| `exportPaymentsCsv(from, to)`   | Date, Sale ID, Amount, Tips, Method, Status, Processor, Stripe PI, Idempotency Key                                               |
| `exportRefundsCsv(from, to)`    | Date, Sale ID, Payment ID, Amount, Reason, Status                                                                                |
| `exportTaxSummaryCsv(from, to)` | Date, Jurisdiction, State, County, City, Tax Class, Taxable Amount, Tax Collected, Tax Rate, State/County/City Tax, Transactions |

All use human-readable labels from `constants.ts` (e.g., "In-Person" not "in_person").

### `lib/commerce/receipt-actions.ts`

| Function                   | Returns               | Description                                                                       |
| -------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| `buildReceiptData(saleId)` | `CommerceReceiptData` | Assembles receipt from sale + items + payments + chef business info + client name |
| `generateReceipt(saleId)`  | `{ pdf, filename }`   | Base64-encoded PDF receipt, filename = `receipt-{saleNumber}.pdf`                 |

### `lib/commerce/event-bridge-actions.ts`

| Function                       | Returns        | Description                                                                                                                                                                                                                       |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSaleFromEvent(eventId)` | `{ saleId }`   | Creates a commerce sale linked to an event. Pulls menu items as line items (or quoted_price as single item). Links existing ledger payments with `processor_type='event_bridge'`. Auto-advances sale status based on paid amount. |
| `getEventSale(eventId)`        | `Sale \| null` | Returns the linked commerce sale for an event, if any                                                                                                                                                                             |

**Event bridge behavior:**

- If event has an active menu → each `dish_appearance` becomes a `sale_item` (name, quantity=1, price=cents)
- If no menu but `quoted_price` → single line item "Event Service"
- Existing `ledger_entries` with `category='payment'` get linked as commerce payments with `processor_type='event_bridge'` and idempotency key `event-bridge-{ledgerEntryId}`
- Sale status auto-set: fully paid → `captured`, partially paid → `authorized`, nothing paid → `pending_payment`

---

## PDF Template

### `lib/documents/generate-commerce-receipt.ts`

Thermal receipt format (226pt / ~80mm width) using PDFKit:

- **Header:** Business name in brand orange (#e88f47), address, phone/email
- **Sale info:** Receipt number, date, customer name
- **Items:** Name + line total, quantity × unit price detail for multi-quantity
- **Totals:** Subtotal, tax (with rate %), discount (negative), tip, divider, TOTAL (bold)
- **Payments:** Method + amount for each captured/settled payment
- **Footer:** Notes (if any), "Thank you!", "Powered by ChefFlow"

Named `generate-commerce-receipt.ts` (not `generate-receipt.ts`) because `lib/documents/generate-receipt.ts` already exists for event-based receipts with a different pattern.

---

## UI

### `app/(chef)/commerce/reports/page.tsx` — Reports Hub

Summary cards at top:

- Net Revenue (revenue − refunds)
- Total Sales count
- Average Order size
- Products Sold (total quantity)

Four sections:

1. **Daily Summary** — last 7 days table (date, sales, revenue, tax, tips, refunds, net)
2. **Top Products** — name, qty, revenue, margin with color-coded badges (green ≥60%, amber ≥30%, red <30%)
3. **Sales by Channel** — channel, count, revenue, avg order, % of total
4. **Recent Shifts** — session name, opened/closed times, sales count, revenue, tips, cash variance

Includes `ExportMenu` component for CSV downloads.

### `components/commerce/export-menu.tsx` — CSV Export Buttons

Client component with 4 ghost buttons (Sales, Payments, Refunds, Tax CSV). Each triggers the corresponding server action, creates a Blob, and triggers browser download via dynamic anchor element. Shows "Exporting..." state during transition.

### `components/commerce/event-sale-bridge.tsx` — Event↔Sale Panel

For embedding on event detail pages:

- If sale exists → shows sale status badge + total + "View Sale" link
- If no sale → "Create Commerce Sale" button
- Error handling with toast-style inline error message

---

## Navigation

Added **Reports** (PieChart icon) to the Commerce nav group after Settlements.

Final Commerce nav order:

1. Dashboard
2. POS Register
3. Products
4. Order Queue
5. Sales History
6. Reconciliation
7. Settlements
8. **Reports** ← new

---

## Files Created/Modified

| File                                         | Action                            |
| -------------------------------------------- | --------------------------------- |
| `lib/commerce/report-actions.ts`             | Created                           |
| `lib/commerce/export-actions.ts`             | Created                           |
| `lib/commerce/receipt-actions.ts`            | Created                           |
| `lib/commerce/event-bridge-actions.ts`       | Created                           |
| `lib/documents/generate-commerce-receipt.ts` | Created                           |
| `app/(chef)/commerce/reports/page.tsx`       | Created                           |
| `components/commerce/export-menu.tsx`        | Created                           |
| `components/commerce/event-sale-bridge.tsx`  | Created                           |
| `components/navigation/nav-config.tsx`       | Modified (added Reports nav item) |
| `docs/commerce-engine-wave-4.md`             | Created (this file)               |

---

## What's Complete

With Wave 4, the Commerce Engine V1 is **feature-complete**:

| Wave | Focus                                                            | Status   |
| ---- | ---------------------------------------------------------------- | -------- |
| 1    | Foundation — schema, core sales, ledger bridge                   | Complete |
| 2    | Checkout — register sessions, POS, order queue, inventory bridge | Complete |
| 3    | Tax, reconciliation, settlement, background jobs                 | Complete |
| 4    | Reports, export, receipts, event bridge                          | Complete |

### Full capability summary

- **Product catalog** with dish/recipe snapshots, modifiers, dietary tags, inventory tracking
- **POS register** with touch-friendly grid, cart, multiple payment methods
- **Order-ahead queue** (received → preparing → ready → picked_up)
- **Multi-channel sales** (counter, order-ahead, event, invoice, online)
- **Line-item tax** with class multipliers and zip-code-based rates
- **Automatic ledger bridge** — all commerce payments feed into the existing financial model
- **Daily reconciliation** with auto-flagging (cash variance, ledger mismatch, high refund ratio)
- **Settlement tracking** for Stripe payouts
- **Background jobs** via Inngest (day closeout, payment reconciliation, settlement mapping)
- **Shift reports, product reports, channel reports, daily summaries**
- **CSV export** for sales, payments, refunds, tax data
- **PDF receipts** in thermal format
- **Event↔sale bridge** — create commerce sales from events, link existing payments
- **Pro module gating** throughout
